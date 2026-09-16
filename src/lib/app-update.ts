/**
 * 应用内更新（检查 → 下载 → 拉起系统安装器）。
 *
 * 能力边界（Android 的硬限制，不要对"自动"有错误预期）：
 *   - 不能静默安装：普通应用无法后台装 APK，必须用户点一次系统确认框
 *   - Play 官方 In-App Updates API 需要上架 Google Play，侧载分发用不了
 *   所以这里的"自动"= 应用内检查 + 应用内下载 + 一键拉起安装器。
 *
 * 另外两条工程约束（踩过才知道疼）：
 *   1. versionCode 必须每次发版递增，否则 Android 会拒绝覆盖安装（versionName 不参与判定）
 *   2. APK 签名必须一致：换 keystore 后旧用户无法覆盖更新，只能卸载重装（会丢本地收藏与进度）
 *
 * 本文件只放纯逻辑，便于单测；网络与原生调用在 UI 层。
 */

export interface ReleaseAsset {
  name: string;
  downloadUrl: string;
  sizeBytes: number;
}

export interface AppRelease {
  /** 去掉前缀 v 的版本名，例如 1.1.0 */
  version: string;
  /** 发布说明（Markdown） */
  notes: string;
  publishedAt: string | null;
  /** 匹配到的 APK 资产 */
  apk: ReleaseAsset | null;
}

/** GitHub Releases API 返回结构的子集 */
interface GitHubReleaseLike {
  tag_name?: unknown;
  name?: unknown;
  body?: unknown;
  published_at?: unknown;
  assets?: unknown;
}

/** 把 "v1.1.0" / "1.1.0" 解析成可比较的数字数组；非法时返回 null */
export function parseVersion(input: string): number[] | null {
  const cleaned = String(input ?? '').trim().replace(/^v/i, '');
  if (!/^\d+(\.\d+)*$/.test(cleaned)) return null;
  return cleaned.split('.').map((part) => Number(part));
}

/** a > b 返回 1，a < b 返回 0，相等返回 0（按段比较，缺位补 0） */
export function compareVersions(a: string, b: string): number {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (!left || !right) return 0;
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i += 1) {
    const x = left[i] ?? 0;
    const y = right[i] ?? 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

export function isUpdateAvailable(current: string, latest: string): boolean {
  return compareVersions(latest, current) > 0;
}

/** 从 release 的 assets 里挑出适配本机的 APK（本项目只发 arm64） */
export function pickApkAsset(assets: unknown): ReleaseAsset | null {
  if (!Array.isArray(assets)) return null;
  const candidates = assets
    .filter((asset): asset is Record<string, unknown> => Boolean(asset) && typeof asset === 'object')
    .filter((asset) => typeof asset.name === 'string' && (asset.name as string).endsWith('.apk'))
    .map((asset) => ({
      name: asset.name as string,
      downloadUrl: String(asset.browser_download_url ?? asset.download_url ?? ''),
      sizeBytes: typeof asset.size === 'number' ? asset.size : 0,
    }))
    .filter((asset) => asset.downloadUrl.length > 0);

  if (candidates.length === 0) return null;
  // 优先 arm64 命名的包，其次是唯一那个
  const preferred = candidates.find((asset) => /arm64|aarch64/i.test(asset.name));
  return preferred ?? candidates[0];
}

/** 解析 GitHub Releases API 的响应（/releases/latest） */
export function parseRelease(payload: unknown): AppRelease | null {
  if (!payload || typeof payload !== 'object') return null;
  const release = payload as GitHubReleaseLike;
  const tag = typeof release.tag_name === 'string' ? release.tag_name : null;
  if (!tag) return null;
  const version = tag.replace(/^v/i, '');
  if (!parseVersion(version)) return null;

  return {
    version,
    notes: typeof release.body === 'string' ? release.body : '',
    publishedAt: typeof release.published_at === 'string' ? release.published_at : null,
    apk: pickApkAsset(release.assets),
  };
}

/** 人类可读的体积 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '未知大小';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export const UPDATE_RELEASES_API = 'https://api.github.com/repos/HBxtzhn/facee/releases/latest';
export const UPDATE_RELEASES_PAGE = 'https://github.com/HBxtzhn/facee/releases/latest';
