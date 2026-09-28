import { describe, it, expect } from '@jest/globals';
import { PreviewQuestionBankRepository } from './preview-repository';
import { parseFollowups } from './followups';
import type { QuestionBankPackage } from './types';

describe('PreviewQuestionBankRepository（Web 预览内置示例题库）', () => {
  it('内置题库与种子规模一致：29 题 / 9 分类 / 18 标签', async () => {
    const repository = new PreviewQuestionBankRepository();
    const catalog = await repository.getCatalog();

    expect(catalog).not.toBeNull();
    expect(catalog!.id).toBe('facee-sample-bank');
    expect(catalog!.title).toBe('FaceE 示例题库');
    expect(catalog!.questions).toHaveLength(29);
    expect(catalog!.categories).toHaveLength(9);
    expect(catalog!.tags).toHaveLength(18);
  });

  it('getContent 返回与生成器一致的 Markdown（含 H1 标题与答案）', async () => {
    const repository = new PreviewQuestionBankRepository();
    const content = await repository.getContent('java-basic-01');

    expect(content).not.toBeNull();
    expect(content!.questionMd).toMatch(/^# == 和 equals 的区别是什么？\n\n请说明 Java 中/);
    expect(content!.answerMd).toContain('为什么必须同时重写 hashCode');
  });

  it('无答案题保留（java-basic-04：hasAnswer=false，answerMd=null）', async () => {
    const repository = new PreviewQuestionBankRepository();
    const question = await repository.getQuestion('java-basic-04');
    const content = await repository.getContent('java-basic-04');

    expect(question?.hasAnswer).toBe(false);
    expect(content?.answerMd).toBeNull();
  });

  it('追问内容可被 parseFollowups 解析（jvm-gc-02 有 3 条追问）', async () => {
    const repository = new PreviewQuestionBankRepository();
    const content = await repository.getContent('jvm-gc-02');

    expect(content?.followupsMd).toBeTruthy();
    const followups = parseFollowups(content!.followupsMd!);
    expect(followups).toHaveLength(3);
    expect(followups[0].question).toBe('如果把 MaxGCPauseMillis 调到 20ms 会怎样？');
  });

  it('listQuestions 支持分类与标题关键词过滤', async () => {
    const repository = new PreviewQuestionBankRepository();

    const jvmQuestions = await repository.listQuestions({ categoryId: 'jvm' });
    expect(jvmQuestions.map((question) => question.id)).toEqual([
      'jvm-memory-01',
      'jvm-gc-01',
      'jvm-gc-02',
      'jvm-classload-01',
    ]);

    const byQuery = await repository.listQuestions({ query: '缓存' });
    expect(byQuery.map((question) => question.id)).toContain('redis-cluster-01');
  });

  it('searchBody 在正文语料中检索并返回片段', async () => {
    const repository = new PreviewQuestionBankRepository();
    const hits = await repository.searchBody('双亲委派');

    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].id).toBe('jvm-classload-01');
    expect(hits[0].snippet).toContain('双亲委派');
    expect(await repository.searchBody('   ')).toEqual([]);
  });

  it('install 明确拒绝（Web 不支持安装），clear 安全无副作用', async () => {
    const repository = new PreviewQuestionBankRepository();
    const emptyPackage: QuestionBankPackage = { catalog: undefined as never, contents: [] };

    await expect(repository.install(emptyPackage)).rejects.toThrow('Web 预览使用内置示例题库');
    await expect(repository.clear()).resolves.toBeUndefined();
  });
});
