/**
 * Fisher-Yates 洗牌：返回新数组，不改动入参。
 * 用于「随机刷」的练习队列构建；多副本一致性由测试锁定（同多重集）。
 */
export function shuffled<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    const temp = result[index];
    result[index] = result[swap];
    result[swap] = temp;
  }
  return result;
}
