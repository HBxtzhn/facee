import * as FileSystem from 'expo-file-system/legacy';
import {
  newLocalBankId,
  parseLocalBankSource,
} from '../question-bank/local-banks';
import { QUESTION_BANK_ROOT_NAME } from '../question-bank/file-repository';
import type { LocalBankSource } from '../question-bank/types';

/**
 * 题库备份（v1）：只搬题库本体——本地源 JSON + 已装目录里的图片资产，
 * 打成一个 ZIP 走系统分享。导入是纯增量「开新库」：id 不冲突原样进，
 * 冲突则换新 id、标题加「（导入）」。收藏/掌握度/统计的备份留到
 * 合并策略一起做，LLM Key 永远不进备份（文件会被分享出去）。
 */

export const BACKUP_SCHEMA_VERSION = 1;

export interface BackupManifest {
  schemaVersion: number;
  exportedAt: string;
  banks: { bankId: string; title: string; questionCount: number }[];
}

interface BackupZipModule {
  zip(source: string, target: string): Promise<string>;
  unzip(source: string, target: string, charset?: string): Promise<string>;
}

function getZipArchive(): BackupZipModule {
  // 与 file-repository 同策略：只在原生路径 require，Web 不触达
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('react-native-zip-archive') as BackupZipModule;
}

export function buildBackupManifest(
  sources: LocalBankSource[],
  exportedAt = new Date().toISOString(),
): BackupManifest {
  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt,
    banks: sources.map((source) => ({
      bankId: source.bankId,
      title: source.package.catalog.title,
      questionCount: source.package.catalog.questions.length,
    })),
  };
}

export function parseBackupManifest(raw: string): BackupManifest {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error('备份文件已损坏或不是 FaceE 备份');
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('备份文件已损坏或不是 FaceE 备份');
  }
  const record = value as Record<string, unknown>;
  const schemaVersion = record.schemaVersion;
  if (typeof schemaVersion !== 'number' || schemaVersion > BACKUP_SCHEMA_VERSION) {
    throw new Error('备份来自更新版本的应用，请先升级 app 再导入');
  }
  if (!Array.isArray(record.banks)) {
    throw new Error('备份文件缺少题库清单');
  }
  return record as unknown as BackupManifest;
}

/** 备份导入规划（纯函数）：id 已存在则换新 id、标题加（导入） */
export interface BankImportPlan {
  originalBankId: string;
  reusedExisting: boolean;
  source: LocalBankSource;
}

export function planBankImports(
  sources: LocalBankSource[],
  existingCatalogIds: ReadonlySet<string>,
  newBankId: () => string = newLocalBankId,
): BankImportPlan[] {
  const taken = new Set(existingCatalogIds);
  return sources.map((source) => {
    if (!taken.has(source.bankId)) {
      taken.add(source.bankId);
      return { originalBankId: source.bankId, reusedExisting: false, source };
    }
    const bankId = newBankId();
    taken.add(bankId);
    const title = `${source.package.catalog.title}（导入）`;
    return {
      originalBankId: source.bankId,
      reusedExisting: true,
      source: {
        ...source,
        bankId,
        package: { ...source.package, catalog: { ...source.package.catalog, id: bankId, title } },
      },
    };
  });
}

export async function createBackupZip(options: {
  sources: LocalBankSource[];
  stageLocalBankAssets: (root: string) => Promise<number>;
  now?: Date;
  zipArchive?: BackupZipModule;
  cacheDirectory?: string;
  fileSystem?: typeof FileSystem;
}): Promise<{ zipPath: string; manifest: BackupManifest }> {
  const { sources, stageLocalBankAssets } = options;
  if (sources.length === 0) throw new Error('还没有可备份的本地题库');
  const fs = options.fileSystem ?? FileSystem;
  const cacheDirectory = options.cacheDirectory ?? fs.cacheDirectory;
  if (!cacheDirectory) throw new Error('缓存目录不可用');
  const archive = options.zipArchive ?? getZipArchive();
  const stamp = (options.now ?? new Date()).toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const stagingRoot = `${cacheDirectory}${QUESTION_BANK_ROOT_NAME}backup/${stamp}/`;
  const sourcesRoot = `${stagingRoot}sources/`;
  const manifest = buildBackupManifest(sources, options.now?.toISOString());
  try {
    await fs.makeDirectoryAsync(sourcesRoot, { intermediates: true });
    await fs.writeAsStringAsync(`${stagingRoot}manifest.json`, JSON.stringify(manifest), {
      encoding: 'utf8',
    });
    for (const source of sources) {
      await fs.writeAsStringAsync(`${sourcesRoot}${source.bankId}.json`, JSON.stringify(source), {
        encoding: 'utf8',
      });
    }
    await stageLocalBankAssets(`${stagingRoot}assets/`);
    const zipPath = `${cacheDirectory}facee-backup-${stamp}.zip`;
    await archive.zip(stagingRoot, zipPath);
    return { zipPath, manifest };
  } finally {
    await fs.deleteAsync(stagingRoot, { idempotent: true });
  }
}
export interface BackupImportSummary {
  bankId: string;
  title: string;
  questionCount: number;
  reusedExisting: boolean;
}

export async function restoreBackupZip(options: {
  zipPath: string;
  existingCatalogIds: ReadonlySet<string>;
  installBank: (source: LocalBankSource) => Promise<void>;
  restoreBankAssets: (assetsRoot: string, catalogId: string) => Promise<void>;
  zipArchive?: BackupZipModule;
  cacheDirectory?: string;
  fileSystem?: typeof FileSystem;
}): Promise<{ imported: BackupImportSummary[] }> {
  const fs = options.fileSystem ?? FileSystem;
  const cacheDirectory = options.cacheDirectory ?? fs.cacheDirectory;
  if (!cacheDirectory) throw new Error('缓存目录不可用');
  const archive = options.zipArchive ?? getZipArchive();
  const extractRoot = `${cacheDirectory}${QUESTION_BANK_ROOT_NAME}import/${Date.now().toString(36)}/`;
  try {
    await archive.unzip(options.zipPath, extractRoot, 'UTF-8');
    const backupRoot = await locateBackupRoot(extractRoot, fs);
    const manifest = parseBackupManifest(
      await fs.readAsStringAsync(`${backupRoot}manifest.json`, { encoding: 'utf8' }),
    );
    const sources: LocalBankSource[] = [];
    for (const bank of manifest.banks) {
      try {
        const raw = await fs.readAsStringAsync(
          `${backupRoot}sources/${bank.bankId}.json`,
          { encoding: 'utf8' },
        );
        const source = parseLocalBankSource(raw);
        if (source) sources.push(source);
      } catch {
        // 清单与源文件不一致：跳过缺失的库
      }
    }
    if (sources.length === 0) throw new Error('备份里没有可导入的题库');

    const plans = planBankImports(sources, options.existingCatalogIds);
    const imported: BackupImportSummary[] = [];
    for (const plan of plans) {
      await options.installBank(plan.source);
      await options.restoreBankAssets(`${backupRoot}assets/`, plan.originalBankId);
      imported.push({
        bankId: plan.source.bankId,
        title: plan.source.package.catalog.title,
        questionCount: plan.source.package.catalog.questions.length,
        reusedExisting: plan.reusedExisting,
      });
    }
    return { imported };
  } finally {
    await fs.deleteAsync(extractRoot, { idempotent: true });
  }
}

/** ZIP 可能带一层目录（打包方式差异），定位 manifest 所在层 */
async function locateBackupRoot(
  extractRoot: string,
  fs: typeof FileSystem,
): Promise<string> {
  const direct = await fs.getInfoAsync(`${extractRoot}manifest.json`);
  if (direct.exists) return extractRoot;
  const children = await fs.readDirectoryAsync(extractRoot);
  for (const child of children) {
    const nested = await fs.getInfoAsync(`${extractRoot}${child}/manifest.json`);
    if (nested.exists) return `${extractRoot}${child}/`;
  }
  throw new Error('备份文件缺少 manifest.json，可能不是 FaceE 备份');
}
