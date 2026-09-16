import { Platform } from 'react-native';
import { FileSystemQuestionBankRepository } from './file-repository';
import type {
  Question,
  QuestionBankCatalog,
  QuestionBankPackage,
  QuestionBankRepository,
  QuestionContent,
  QuestionFilter,
  QuestionId,
  RemoteQuestionBankRepository,
} from './types';

/** Web is a visual preview only and deliberately has no installable bank. */
class WebPreviewQuestionBankRepository implements QuestionBankRepository {
  async getCatalog(): Promise<QuestionBankCatalog | null> { return null; }
  async getQuestion(_id: QuestionId): Promise<Question | null> { return null; }
  async getContent(_id: QuestionId): Promise<QuestionContent | null> { return null; }
  async listQuestions(_filter?: QuestionFilter): Promise<Question[]> { return []; }
  async searchBody(_query: string): Promise<{ id: QuestionId; hits: number; snippet: string | null }[]> { return []; }
  async install(_questionBank: QuestionBankPackage): Promise<never> {
    throw new Error('Web 仅用于界面预览，请在移动端安装题库');
  }
  async clear(): Promise<void> {}
}

/**
 * Select the durable adapter used by the app. Native builds keep Markdown and
 * extracted assets on disk; web remains an intentionally empty UI preview.
 */
export function createQuestionBankRepository(): QuestionBankRepository {
  return Platform.OS === 'web'
    ? new WebPreviewQuestionBankRepository()
    : new FileSystemQuestionBankRepository();
}

export const questionBankRepository = createQuestionBankRepository();

export function asRemoteQuestionBankRepository(
  repository: QuestionBankRepository,
): RemoteQuestionBankRepository | null {
  if (typeof (repository as Partial<RemoteQuestionBankRepository>).installFromUrl !== 'function') {
    return null;
  }
  return repository as RemoteQuestionBankRepository;
}
