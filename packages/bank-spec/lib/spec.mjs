// 规范常量：与 docs/题库规范-v1.md 一一对应。
// 这份文件是规范的「可执行形式」——验证器与生成器都从这里取值，避免文档与实现漂移。

export const SCHEMA_VERSION = 1;

export const ID_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/;
export const BANK_ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
export const DIFFICULTIES = ['easy', 'medium', 'hard'];

export const LIMITS = {
  maxEntries: 50_000,
  maxEntryBytes: 64 * 1024 * 1024,
  maxTotalBytes: 2 * 1024 * 1024 * 1024,
  maxPathLen: 512,
  maxTitleLen: 200,
  maxBankNameLen: 60,
  maxCategoryNameLen: 30,
  maxTagNameLen: 30,
};

// 允许的压缩方式：Store / Deflate
export const ALLOWED_COMPRESSION = new Set([0, 8]);

// ZIP 通用位标志
export const FLAG = {
  ENCRYPTED: 1 << 0,
  DATA_DESCRIPTOR: 1 << 3,
  UTF8: 1 << 11,
};

// 忽略的顶层目录/文件（不参与校验，也不进入解压白名单）
export const IGNORED_TOP = ['.git', '.github', '.vscode', '.idea', 'node_modules', '.DS_Store'];

// 题目目录内允许的文件
export const QUESTION_FILES = ['question.md', 'answer.md', 'followups.md'];

export function isIgnoredPath(p) {
  const segs = p.split('/').filter(Boolean);
  return segs.some((s) => IGNORED_TOP.includes(s)) || segs.some((s) => s.startsWith('._'));
}
