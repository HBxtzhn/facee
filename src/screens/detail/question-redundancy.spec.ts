import { describe, expect, it } from '@jest/globals';
import { isQuestionBodyRedundantWithTitle } from './question-redundancy';

describe('isQuestionBodyRedundantWithTitle 题干重复判定', () => {
  it('礼貌化扩写（和/与、标点全角半角、额外补充）判为重复', () => {
    expect(
      isQuestionBodyRedundantWithTitle(
        '== 和 equals 的区别是什么?',
        '请说明 Java 中 == 与 equals() 的区别，并解释为什么重写 equals() 时必须重写 hashCode()。',
      ),
    ).toBe(true);
  });

  it('逐字重复（含空白差异）判为重复', () => {
    expect(isQuestionBodyRedundantWithTitle('HashMap 原理', 'HashMap 原理')).toBe(true);
    expect(isQuestionBodyRedundantWithTitle('HashMap 原理', '  HashMap 原理。 ')).toBe(true);
  });

  it('题干完整包含标题（含 markdown 符号）判为重复', () => {
    expect(
      isQuestionBodyRedundantWithTitle(
        'G1 的 Region 和记忆集（RSet）',
        '请解释 **G1 的 Region** 和记忆集（`RSet`）分别解决了什么问题。',
      ),
    ).toBe(true);
  });

  it('题干与标题主题无关时不判重复', () => {
    expect(
      isQuestionBodyRedundantWithTitle(
        '什么是数据库事务的 ACID？',
        '设计一个高并发的短链接服务，要求支持自定义过期时间与访问统计。',
      ),
    ).toBe(false);
  });

  it('标题措辞与题干重合度低（同主题不同问法）时不判重复', () => {
    expect(
      isQuestionBodyRedundantWithTitle(
        'Redis 持久化方式有哪些？',
        '简述 TCP 三次握手的过程，以及为什么需要三次而不是两次。',
      ),
    ).toBe(false);
  });

  it('无 bigram 的短标题按包含关系判定', () => {
    expect(isQuestionBodyRedundantWithTitle('JVM', '请介绍 JVM 的内存结构。')).toBe(true);
    expect(isQuestionBodyRedundantWithTitle('JVM', '请介绍 MySQL 的索引结构。')).toBe(false);
  });

  it('空标题或空题干不判重复', () => {
    expect(isQuestionBodyRedundantWithTitle('', '请说明某事。')).toBe(false);
    expect(isQuestionBodyRedundantWithTitle('某个标题', '   ')).toBe(false);
  });

  it('题干含图片时不判重复（图片是标题恢复不出来的内容）', () => {
    expect(
      isQuestionBodyRedundantWithTitle(
        'JVM 运行时数据区包含哪些部分?',
        '# JVM 运行时数据区包含哪些部分?\n\n![内存布局](assets/memory-layout.png)\n\n请列出线程私有与共享区域。',
      ),
    ).toBe(false);
  });
});
