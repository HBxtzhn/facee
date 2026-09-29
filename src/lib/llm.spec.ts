import { describe, it, expect } from '@jest/globals';
import {
  buildExtractionUserPrompt,
  extractQuestionsFromChunks,
  fetchModelIds,
  LLM_PRESETS,
  parseGeneratedQuestions,
  validateConfig,
  type LlmConfig,
} from './llm';

const CONFIG: LlmConfig = { baseUrl: 'https://api.example.com/v1/', apiKey: 'sk-test', model: 'test-model' };

function jsonResponse(content: string, ok = true, status = 200) {
  return {
    ok,
    status,
    text: async () => JSON.stringify({ choices: [{ message: { content } }] }),
  };
}

describe('parseGeneratedQuestions', () => {
  it('解析裸 JSON 数组', () => {
    const raw = JSON.stringify([
      { title: '什么是 JVM？', question: '介绍 JVM。', answer: 'Java 虚拟机。', difficulty: 'easy', tags: ['JVM'] },
      { title: '难一点的题', question: '题干', answer: null, difficulty: 'hard', tags: [] },
    ]);
    const drafts = parseGeneratedQuestions(raw);
    expect(drafts).toHaveLength(2);
    expect(drafts[0]).toEqual({
      title: '什么是 JVM？',
      questionMd: '介绍 JVM。',
      answerMd: 'Java 虚拟机。',
      difficulty: 1,
      tags: ['JVM'],
    });
    expect(drafts[1]).toMatchObject({ difficulty: 3, answerMd: null });
  });

  it('剥掉 Markdown 代码栏与前后废话', () => {
    const raw = [
      '好的，以下是提取结果：',
      '```json',
      JSON.stringify([{ title: '题', question: '干', answer: '案', difficulty: 2, tags: ['a', 'a', 'b'] }]),
      '```',
    ].join('\n');
    const drafts = parseGeneratedQuestions(raw);
    expect(drafts).toHaveLength(1);
    expect(drafts[0].difficulty).toBe(2);
    // 标签去重
    expect(drafts[0].tags).toEqual(['a', 'b']);
  });

  it('缺失标题或题干的条目被跳过，难度未知归中等', () => {
    const raw = JSON.stringify([
      { question: '没有标题' },
      { title: '没有题干' },
      { title: '默认难度', question: '干', difficulty: '啥也不是' },
    ]);
    const drafts = parseGeneratedQuestions(raw);
    expect(drafts).toHaveLength(1);
    expect(drafts[0].difficulty).toBe(2);
  });

  it('完全不是 JSON 时返回空数组而不抛错', () => {
    expect(parseGeneratedQuestions('抱歉我做不到')).toEqual([]);
    expect(parseGeneratedQuestions('')).toEqual([]);
  });
});

describe('extractQuestionsFromChunks', () => {
  it('逐块调用并汇总，进度按块推进', async () => {
    const calls: string[] = [];
    const fetchImpl = async (url: string) => {
      calls.push(url);
      return jsonResponse(`[${JSON.stringify({ title: `题-${calls.length}`, question: '干', answer: null, difficulty: 'easy', tags: [] })}]`);
    };

    const drafts = await extractQuestionsFromChunks(CONFIG, ['第一块资料', '第二块资料'], {
      fetchImpl,
      onProgress: () => undefined,
    });

    expect(calls).toHaveLength(2);
    expect(calls[0]).toBe('https://api.example.com/v1/chat/completions');
    expect(drafts.map((draft) => draft.title)).toEqual(['题-1', '题-2']);
  });

  it('请求体带模型、Bearer Key 与系统提示词', async () => {
    let capturedInit: { method?: string; headers?: Record<string, string>; body?: string } | undefined;
    const fetchImpl = async (_url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => {
      capturedInit = init;
      return jsonResponse('[]');
    };
    await extractQuestionsFromChunks(CONFIG, ['资料'], { fetchImpl });

    expect(capturedInit?.method).toBe('POST');
    expect(capturedInit?.headers?.Authorization).toBe('Bearer sk-test');
    const body = JSON.parse(capturedInit?.body ?? '{}') as {
      model: string;
      messages: { role: string; content: string }[];
    };
    expect(body.model).toBe('test-model');
    expect(body.messages[0].role).toBe('system');
    expect(body.messages[1].role).toBe('user');
    expect(body.messages[1].content).toContain('【资料开始】');
  });

  it('首块失败自动重试一次，两次都失败时报出块序号', async () => {
    let attempts = 0;
    const retryingFetch = async () => {
      attempts += 1;
      if (attempts === 1) return { ok: false, status: 500, text: async () => 'boom' };
      return jsonResponse('[]');
    };
    await expect(
      extractQuestionsFromChunks(CONFIG, ['资料'], { fetchImpl: retryingFetch }),
    ).resolves.toEqual([]);
    expect(attempts).toBe(2);

    const alwaysFailing = async () => ({ ok: false, status: 500, text: async () => 'boom' });
    await expect(
      extractQuestionsFromChunks(CONFIG, ['块一', '块二'], { fetchImpl: alwaysFailing }),
    ).rejects.toThrow('第 1/2 段抽取失败');
  });

  it('配置不合法时直接拒绝', async () => {
    await expect(
      extractQuestionsFromChunks({ baseUrl: 'api.example.com', apiKey: 'k', model: 'm' }, ['资料'], {}),
    ).rejects.toThrow('http');
  });
});

describe('validateConfig / presets', () => {
  it('校验地址协议、Key 与模型名', () => {
    expect(() => validateConfig(CONFIG)).not.toThrow();
    expect(() => validateConfig({ ...CONFIG, baseUrl: '' })).toThrow();
    expect(() => validateConfig({ ...CONFIG, apiKey: ' ' })).toThrow('Key');
    expect(() => validateConfig({ ...CONFIG, model: '' })).toThrow('模型');
  });

  it('预设地址都是 https 且不含 /chat/completions 后缀', () => {
    for (const preset of LLM_PRESETS) {
      if (preset.id === 'custom') continue;
      expect(preset.baseUrl.startsWith('https://')).toBe(true);
      expect(preset.baseUrl.endsWith('/chat/completions')).toBe(false);
    }
  });

  it('用户提示词包含字段说明与资料边界', () => {
    const prompt = buildExtractionUserPrompt('一段资料');
    expect(prompt).toContain('"title"');
    expect(prompt).toContain('【资料开始】');
    expect(prompt).toContain('一段资料');
  });
});

describe('fetchModelIds - 按 Key 拉取模型列表', () => {
  it('请求 /models 并带 Bearer Key，返回排序去重的模型 id', async () => {
    let capturedUrl = '';
    let capturedHeaders: Record<string, string> | undefined;
    const fetchImpl = async (url: string, init?: { headers?: Record<string, string> }) => {
      capturedUrl = url;
      capturedHeaders = init?.headers;
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({ object: 'list', data: [{ id: 'model-b' }, { id: 'model-a' }, { id: 'model-a' }, {}] }),
      };
    };

    const ids = await fetchModelIds(CONFIG, fetchImpl);
    expect(capturedUrl).toBe('https://api.example.com/v1/models');
    expect(capturedHeaders?.Authorization).toBe('Bearer sk-test');
    expect(ids).toEqual(['model-a', 'model-b']);
  });

  it('HTTP 错误抛出带状态码的信息；坏 Key 场景同理', async () => {
    const fetchImpl = async () => ({ ok: false, status: 401, text: async () => 'invalid key' });
    await expect(fetchModelIds(CONFIG, fetchImpl)).rejects.toThrow('HTTP 401');
  });

  it('缺 Key 或地址非法时直接拒绝，不打网络', async () => {
    let called = 0;
    const fetchImpl = async () => {
      called += 1;
      return { ok: true, status: 200, text: async () => '{"data":[]}' };
    };
    await expect(fetchModelIds({ ...CONFIG, apiKey: ' ' }, fetchImpl)).rejects.toThrow('Key');
    await expect(fetchModelIds({ ...CONFIG, baseUrl: 'api.example.com' }, fetchImpl)).rejects.toThrow('http');
    expect(called).toBe(0);
  });

  it('非 /models 结构或空列表时报错', async () => {
    const notList = async () => ({ ok: true, status: 200, text: async () => '{"object":"list"}' });
    await expect(fetchModelIds(CONFIG, notList)).rejects.toThrow('/models');
    const empty = async () => ({ ok: true, status: 200, text: async () => '{"data":[]}' });
    await expect(fetchModelIds(CONFIG, empty)).rejects.toThrow('没有返回可用模型');
  });
});
