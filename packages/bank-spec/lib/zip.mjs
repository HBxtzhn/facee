// ZIP 写入（确定性）+ 中央目录解析（安全导向）
//
// 写入：不依赖任何第三方库，固定 mtime、固定条目顺序、不写 extra field ⇒ 同输入必然同字节。
// 解析：只读元数据、不解压 ⇒ 供「G1 结构预检」使用；解压由 App 自己按白名单驱动。
//
// 与 docs/FaceE-实现方案.md §7（四道闸）对应：本文件的 readCentralDirectory 就是 G1 的实现。

import { deflateRawSync, inflateRawSync } from 'node:zlib';

const SIG_LOCAL = 0x04034b50;
const SIG_CD = 0x02014b50;
const SIG_EOCD = 0x06054b50;
const SIG_EOCD64 = 0x06064b50;
const SIG_EOCD64_LOC = 0x07064b50;
const SIG_CD64_EXTRA = 0x0001;

// 固定为 1980-01-01 00:00:00，保证输出可复现
const FIXED_DOS_TIME = 0x0000;
const FIXED_DOS_DATE = 0x0021;

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

export function crc32(buf) {
  let c = 0 ^ -1;
  for (let i = 0; i < buf.length; i++) c = (c >>> 8) ^ CRC_TABLE[(c ^ buf[i]) & 0xff];
  return (c ^ -1) >>> 0;
}

/**
 * 写出确定性 ZIP。
 * @param {{name: string, data: Buffer|string}[]} entries 顺序即写入顺序
 * @param {{store?: boolean}} [opts]
 * @returns {Buffer}
 */
export function writeZip(entries, opts = {}) {
  const seen = new Set();
  const locals = [];
  const centrals = [];
  let offset = 0;

  for (const e of entries) {
    const name = e.name;
    if (seen.has(name.toLowerCase())) throw new Error(`writeZip: duplicate entry ${name}`);
    seen.add(name.toLowerCase());
    const nameBuf = Buffer.from(name, 'utf8');
    const raw = Buffer.isBuffer(e.data) ? e.data : Buffer.from(String(e.data), 'utf8');
    const crc = crc32(raw);

    let method = 0;
    let body = raw;
    if (!opts.store) {
      const deflated = deflateRawSync(raw, { level: 9 });
      if (deflated.length < raw.length) {
        method = 8;
        body = deflated;
      }
    }

    const flags = 0x0800; // UTF-8 (EFS)
    const local = Buffer.alloc(30);
    local.writeUInt32LE(SIG_LOCAL, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(flags, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(FIXED_DOS_TIME, 10);
    local.writeUInt16LE(FIXED_DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28); // extra len
    locals.push(local, nameBuf, body);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(SIG_CD, 0);
    cd.writeUInt16LE(0x031e, 4); // version made by: unix + 3.0
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(flags, 8);
    cd.writeUInt16LE(method, 10);
    cd.writeUInt16LE(FIXED_DOS_TIME, 12);
    cd.writeUInt16LE(FIXED_DOS_DATE, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(body.length, 20);
    cd.writeUInt32LE(raw.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt16LE(0, 30); // extra
    cd.writeUInt16LE(0, 32); // comment
    cd.writeUInt16LE(0, 34); // disk start
    cd.writeUInt16LE(0, 36); // internal attrs
    cd.writeUInt32LE(0o100644 * 0x10000, 38); // external attrs: regular file 0644
    cd.writeUInt32LE(offset, 42);
    centrals.push(cd, nameBuf);

    offset += local.length + nameBuf.length + body.length;
  }

  if (entries.length > 0xffff) throw new Error('writeZip: >65535 entries (ZIP64 writing not implemented)');
  const cdBuf = Buffer.concat(centrals);
  if (offset > 0xffffffff) throw new Error('writeZip: archive >4GB (ZIP64 writing not implemented)');

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(SIG_EOCD, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cdBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...locals, cdBuf, eocd]);
}

const S_IFMT = 0xf000;
const S_IFLNK = 0xa000;
const S_IFDIR = 0x4000;

/**
 * 解析中央目录。不解压任何数据。
 * @param {Buffer} buf
 * @returns {{ok: boolean, reason?: string, zip64: boolean, entries: object[], total: number, cdOffset: number, cdSize: number}}
 */
export function readCentralDirectory(buf) {
  const empty = { ok: false, zip64: false, entries: [], total: 0, cdOffset: 0, cdSize: 0 };

  // 1) 从尾部向前找 EOCD（最多回退 66KB：22 字节固定 + 65535 注释）
  const minStart = Math.max(0, buf.length - 22 - 0xffff);
  let eocdAt = -1;
  for (let i = buf.length - 22; i >= minStart; i--) {
    if (buf.readUInt32LE(i) === SIG_EOCD) { eocdAt = i; break; }
  }
  if (eocdAt < 0) return { ...empty, reason: 'EOCD not found' };

  let total = buf.readUInt16LE(eocdAt + 10);
  let cdSize = buf.readUInt32LE(eocdAt + 12);
  let cdOffset = buf.readUInt32LE(eocdAt + 16);
  let zip64 = false;

  // 2) ZIP64：locator 紧邻 EOCD 之前
  const locAt = eocdAt - 20;
  if (locAt >= 0 && buf.readUInt32LE(locAt) === SIG_EOCD64_LOC) {
    const eocd64At = Number(buf.readBigUInt64LE(locAt + 8));
    if (eocd64At + 56 > buf.length || buf.readUInt32LE(eocd64At) !== SIG_EOCD64) {
      return { ...empty, reason: 'ZIP64 EOCD locator present but EOCD64 not found' };
    }
    zip64 = true;
    total = Number(buf.readBigUInt64LE(eocd64At + 32));
    cdSize = Number(buf.readBigUInt64LE(eocd64At + 40));
    cdOffset = Number(buf.readBigUInt64LE(eocd64At + 48));
  }

  if (cdOffset + cdSize > buf.length) return { ...empty, reason: 'central directory out of range' };

  // 3) 逐条解析
  const entries = [];
  let p = cdOffset;
  for (let i = 0; i < total; i++) {
    if (p + 46 > buf.length) return { ...empty, reason: `truncated central directory at entry ${i}` };
    if (buf.readUInt32LE(p) !== SIG_CD) return { ...empty, reason: `bad CD signature at entry ${i}` };
    const flags = buf.readUInt16LE(p + 8);
    const method = buf.readUInt16LE(p + 10);
    const crc = buf.readUInt32LE(p + 16);
    let compressedSize = buf.readUInt32LE(p + 20);
    let uncompressedSize = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const externalAttrs = buf.readUInt32LE(p + 38);
    const localHeaderOffset = buf.readUInt32LE(p + 42);
    const nameBytes = buf.subarray(p + 46, p + 46 + nameLen);
    const extra = buf.subarray(p + 46 + nameLen, p + 46 + nameLen + extraLen);
    const name = decodeName(nameBytes, flags);

    // ZIP64 extended info
    if (uncompressedSize === 0xffffffff || compressedSize === 0xffffffff) {
      let e = 0;
      while (e + 4 <= extra.length) {
        const tag = extra.readUInt16LE(e);
        const len = extra.readUInt16LE(e + 2);
        if (tag === SIG_CD64_EXTRA) {
          let q = e + 4;
          const has = (v) => v === 0xffffffff;
          if (has(uncompressedSize)) { uncompressedSize = Number(extra.readBigUInt64LE(q)); q += 8; }
          if (has(compressedSize)) { compressedSize = Number(extra.readBigUInt64LE(q)); q += 8; }
          break;
        }
        e += 4 + len;
      }
    }

    const unixMode = (externalAttrs >>> 16) & 0xffff;
    entries.push({
      name,
      flags,
      method,
      crc,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
      externalAttrs,
      unixMode,
      isEncrypted: (flags & 1) !== 0,
      isDataDescriptor: (flags & 8) !== 0,
      isUtf8: (flags & 0x800) !== 0,
      isDir: name.endsWith('/') || (unixMode & S_IFMT) === S_IFDIR,
      isSymlink: (unixMode & S_IFMT) === S_IFLNK,
    });
    p += 46 + nameLen + extraLen + commentLen;
  }

  return { ok: true, zip64, entries, total, cdOffset, cdSize };
}

function decodeName(bytes, flags) {
  if (flags & 0x800) return bytes.toString('utf8');
  // 未声明 UTF-8：先按 UTF-8 解，出现替换字符则回退 GBK（这里只做标记，实际解码交给调用方）
  const utf8 = bytes.toString('utf8');
  if (!utf8.includes('\uFFFD')) return utf8;
  try {
    return new TextDecoder('gbk').decode(bytes);
  } catch {
    return utf8;
  }
}

/**
 * 解压单个条目（校验/测试用；App 侧由 fflate 承担）。
 */
export function inflateEntry(buf, entry) {
  if (entry.isEncrypted) throw new Error('encrypted entry');
  const p = entry.localHeaderOffset;
  if (buf.readUInt32LE(p) !== SIG_LOCAL) throw new Error('bad local header signature');
  const nameLen = buf.readUInt16LE(p + 26);
  const extraLen = buf.readUInt16LE(p + 28);
  const start = p + 30 + nameLen + extraLen;
  const body = buf.subarray(start, start + entry.compressedSize);
  const out = entry.method === 0 ? Buffer.from(body) : inflateRawSync(body);
  if (out.length !== entry.uncompressedSize) throw new Error('size mismatch after inflate');
  if (crc32(out) !== entry.crc) throw new Error('crc mismatch');
  return out;
}
