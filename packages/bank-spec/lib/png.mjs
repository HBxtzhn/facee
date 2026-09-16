// 极简 PNG 编码器 + 光栅绘图（用来生成题库里的示例图片资源）
// 无第三方依赖：手写 IHDR/IDAT/IEND + zlib deflate + CRC32。

import { deflateSync } from 'node:zlib';
import { crc32 } from './zip.mjs';

export class Raster {
  constructor(w, h, bg = [255, 255, 255]) {
    this.w = w;
    this.h = h;
    this.px = Buffer.alloc(w * h * 3);
    this.fillRect(0, 0, w, h, bg);
  }

  set(x, y, [r, g, b]) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 3;
    this.px[i] = r;
    this.px[i + 1] = g;
    this.px[i + 2] = b;
  }

  fillRect(x, y, w, h, color) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, color);
  }

  strokeRect(x, y, w, h, color, t = 2) {
    this.fillRect(x, y, w, t, color);
    this.fillRect(x, y + h - t, w, t, color);
    this.fillRect(x, y, t, h, color);
    this.fillRect(x + w - t, y, t, h, color);
  }

  hLine(x, y, w, color, t = 2) { this.fillRect(x, y, w, t, color); }
  vLine(x, y, h, color, t = 2) { this.fillRect(x, y, t, h, color); }
}

export function encodePng(raster) {
  const { w, h, px } = raster;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0; // filter: none
    px.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

/** 示例图 1：宽图，抽象「JVM 内存结构」分块图（不含文字，仅用于验证图片渲染/缩放） */
export function makeMemoryLayoutPng() {
  const r = new Raster(640, 360, [246, 248, 251]);
  const ink = [40, 52, 68];
  const boxes = [
    [24, 24, 180, 150, [214, 228, 255]],
    [24, 186, 180, 150, [214, 228, 255]],
    [222, 24, 180, 312, [255, 232, 214]],
    [420, 24, 196, 96, [222, 245, 230]],
    [420, 132, 196, 96, [222, 245, 230]],
    [420, 240, 196, 96, [236, 226, 250]],
  ];
  for (const [x, y, w, h, c] of boxes) {
    r.fillRect(x, y, w, h, c);
    r.strokeRect(x, y, w, h, ink, 2);
  }
  // “容量条”
  for (let i = 0; i < 4; i++) {
    r.fillRect(36 + i * 42, 60, 30, 10, [120, 150, 210]);
    r.fillRect(36 + i * 42, 222, 30, 10, [120, 150, 210]);
  }
  r.vLine(204, 24, 312, ink, 3);
  r.vLine(408, 24, 312, ink, 3);
  return encodePng(r);
}

/** 示例图 2：长图（320×1400），用于验证长图滚动与全屏查看 */
export function makeTallTimelinePng() {
  const r = new Raster(320, 1400, [255, 255, 255]);
  const ink = [40, 52, 68];
  r.vLine(48, 20, 1360, ink, 3);
  const palette = [
    [214, 228, 255], [222, 245, 230], [255, 232, 214], [236, 226, 250], [252, 226, 226],
  ];
  for (let i = 0; i < 14; i++) {
    const y = 30 + i * 96;
    r.fillRect(40, y, 18, 18, ink);
    r.fillRect(80, y - 6, 210, 62, palette[i % palette.length]);
    r.strokeRect(80, y - 6, 210, 62, ink, 2);
    for (let k = 0; k < 3; k++) r.hLine(94, y + 10 + k * 14, 120 + k * 25, [130, 145, 165], 6);
  }
  return encodePng(r);
}
