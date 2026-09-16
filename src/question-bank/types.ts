/**
 * Domain types for an installed FaceE question bank.
 *
 * A catalog only contains searchable metadata. Markdown is kept separately in
 * the content adapter so a catalog can be read and filtered without loading
 * every answer into memory.
 */

export type QuestionId = string;
export type TagId = string;

export type Difficulty = 1 | 2 | 3;

export interface QuestionTag {
  id: TagId;
  name: string;
  parentId: TagId | null;
  sort: number;
}

export interface QuestionTagRef {
  id: TagId;
  name: string;
}

/** 题库分类（可选题库数据）。分类内容由题库决定，不在 App 中写死。 */
export interface QuestionCategory {
  id: string;
  name: string;
  sort: number;
  description?: string;
}

/** Searchable metadata for one question. */
export interface Question {
  id: QuestionId;
  title: string;
  difficulty: Difficulty;
  hasAnswer: boolean;
  sort: number;
  tags: QuestionTagRef[];
  /** 所属分类；题库未提供分类时为 null */
  categoryId?: string | null;
  /** 面试官追问条数；用于「有追问」标记，正文按需读取 */
  followupCount?: number;
}

/** Markdown content stored separately from the catalog. */
export interface QuestionContent {
  id: QuestionId;
  questionMd: string;
  answerMd: string | null;
  /** 面试官追问（`followups.md`）原文；不存在时为 null */
  followupsMd?: string | null;
  /** Base `file://` URI for this question's extracted assets, when available. */
  assetBaseUri?: string;
}

export interface QuestionBankCatalog {
  schemaVersion: 1;
  id: string;
  title: string;
  /** 题库版本（题库规范 v1 的 bank.version）；旧格式可能没有 */
  version?: string;
  /** 最近更新时间（题库规范 v1 的 bank.updatedAt） */
  updatedAt?: string;
  /** 分类列表；题库未提供时为 undefined */
  categories?: QuestionCategory[];
  tags: QuestionTag[];
  questions: Question[];
}

export interface QuestionBankPackage {
  catalog: QuestionBankCatalog;
  contents: QuestionContent[];
}

export interface QuestionFilter {
  tagId?: TagId;
  difficulty?: Difficulty;
  query?: string;
  /** 分类筛选（§5.1）；题库未提供分类时该字段无意义。 */
  categoryId?: string;
}

export interface InstallationProgress {
  completed: number;
  total: number;
  label: string;
}

export type InstallationProgressListener = (progress: InstallationProgress) => void;

export interface InstallResult {
  questionCount: number;
  tagCount: number;
}

export interface QuestionBankRepository {
  /** Return the installed catalog, or null when this device has no bank. */
  getCatalog(): Promise<QuestionBankCatalog | null>;
  /** Return metadata for one installed question. */
  getQuestion(id: QuestionId): Promise<Question | null>;
  /** Return Markdown for one installed question. */
  getContent(id: QuestionId): Promise<QuestionContent | null>;
  /** Filter local metadata. This method never performs network I/O. */
  listQuestions(filter?: QuestionFilter): Promise<Question[]>;
  /**
   * 正文全文搜索（§6.2）：在安装期生成的语料里检索，返回命中题目与命中次数。
   * 不走网络；题库没有语料（旧安装或无正文）时返回空数组。
   */
  searchBody(query: string): Promise<{ id: QuestionId; hits: number; snippet: string | null }[]>;
  /** Install a complete package with an atomic active-pointer switch. */
  install(
    questionBank: QuestionBankPackage,
    onProgress?: InstallationProgressListener,
  ): Promise<InstallResult>;
  /** Remove the installed bank. Favorites and user progress are unaffected. */
  clear(): Promise<void>;
}

export interface RemoteQuestionBankRepository extends QuestionBankRepository {
  installFromUrl(
    url: string,
    onProgress?: InstallationProgressListener,
  ): Promise<InstallResult>;
}
