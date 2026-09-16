import type { QuestionBankPackage } from './types';

/**
 * Small deterministic package used only by question-bank tests.
 */
export const TEST_QUESTION_BANK: QuestionBankPackage = {
  catalog: {
    schemaVersion: 1,
    id: 'facee-fixture',
    title: 'FaceE 示例题库',
    tags: [
      { id: 'backend', name: '后端开发', parentId: null, sort: 10 },
      { id: 'java', name: 'Java', parentId: 'backend', sort: 10 },
      { id: 'database', name: '数据库', parentId: 'backend', sort: 20 },
      { id: 'architecture', name: '系统设计', parentId: null, sort: 20 },
    ],
    questions: [
      {
        id: 'fixture-java-001',
        title: 'HashMap 的工作原理是什么？',
        difficulty: 1,
        hasAnswer: true,
        sort: 10,
        tags: [{ id: 'java', name: 'Java' }],
      },
      {
        id: 'fixture-java-002',
        title: 'synchronized 和 ReentrantLock 有什么区别？',
        difficulty: 2,
        hasAnswer: true,
        sort: 20,
        tags: [{ id: 'java', name: 'Java' }],
      },
      {
        id: 'fixture-db-001',
        title: '什么是数据库事务的 ACID？',
        difficulty: 1,
        hasAnswer: true,
        sort: 30,
        tags: [{ id: 'database', name: '数据库' }],
      },
      {
        id: 'fixture-db-002',
        title: '如何定位和优化一条慢 SQL？',
        difficulty: 3,
        hasAnswer: true,
        sort: 40,
        tags: [{ id: 'database', name: '数据库' }],
      },
      {
        id: 'fixture-arch-001',
        title: '设计一个高并发的短链接服务',
        difficulty: 3,
        hasAnswer: true,
        sort: 50,
        tags: [{ id: 'architecture', name: '系统设计' }],
      },
      {
        id: 'fixture-arch-002',
        title: '缓存击穿、穿透和雪崩如何治理？',
        difficulty: 2,
        hasAnswer: true,
        sort: 60,
        tags: [{ id: 'architecture', name: '系统设计' }],
      },
    ],
  },
  contents: [
    {
      id: 'fixture-java-001',
      questionMd: '请解释 HashMap 的数据结构、哈希冲突处理，以及扩容时的行为。',
      answerMd:
        'HashMap 通过数组加链表或红黑树保存桶。定位桶后用 equals 判断键是否相同；冲突较多时链表会树化。扩容会重新分配桶并迁移元素。',
    },
    {
      id: 'fixture-java-002',
      questionMd: '请从锁的获取、释放、可中断性和公平性比较两种锁。',
      answerMd:
        'synchronized 语法更简单，由 JVM 管理释放；ReentrantLock 提供可中断、公平锁和多个 Condition。选择时优先考虑简单性，再按控制需求取舍。',
    },
    {
      id: 'fixture-db-001',
      questionMd: '请分别说明原子性、一致性、隔离性和持久性。',
      answerMd:
        'ACID 描述事务的四个目标：操作不可分割、约束始终成立、并发事务互不干扰、提交结果持久保存。',
    },
    {
      id: 'fixture-db-002',
      questionMd: '遇到慢 SQL 时，你会按什么顺序排查？',
      answerMd:
        '先确认慢查询样本和业务影响，再用 EXPLAIN 查看计划，检查索引、扫描行数和排序临时表，最后结合数据分布与改写验证。',
    },
    {
      id: 'fixture-arch-001',
      questionMd: '请从 API、存储、短码生成、缓存和高可用几个方面展开设计。',
      answerMd:
        '先明确读写比例与一致性，再选择短码生成策略和唯一约束；读路径使用缓存，写路径保证幂等，并用分片、限流和多副本应对规模。',
    },
    {
      id: 'fixture-arch-002',
      questionMd: '请区分三种缓存问题，并给出对应防护。',
      answerMd:
        '穿透是查不存在的键，可用布隆过滤器；击穿是热点键失效，可用互斥重建；雪崩是大量键同时失效，可用随机过期和分批刷新。',
    },
  ],
};
