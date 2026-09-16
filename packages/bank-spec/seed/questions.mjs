// 示例题库内容（seed）。生成器把它展开成规范 v1 的目录树。
//
// 覆盖矩阵（见 docs/题库规范-v1.md §10.1）：
//   Markdown 全元素题 / 三种语言代码块 / 表格 / 宽图 / 长图 / 外部链接 / 3 条追问 /
//   无 answer.md / facee:// 内链 ×2 / 纯文本「相关题目：」/ 超长题 / 纯英文题 /
//   中文近形关键词 / 同 order 值 / 四层深度标签
//
// 约定：hasAnswer 与 followupCount 由生成器按文件事实推导（此处不写死），生成后交叉校验。

export const bank = {
  id: 'facee-sample-bank',
  name: 'FaceE 示例题库',
  version: '1.0.0',
  updatedAt: '2026-09-15T00:00:00Z',
  description: '用于 FaceE 功能验收的示例题库：Java / 数据库 / 中间件 / 计算机基础 / 分布式。',
  homepage: 'https://github.com/HBxtzhn/facee-bank',
};

export const categories = [
  { id: 'java-basic', name: 'Java 基础', order: 10, description: '语法、语言特性与常用类库' },
  { id: 'jvm', name: 'JVM', order: 20, description: '内存结构、垃圾回收与调优' },
  { id: 'spring', name: 'Spring', order: 30, description: 'IoC、AOP 与事务' },
  { id: 'mysql', name: 'MySQL', order: 40, description: '索引、事务与锁' },
  { id: 'redis', name: 'Redis', order: 50, description: '缓存、持久化与集群' },
  { id: 'mq', name: '消息队列', order: 60, description: '顺序、幂等与可靠投递' },
  { id: 'network', name: '计算机网络', order: 70, description: 'TCP/IP 与 HTTP' },
  { id: 'os', name: '操作系统', order: 80, description: '进程、内存与 IO' },
  { id: 'distributed', name: '分布式系统', order: 90, description: '一致性、事务与 ID' },
];

// 四层深度：backend > java > spring > transaction
export const tags = [
  { id: 'backend', name: '后端', parentId: null, order: 10 },
  { id: 'java', name: 'Java', parentId: 'backend', order: 20 },
  { id: 'jvm', name: 'JVM', parentId: 'java', order: 21 },
  { id: 'concurrent', name: '并发', parentId: 'java', order: 22 },
  { id: 'collection', name: '集合', parentId: 'java', order: 23 },
  { id: 'spring', name: 'Spring', parentId: 'java', order: 24 },
  { id: 'transaction', name: '事务', parentId: 'spring', order: 25 },
  { id: 'database', name: '数据库', parentId: null, order: 30 },
  { id: 'mysql', name: 'MySQL', parentId: 'database', order: 31 },
  { id: 'index', name: '索引', parentId: 'mysql', order: 32 },
  { id: 'redis', name: 'Redis', parentId: 'database', order: 33 },
  { id: 'middleware', name: '中间件', parentId: null, order: 40 },
  { id: 'mq', name: '消息队列', parentId: 'middleware', order: 41 },
  { id: 'cache', name: '缓存', parentId: 'middleware', order: 42 },
  { id: 'cs-basic', name: '计算机基础', parentId: null, order: 50 },
  { id: 'network', name: '计算机网络', parentId: 'cs-basic', order: 51 },
  { id: 'os', name: '操作系统', parentId: 'cs-basic', order: 52 },
  { id: 'distributed', name: '分布式', parentId: null, order: 60 },
];

export const questions = [
  // ── Java 基础 ────────────────────────────────────────────────────────────
  {
    id: 'java-basic-01',
    title: '== 和 equals 的区别是什么？',
    difficulty: 'easy',
    categoryId: 'java-basic',
    tags: ['java'],
    order: 10,
    question: `请说明 Java 中 \`==\` 与 \`equals()\` 的区别，并解释为什么重写 \`equals()\` 时必须重写 \`hashCode()\`。`,
    answer: `## 区别

| 比较项 | \`==\` | \`equals()\` |
|---|---|---|
| 类型 | 运算符 | 方法（\`Object\` 定义） |
| 基本类型 | 比较值 | 不适用 |
| 引用类型 | 比较地址 | 默认比较地址，可重写为比较内容 |

\`\`\`java
String a = new String("abc");
String b = new String("abc");
System.out.println(a == b);      // false：两个不同对象
System.out.println(a.equals(b)); // true：String 重写了 equals
\`\`\`

## 为什么必须同时重写 hashCode

散列集合（\`HashMap\`、\`HashSet\`）先用 \`hashCode()\` 定位桶，再用 \`equals()\` 在桶内比较。若两个对象 \`equals\` 为 true 但哈希值不同，它们会落进不同的桶，导致集合**查不到已存在的元素**，出现"放进去却取不出来"。

契约（\`Object\` 的 javadoc）：
1. \`equals\` 为 true ⇒ \`hashCode\` 必须相等；
2. \`hashCode\` 相等 ⇏ \`equals\` 为 true（允许哈希冲突）。`,
  },
  {
    id: 'java-basic-02',
    title: 'String、StringBuilder 和 StringBuffer 怎么选？',
    difficulty: 'easy',
    categoryId: 'java-basic',
    tags: ['java', 'collection'],
    order: 20,
    question: `三者有什么区别？分别适用于什么场景？`,
    answer: `| 类型 | 可变性 | 线程安全 | 适用场景 |
|---|---|---|---|
| \`String\` | 不可变 | 安全（不可变天然安全） | 少量、不频繁修改的字符串 |
| \`StringBuilder\` | 可变 | 不安全 | 单线程拼接，**首选** |
| \`StringBuffer\` | 可变 | 方法上加 \`synchronized\` | 多线程共享同一实例的拼接 |

要点：

- \`String\` 不可变 ⇒ 每次拼接都产生新对象，循环内拼接会放大开销（编译器会把简单拼接优化为 \`StringBuilder\`，但**循环体内不会**）。
- \`StringBuffer\` 的同步粒度是整个方法，绝大多数场景是过度保护。
- 结论：默认用 \`StringBuilder\`；只有在确实多线程共享同一 builder 时才用 \`StringBuffer\`。`,
  },
  {
    id: 'java-basic-03',
    title: 'HashMap 的底层结构与扩容机制',
    difficulty: 'medium',
    categoryId: 'java-basic',
    tags: ['java', 'collection'],
    order: 30,
    question: `请说明 HashMap 的底层数据结构、put 的流程，以及扩容时发生了什么。`,
    answer: `## 结构

数组 + 链表 + 红黑树（JDK 8 起）：

- 链表长度 ≥ 8 **且** 数组容量 ≥ 64 时转红黑树，查询从 O(n) 降到 O(log n)；
- 容量 < 64 时优先扩容，而不是转树。

## put 流程

1. 计算 \`hash(key)\`：\`(h = key.hashCode()) ^ (h >>> 16)\`，让高 16 位参与运算，减少碰撞；
2. \`(n - 1) & hash\` 定位下标（n 是 2 的幂，等价于取模但更快）；
3. 桶为空直接放入；否则依次比较 hash 与 equals，相同则覆盖，不同则尾插（JDK 8 起尾插，避免 JDK 7 头插在并发扩容时成环）；
4. 判断是否需要树化或扩容。

## 扩容

- 阈值 = 容量 × 负载因子（默认 0.75）；
- JDK 8 用「高位判断」拆分：元素要么留在原下标 \`i\`，要么移到 \`i + oldCap\`，**不需要重新计算 hash**；
- 扩容成本是 O(n)，能预估大小时应通过构造函数指定初始容量（\`expectedSize / 0.75 + 1\`）。`,
  },
  {
    id: 'java-basic-04',
    title: 'Java 中的异常体系是怎样的？',
    difficulty: 'easy',
    categoryId: 'java-basic',
    tags: ['java'],
    order: 40,
    question: `请画出/描述 Java 异常体系，并说明受检异常与非受检异常的使用取舍。`,
    answer: null, // ← 故意留空：验证「暂无参考答案」（§8）
  },

  // ── JVM ──────────────────────────────────────────────────────────────────
  {
    id: 'jvm-memory-01',
    title: 'JVM 运行时数据区包含哪些部分？',
    difficulty: 'medium',
    categoryId: 'jvm',
    tags: ['java', 'jvm'],
    order: 10,
    question: `请说明 JVM 运行时数据区的划分，并指出哪些区域是线程私有的、哪些是线程共享的。

![JVM 内存结构](./assets/memory-layout.png)

**要求**（这一题同时用于验证 Markdown 全元素渲染）：

1. 列出*线程私有*区域；
2. 列出*线程共享*区域；
3. 说明 **OutOfMemoryError** 与 \`StackOverflowError\` 分别可能出现在哪里。

> 提示：区分「规范定义」与「具体实现」。

---

参考表：

| 区域 | 归属 | 主要异常 |
|---|---|---|
| 程序计数器 | 线程私有 | 无 |
| 虚拟机栈 | 线程私有 | StackOverflowError / OOM |
| 本地方法栈 | 线程私有 | StackOverflowError / OOM |
| 堆 | 线程共享 | OutOfMemoryError |
| 方法区（元空间） | 线程共享 | OutOfMemoryError |

延伸阅读：[JVM 规范（JVMS）第 2 章](https://docs.oracle.com/javase/specs/jvms/se17/html/jvms-2.html)`,
    answer: `## 线程私有

- **程序计数器（PC Register）**：当前线程执行字节码的行号指示器；唯一不会抛 OOM 的区域。
- **虚拟机栈**：每个方法调用对应一个栈帧（局部变量表、操作数栈、动态链接、返回地址）。
  - 栈深度超限 ⇒ \`StackOverflowError\`（典型场景：无限递归）；
  - 栈容量扩展失败 ⇒ \`OutOfMemoryError\`（\`-Xss\`、\`-Xss\` 与线程数共同作用）。
- **本地方法栈**：为 native 方法服务。

## 线程共享

- **堆**：对象实例与数组。分代（新生代 Eden/S0/S1、老年代）是**实现**而非规范。
- **方法区**：类元信息、常量、静态变量、JIT 编译产物。JDK 8 起用**元空间**（本地内存）替代永久代，字符串常量池移到堆中。
- **运行时常量池**：方法区的一部分；\`String.intern()\` 在 JDK 7+ 会返回堆中已有引用。

## 直接内存

\`ByteBuffer.allocateDirect\` 分配的堆外内存，不受堆参数约束，由 \`-XX:MaxDirectMemorySize\` 限制；NIO/Netty 大量使用，泄漏时表现为物理内存上涨但堆 dump 正常。`,
  },
  {
    id: 'jvm-gc-01',
    title: '如何判断一个对象可以被回收？',
    difficulty: 'medium',
    categoryId: 'jvm',
    tags: ['java', 'jvm'],
    order: 20,
    question: `JVM 用什么方法判断对象是否存活？为什么不用引用计数？`,
    answer: `## 可达性分析（Reachability Analysis）

从一组 **GC Roots** 出发做图遍历，不可达的对象判定为可回收。

GC Roots 包括：

- 虚拟机栈中局部变量表引用的对象；
- 方法区中类静态属性、常量引用的对象；
- 本地方法栈中 JNI 引用的对象；
- 活跃线程、同步锁持有者等。

## 为什么不用引用计数

引用计数无法处理**循环引用**：\`a.b = b; b.a = a\` 且外部无引用时，计数都不为 0，内存永远不释放。Python 等语言用引用计数 + 循环检测补充，JVM 直接选择可达性分析。

## 补充：两次标记与 finalize

不可达对象并非立即回收：先标记一次，若对象重写了 \`finalize()\` 且未被调用过，会进入 F-Queue 给一次"自救"机会；第二次标记仍不可达才真正回收。实践中不应依赖 \`finalize\`（JDK 9 起已弃用）。`,
  },
  {
    id: 'jvm-gc-02',
    title: '常见垃圾回收器怎么选？（含 G1 调优）',
    difficulty: 'hard',
    categoryId: 'jvm',
    tags: ['java', 'jvm'],
    order: 30,
    question: `请对比 Serial、Parallel、CMS、G1、ZGC 的适用场景。

![GC 时间线](./assets/gc-timeline.png)

线上服务（8C16G、堆 8G、要求 P99 稳定）你会怎么选？为什么？`,
    answer: `## 对比

| 回收器 | 分代 | 停顿特点 | 适用场景 |
|---|---|---|---|
| Serial | 是 | 单线程 STW | 客户端、小堆 |
| ParNew / Parallel Scavenge | 是 | 多线程 STW，吞吐优先 | 批处理、离线任务 |
| CMS | 是 | 并发标记清除，停顿短但有碎片 | 已淘汰（JDK 9 弃用，14 移除） |
| G1 | 是（逻辑分代） | Region 化，可设 \`-XX:MaxGCPauseMillis\` | **通用默认**，大堆低延迟 |
| ZGC / Shenandoah | 否 | 并发整理，亚毫秒级停顿 | 超大堆、极低延迟 |

## 线上选型

**选 G1**，理由：

1. 堆 8G 属于 G1 的舒适区（6–32G 常见），Region 化可预测停顿；
2. 目标可量化：\`-XX:MaxGCPauseMillis=200\`，让回收器自行平衡；
3. 提供 \`-XX:+HeapDumpOnOutOfMemoryError\` + GC 日志便于定位。

关键参数：

\`\`\`bash
-XX:+UseG1GC -Xms8g -Xmx8g -XX:MaxGCPauseMillis=200
-XX:InitiatingHeapOccupancyPercent=45   # 触发并发标记的堆占用阈值
-Xlog:gc*:file=/var/log/gc.log:time,uptime:filecount=10,filesize=32m
\`\`\`

注意：\`-Xms\` 与 \`-Xmx\` 设成相等，避免运行期堆伸缩带来的额外停顿；如果实测停顿仍不达标且堆 > 16G，再评估 ZGC。`,
    followups: [
      {
        q: '如果把 MaxGCPauseMillis 调到 20ms 会怎样？',
        a: `不是越快越好。目标停顿越短，G1 只能每次回收更少的 Region，导致：

1. **回收频率上升**：单次停顿短了，但总次数增加，CPU 被 GC 占用更多；
2. **可能触发 Full GC**：回收速度跟不上分配速度时，退化为串行 Full GC，停顿反而暴涨；
3. 用户体验是 P99，不是平均值——20ms 目标若换来偶发数百毫秒 Full GC，得不偿失。

经验：先设 200ms 观测，再按 GC 日志逐步收紧到 50–100ms；每次只改一个参数并保留对照数据。`,
      },
      {
        q: 'G1 的 Region 和记忆集（RSet）解决了什么问题？',
        a: `**Region** 把堆切成等大区域（1–32MB），使回收粒度与整代解耦——可以只回收"最划算"的那批 Region（Garbage First 的由来）。

**RSet（Remembered Set）** 解决跨 Region 引用的扫描问题：老年代 Region 指向新生代 Region 的引用被记录在 RSet 中，这样做新生代回收时**不必扫描整个老年代**。代价是每个 Region 都有一份 RSet，写屏障会带来额外开销与内存占用（极端情况可占堆的几个百分点）。`,
      },
      {
        q: '如果数据量再涨 10 倍、堆到 64G，方案要怎么变？',
        a: `堆 ≥ 32G 后 G1 的 RSet 与标记开销显著上升，停顿目标难保证，应转向**并发整理**的回收器：

1. **ZGC**（JDK 15+ 生产可用，JDK 21 已成熟）：着色指针 + 读屏障，停顿与堆大小基本无关，典型 < 1ms；
2. 需要更大的**内存余量**：并发回收需要额外的堆空间周转，通常预留 20%–25%；
3. 此时瓶颈往往已不在 GC，而在 **对象分配速率**：先做分配火焰图，减少短命大对象（如大数组、无界缓存），再谈换回收器。

换回收器是最后一步，不是第一步。`,
      },
    ],
  },
  {
    id: 'jvm-classload-01',
    title: '类加载过程与双亲委派模型',
    difficulty: 'medium',
    categoryId: 'jvm',
    tags: ['java', 'jvm'],
    order: 40,
    question: `描述类的生命周期，解释双亲委派模型，并说明为什么需要它。`,
    answer: `## 生命周期

加载 → 验证 → 准备 → 解析 → 初始化 → 使用 → 卸载。

- **准备**：为静态变量分配内存并设"零值"（\`static int a = 1\` 此时 a 为 0）；
- **解析**：符号引用 → 直接引用，可在初始化后延迟进行（动态绑定）；
- **初始化**：执行 \`<clinit>\`，即静态赋值与静态代码块，**按代码顺序**执行。

## 双亲委派

类加载请求先交给父加载器，父加载器无法完成才由自己加载：

\`\`\`text
Bootstrap (rt.jar / java.base)
   ↑
Extension / Platform
   ↑
Application (classpath)
   ↑
自定义 ClassLoader
\`\`\`

## 为什么需要

1. **安全**：用户无法用自定义的 \`java.lang.String\` 替换核心类（父加载器已加载，直接返回）；
2. **唯一性**：同一个类在同一个加载器命名空间内只被加载一次，避免类型混乱。

## 打破委派的场景

- **SPI**：\`DriverManager\` 需要加载 classpath 下的数据库驱动 ⇒ 线程上下文类加载器（TCCL）；
- **热部署**：Tomcat 每个 webapp 一个 \`WebappClassLoader\`，优先自己加载，实现应用隔离；
- **OSGi**：网络化依赖图，完全自定义规则。`,
  },

  // ── Spring ───────────────────────────────────────────────────────────────
  {
    id: 'spring-tx-01',
    title: 'Spring 事务传播机制有哪些？',
    difficulty: 'medium',
    categoryId: 'spring',
    tags: ['java', 'spring', 'transaction'],
    order: 10,
    question: `Spring 中一共提供了哪些事务传播行为？

请分别说明它们的使用场景。`,
    answer: `Spring 定义了 7 种传播行为（\`Propagation\`）：

| 传播行为 | 当前有事务 | 当前无事务 |
|---|---|---|
| REQUIRED（默认） | 加入 | 新建 |
| SUPPORTS | 加入 | 以非事务方式执行 |
| MANDATORY | 加入 | **抛异常** |
| REQUIRES_NEW | **挂起当前**，新建 | 新建 |
| NOT_SUPPORTED | **挂起当前**，非事务执行 | 非事务执行 |
| NEVER | **抛异常** | 非事务执行 |
| NESTED | 嵌套（savepoint） | 新建 |

## 高频考点：REQUIRES_NEW vs NESTED

- \`REQUIRES_NEW\`：两条**独立**事务，外层回滚不影响内层（内层已提交就保留）；
- \`NESTED\`：**同一**物理事务 + savepoint，内层回滚只回到 savepoint，外层回滚会连带内层。

## 最经典的失效场景

同类内部方法调用（\`this.b()\`）不走代理 ⇒ 传播行为与 \`@Transactional\` 全部失效。修法：注入自身代理、拆到另一个 Bean、或用 \`AopContext.currentProxy()\`。`,
    followups: [
      {
        q: '为什么同类内部调用会导致 @Transactional 失效？',
        a: `\`@Transactional\` 的实现是 **AOP 代理**：容器把被注解的 Bean 包成代理对象，代理在方法调用前后开启/提交事务。

当你在 \`a()\` 里写 \`this.b()\` 时，\`this\` 指向的是**被代理的目标对象本身**，而不是代理对象——调用根本没经过代理，自然不会开启事务。

三种修法：

\`\`\`java
// 1) 注入自身代理（Spring 4.3+ 支持自注入）
@Autowired private OrderService self;
self.b();

// 2) 暴露代理（需 @EnableAspectJAutoProxy(exposeProxy = true)）
((OrderService) AopContext.currentProxy()).b();

// 3) 最推荐：把 b() 拆到另一个 Bean，边界清晰
\`\`\`

注意 \`@Async\`、\`@Cacheable\` 等基于代理的注解有**完全一样**的坑。`,
      },
      {
        q: 'REQUIRES_NEW 用不好会带来什么问题？',
        a: `两个主要风险：

1. **连接占用翻倍**：外层事务挂起但**仍然持有数据库连接**，内层又借一条。高并发下连接池被迅速耗尽（HikariCP 默认 10），表现为接口大面积超时——这是线上最常见的事故形态。
2. **数据不一致**：内层提交后，外层再回滚，内层写入的"日志/流水"留下但业务主流程失败。这有时正是想要的（记录失败原因），有时是 bug。

正确姿势：\`REQUIRES_NEW\` 只用于**明确需要独立提交**的旁路操作（审计日志、失败补偿记录），并且评估连接池容量：并发 × 2 ≤ 池大小。`,
      },
      {
        q: '如果数据量增大导致事务变长，怎么优化？',
        a: `思路是按"事务里不该做的事"逐项剥离，而不是调大超时：

1. **缩短事务边界**：把远程调用（RPC/HTTP）、消息发送、文件 IO 移到事务外，事务内只留数据库写操作；
2. **大事务拆分**：批量导入改为分批提交（每批 500–1000 行），配合幂等键支持重跑；
3. **读写分离**：只读查询走从库并标记 \`@Transactional(readOnly = true)\`，减少主库锁竞争；
4. **换掉长事务的成因**：如果是"先查后改"的竞态，改用条件更新（\`UPDATE ... WHERE version = ?\`）或悲观锁，缩短持锁时间；
5. **监控兜底**：给事务耗时加直方图指标（P99 > 500ms 告警），先量化再优化。`,
      },
    ],
  },
  {
    id: 'spring-tx-02',
    title: 'Spring 事务在什么情况下会失效？',
    difficulty: 'hard',
    categoryId: 'spring',
    tags: ['java', 'spring', 'transaction'],
    order: 20,
    question: `列举 @Transactional 失效的常见场景，并给出排查思路。`,
    answer: `## 失效清单

| 场景 | 原因 |
|---|---|
| 同类内部调用 \`this.b()\` | 不经过代理 |
| 方法非 \`public\` | 代理只拦截 public 方法（CGLIB 亦如此约定） |
| 异常被 catch 未抛出 | 代理感知不到失败 |
| 抛出**受检异常** | 默认只对 \`RuntimeException\`/\`Error\` 回滚 |
| 传播行为为 \`NOT_SUPPORTED\`/\`NEVER\` | 本身就不在事务里 |
| 多数据源未配事务管理器 | 用了默认的 DataSourceTransactionManager |
| 类未被 Spring 管理（\`new\` 出来的） | 没有代理 |
| 数据库引擎不支持事务（MyISAM） | 存储引擎层面 |

## 排查思路

1. 先确认**代理是否存在**：\`AopUtils.isAopProxy(bean)\`，或启动时打印 Bean 类型；
2. 打开事务日志：\`logging.level.org.springframework.transaction=DEBUG\`，观察是否打出 \`Creating new transaction\`；
3. 确认异常类型与 \`rollbackFor\` 是否匹配；
4. 检查是否有 \`try/catch\` 吞掉了异常。

修法优先级：**先修调用方式**（拆 Bean）> 调整 \`rollbackFor\` > 显式编程式事务（\`TransactionTemplate\`）。`,
  },
  {
    id: 'spring-ioc-01',
    title: 'Spring Bean 的生命周期与循环依赖',
    difficulty: 'hard',
    categoryId: 'spring',
    tags: ['java', 'spring'],
    order: 30,
    question: `描述 Spring Bean 的完整生命周期，并解释 Spring 如何解决循环依赖。

相关题目：Spring 事务传播机制有哪些？`,
    answer: `## 生命周期（简化）

1. 实例化（构造器 / 工厂方法）；
2. 属性填充（依赖注入）；
3. \`Aware\` 回调（\`BeanNameAware\`、\`ApplicationContextAware\` 等）；
4. \`BeanPostProcessor.postProcessBeforeInitialization\`；
5. \`@PostConstruct\` → \`InitializingBean.afterPropertiesSet\` → \`init-method\`；
6. \`BeanPostProcessor.postProcessAfterInitialization\`（**AOP 代理在此生成**）；
7. 使用；
8. 销毁：\`@PreDestroy\` → \`DisposableBean.destroy\` → \`destroy-method\`。

## 三级缓存

| 缓存 | 内容 | 作用 |
|---|---|---|
| \`singletonObjects\`（一级） | 成品 Bean | 正常获取 |
| \`earlySingletonObjects\`（二级） | 半成品（已实例化未填充） | 提前暴露 |
| \`singletonFactories\`（三级） | \`ObjectFactory\` | 延迟决定是否生成代理 |

流程：A 实例化后把工厂放进三级缓存 → 填充属性时发现需要 B → B 创建时又需要 A → 从三级缓存拿到工厂并调用 \`getObject()\`，**必要时在此提前生成 A 的代理**，放入二级缓存 → B 完成 → A 完成。

关键点：**三级缓存的真正意义是"延迟生成代理"**，保证循环依赖下注入的仍是代理对象而非原始对象。

## 无法解决的场景

- **构造器注入**的循环依赖（实例化阶段就卡住）⇒ 用 \`@Lazy\` 或改字段注入；
- **原型（prototype）** Bean 的循环依赖 ⇒ Spring 直接抛异常；
- \`@Async\` 与循环依赖叠加时容易报"BeanCurrentlyInCreationException"。`,
  },

  // ── MySQL ────────────────────────────────────────────────────────────────
  {
    id: 'mysql-index-01',
    title: '为什么 MySQL 用 B+ 树做索引？',
    difficulty: 'hard',
    categoryId: 'mysql',
    tags: ['database', 'mysql', 'index'],
    order: 10,
    question: `请说明 MySQL（InnoDB）为什么选择 B+ 树作为索引结构。

**要求**：从磁盘 IO、范围查询、树高、与 B 树/哈希/跳表的对比几个角度展开，并给出一次真实查询的 IO 次数估算。`,
    answer: `## 一、先明确约束

数据库索引的瓶颈不是 CPU，而是**磁盘随机 IO**。设计目标：在"每读一个节点 = 一次随机 IO"的前提下，让树高尽可能低，且支持范围扫描。

## 二、B+ 树相对其他结构的取舍

| 结构 | 等值查询 | 范围查询 | 树高/复杂度 | 结论 |
|---|---|---|---|---|
| 哈希 | O(1) | **不支持**（无序） | — | 只适合等值，InnoDB 仅用于自适应哈希索引 |
| 二叉搜索树 | O(log n) | 支持 | 高（节点只存 1 个 key） | 树高过大，IO 次数多 |
| 红黑树 | O(log n) | 支持 | 高（内存结构） | 适合内存，不适合磁盘 |
| 跳表 | O(log n) | 支持 | 概率平衡 | Redis 用；磁盘上不如 B+ 树紧凑 |
| B 树 | O(log n) | 支持 | 中（**非叶节点也存数据**） | 内部节点能放的 key 少 ⇒ 树更高 |
| **B+ 树** | O(log n) | **优秀（叶子成链表）** | 低（非叶只存 key） | InnoDB 的选择 |

关键差异：**B+ 树的非叶节点只存 key 不存 data**，因此一个 16KB 页能容纳更多 key，扇出更大、树更矮。

## 三、量化：树高与 IO 次数

设 InnoDB 页大小 16KB，主键 \`BIGINT\`（8 字节）+ 页指针（6 字节）：

\`\`\`text
每个 key 条目 ≈ 8 + 6 = 14 字节
单页可容纳 ≈ 16 * 1024 / 14 ≈ 1170 个 key   （扇出 ≈ 1170）
\`\`\`

叶子节点存整行。假设单行 ≈ 1KB ⇒ 每叶页约 16 行。

| 树高 | 可索引行数 ≈ 1170^(h-1) × 16 |
|---|---|
| 2 | 1.8 万 |
| 3 | **2190 万** |
| 4 | 256 亿 |

结论：**2000 万行的表，主键查询最多 3 次随机 IO**（根页常驻内存则实际 2 次）。这就是 B+ 树的价值。

## 四、聚簇索引与二级索引

- **聚簇索引**：叶子节点存整行数据，按主键组织 ⇒ 表就是索引；
- **二级索引**：叶子节点存主键值 ⇒ 查非索引列需要**回表**（再走一次聚簇索引）；
- **覆盖索引**：查询列全在二级索引里 ⇒ 免回表，是最高频的优化手段之一；
- **最左前缀**：联合索引 \`(a, b, c)\` 可支持 \`a\`、\`a,b\`、\`a,b,c\`，但 \`b\`、\`b,c\` 单独用不上（B+ 树按定义顺序排序）。

## 五、为什么不用 B 树

B 树的非叶节点也保存数据行，导致：

1. 单页可容纳的 key 数量骤减 ⇒ 扇出变小 ⇒ 树更高 ⇒ 更多随机 IO；
2. 范围查询需要中序遍历、跨层回溯，而 B+ 树叶子节点的双向链表可以顺序扫描，还能触发**预读**。

## 六、实践结论

1. 主键用自增 \`BIGINT\`：随机主键（如 UUID）会导致页分裂与随机写；
2. 把高频查询做成覆盖索引；
3. 用 \`EXPLAIN\` 看 \`type\`（\`ref\`/\`range\` 优于 \`index\`，\`ALL\` 是灾难）与 \`rows\` 估算；
4. 索引不是越多越好：每个二级索引都会拖慢写入并占用空间。`,
  },
  {
    id: 'mysql-tx-01',
    title: 'MySQL 的四种隔离级别与 MVCC',
    difficulty: 'hard',
    categoryId: 'mysql',
    tags: ['database', 'mysql', 'transaction'],
    order: 20,
    question: `解释四种隔离级别分别解决什么问题，以及 MVCC 是如何实现的。`,
    answer: `## 隔离级别与现象

| 隔离级别 | 脏读 | 不可重复读 | 幻读 |
|---|---|---|---|
| READ UNCOMMITTED | ✓ | ✓ | ✓ |
| READ COMMITTED | ✗ | ✓ | ✓ |
| REPEATABLE READ（MySQL 默认） | ✗ | ✗ | ✗（InnoDB 用间隙锁基本避免） |
| SERIALIZABLE | ✗ | ✗ | ✗ |

## MVCC 三要素

1. **隐藏列**：每行有 \`DB_TRX_ID\`（最后修改事务）与 \`DB_ROLL_PTR\`（指向 undo log 版本链）；
2. **undo log**：串成版本链，可回溯历史版本；
3. **ReadView**：快照，包含当前活跃事务 ID 集合 \`m_ids\`、\`min_trx_id\`、\`max_trx_id\`、创建者 ID。

可见性判断：沿版本链找第一个 \`trx_id < min_trx_id\`（已提交）或"是自己的修改"的版本。

## RC 与 RR 的本质差异

- **READ COMMITTED**：**每次 SELECT 都新建 ReadView** ⇒ 能看到别人新提交的数据；
- **REPEATABLE READ**：**第一次 SELECT 建 ReadView 并复用** ⇒ 整个事务看到同一快照。

## 快照读 vs 当前读

- 快照读（普通 \`SELECT\`）走 MVCC，不加锁；
- 当前读（\`SELECT ... FOR UPDATE\`、\`UPDATE\`、\`DELETE\`）读最新版本并加锁，幻读由**间隙锁（Gap Lock）** 阻止。`,
  },
  {
    id: 'mysql-lock-01',
    title: 'MySQL 有哪些锁？如何排查死锁？',
    difficulty: 'medium',
    categoryId: 'mysql',
    tags: ['database', 'mysql'],
    order: 30,
    question: `说明 InnoDB 的锁类型，并给出线上死锁的排查流程。`,
    answer: `## 锁类型

- **按粒度**：表锁、行锁、间隙锁、临键锁（Next-Key = 记录锁 + 间隙锁）；
- **按模式**：共享锁 S、排他锁 X、意向锁 IS/IX（表级，用于快速判断能否加表锁）；
- **其他**：插入意向锁、自增锁（\`innodb_autoinc_lock_mode\`）。

## 排查死锁

\`\`\`sql
SHOW ENGINE INNODB STATUS\\G          -- 看 LATEST DETECTED DEADLOCK 段
SELECT * FROM performance_schema.data_locks;
SELECT * FROM performance_schema.data_lock_waits;
\`\`\`

## 常见死锁形态与修法

| 形态 | 原因 | 修法 |
|---|---|---|
| 两个事务反向更新两行 | 加锁顺序不一致 | **统一加锁顺序**（如按主键升序） |
| 无索引更新 | 退化为锁全表/大量行 | 补索引，缩小锁范围 |
| 间隙锁冲突 | RR 级别下范围条件加 Next-Key | 缩小范围条件，或评估降为 RC |

核心原则：**让所有事务以相同顺序、尽可能小的范围加锁**。`,
  },

  // ── Redis ────────────────────────────────────────────────────────────────
  {
    id: 'redis-cache-01',
    title: 'Redis 为什么这么快？',
    difficulty: 'medium',
    categoryId: 'redis',
    tags: ['database', 'redis', 'cache'],
    order: 10,
    question: `请从数据结构、IO 模型、内存管理几个角度解释 Redis 的高性能来源。

相关题目：
- [为什么 MySQL 用 B+ 树做索引？](facee://question/mysql-index-01)
- [常见垃圾回收器怎么选？（含 G1 调优）](facee://question/jvm-gc-02)`,
    answer: `## 1. 纯内存操作

数据在内存中，读写不涉及磁盘寻道。这是**最主要**的原因，其他都是锦上添花。

## 2. 高效的数据结构

| 类型 | 底层实现 | 特点 |
|---|---|---|
| String | SDS（简单动态字符串） | 预分配 + 二进制安全 |
| List | quicklist（ziplist 链） | 兼顾内存与读写 |
| Hash | ziplist / hashtable | 小对象用紧凑编码 |
| ZSet | skiplist + dict | 范围查询 O(log n) |
| Set | intset / hashtable | 整数集合省内存 |

## 3. 单线程 + IO 多路复用

- 命令执行是**单线程**的 ⇒ 无锁、无上下文切换、无竞态；
- 用 epoll 管理海量连接，事件驱动，避免为每连接开线程；
- Redis 6.0 起网络 IO 多线程化，但**命令执行仍是单线程**，语义不变。

## 4. 其他

- 自定义内存分配器（jemalloc），减少碎片；
- 惰性删除 + 定期删除结合，避免单次大停顿；
- RESP 协议简单，解析开销低。

## 注意：单线程的代价

一个慢命令会阻塞所有请求。生产禁用 \`KEYS *\`、\`FLUSHALL\`，用 \`SCAN\` 替代；大 key（>10KB）拆分；\`DEL\` 大集合改用 \`UNLINK\` 异步释放。`,
  },
  {
    id: 'redis-persist-01',
    title: 'RDB 和 AOF 怎么选？',
    difficulty: 'medium',
    categoryId: 'redis',
    tags: ['database', 'redis'],
    order: 20,
    question: `对比 RDB 与 AOF，说明混合持久化以及线上配置建议。`,
    answer: `| 维度 | RDB | AOF |
|---|---|---|
| 内容 | 某一时刻的数据快照 | 写命令日志 |
| 体积 | 小 | 大 |
| 恢复速度 | 快 | 慢 |
| 数据安全性 | 可能丢最后一次快照后的数据 | 取决于 \`appendfsync\` |
| 对性能影响 | fork 时有写时复制开销 | 追加写，影响较小 |

## appendfsync 三档

- \`always\`：每条命令 fsync，最安全、性能最差；
- \`everysec\`（默认）：每秒 fsync，最多丢 1 秒；
- \`no\`：交给操作系统，可能丢较多。

## 混合持久化（Redis 4.0+）

\`aof-use-rdb-preamble yes\`：AOF 重写时前半部分写 RDB 格式、后半部分追加增量命令 ⇒ 兼顾**恢复速度**与**数据安全**。生产推荐开启。

## 线上建议

\`\`\`text
appendonly yes
appendfsync everysec
aof-use-rdb-preamble yes
save 900 1   # 保留 RDB 作为冷备
\`\`\`

注意 fork 的代价：内存越大、写时复制页越多，fork 停顿越明显（大实例可达数百毫秒），应避开业务高峰做 BGSAVE。`,
  },
  {
    id: 'redis-cluster-01',
    title: '缓存穿透、击穿、雪崩怎么解决？',
    difficulty: 'medium',
    categoryId: 'redis',
    tags: ['database', 'redis', 'cache'],
    order: 30,
    question: `分别解释缓存穿透、击穿、雪崩，并给出各自的处理方案。`,
    answer: `## 三者的区别

| 问题 | 触发条件 | 后果 |
|---|---|---|
| 穿透 | 查询**不存在**的数据 | 每次都打到 DB |
| 击穿 | **单个热点 key** 过期瞬间 | 大量请求同时打到 DB |
| 雪崩 | **大量 key 同时过期** 或 Redis 宕机 | DB 被压垮 |

## 穿透

1. 缓存空值（设短 TTL，如 60s），注意防"空值刷爆内存"；
2. **布隆过滤器**前置拦截：不存在的一定拦掉，存在的有误判率；
3. 参数校验，拦截非法 ID。

## 击穿

1. **互斥重建**：\`SETNX\` 抢锁，只有一个线程查 DB 并回填，其余等待；
2. **逻辑过期**：value 内带过期时间，异步刷新，读到的旧值先返回（不阻塞）；
3. 热点数据**永不过期** + 后台定时更新。

## 雪崩

1. TTL 加**随机抖动**（\`base + random(0, 300s)\`），避免同时失效；
2. 多级缓存（本地 Caffeine + Redis）；
3. **熔断限流**：DB 侧做保护，避免连锁故障；
4. 集群高可用（哨兵/Cluster）+ 主从读写分离。`,
  },

  // ── 消息队列 ─────────────────────────────────────────────────────────────
  {
    id: 'mq-kafka-01',
    title: 'Kafka 如何保证消息不丢失？',
    difficulty: 'hard',
    categoryId: 'mq',
    tags: ['middleware', 'mq'],
    order: 10,
    question: `从生产者、Broker、消费者三个环节说明如何保证消息不丢失。`,
    answer: `## 逐环节分析

**生产者**

- \`acks=all\`（\`-1\`）：所有 ISR 副本写入成功才返回；
- \`retries\` 足够大 + \`enable.idempotence=true\`（幂等生产者，避免重试造成重复）；
- \`max.in.flight.requests.per.connection=1\` 或配合幂等使用（≤5 时幂等仍有效）。

**Broker**

- \`replication.factor ≥ 3\`；
- \`min.insync.replicas ≥ 2\`（与 \`acks=all\` 配合，保证至少两个副本落盘）；
- \`unclean.leader.election.enable=false\`：不允许落后副本当 leader，宁可用不可用换一致性。

**消费者**

- 关闭**自动提交**：\`enable.auto.commit=false\`；
- **处理完成后**再手动提交 offset（至少一次语义）；
- 消费失败不要吞异常，重试 + 死信主题。

## 关键：语义选择

Kafka 只能保证**至少一次**（默认）或**至多一次**。要业务上的"恰好一次"，必须在消费端做**幂等**（唯一键去重表 / 状态机）。`,
  },
  {
    id: 'mq-order-01',
    title: '如何保证消息的顺序性？',
    difficulty: 'medium',
    categoryId: 'mq',
    tags: ['middleware', 'mq'],
    order: 20,
    question: `在 Kafka 和 RocketMQ 中分别如何保证消息顺序？全局顺序是否现实？`,
    answer: `## 核心结论

**全局顺序**几乎不现实（等于把并发压成 1）。工程做法是**局部顺序**：按业务键（订单号、用户 ID）分区，保证同一键内有序。

## Kafka

- 同一 Partition 内天然有序；
- 生产者指定 \`key\` ⇒ 相同 key 落同一分区（\`hash(key) % partitions\`）；
- 消费者**单线程处理每个分区**，或按 key 路由到内存队列，多线程按 key 串行消费。

## RocketMQ

- 普通消息：\`MessageQueueSelector\` 按 key 选队列；
- 严格顺序：\`MessageQueue\` 顺序消息（生产者 + 消费者都锁定同一队列，串行消费）。

## 常见破坏顺序的行为

1. 消费端为了提高吞吐改成线程池，且未按 key 分派 ⇒ 顺序丢失；
2. 重试机制把失败消息投到另一队列 ⇒ 顺序丢失；
3. 生产者开启重试且 \`max.in.flight > 1\` 且未开幂等 ⇒ 消息乱序。`,
  },
  {
    id: 'mq-idempotent-01',
    title: '消息重复消费如何保证幂等？',
    difficulty: 'medium',
    categoryId: 'mq',
    tags: ['middleware', 'mq'],
    order: 30,
    question: `给出几种业务幂等的实现方案，并比较它们的适用场景。`,
    answer: `## 为什么必须幂等

MQ 至少一次投递 + 网络重试 + 消费端重平衡，重复几乎必然发生。**幂等是消费端的责任**。

## 方案对比

| 方案 | 实现 | 适用 |
|---|---|---|
| 唯一索引 | 业务唯一键建唯一索引，重复插入报错忽略 | 插入类操作，**最可靠** |
| 去重表 | 消息 ID + 业务 ID 建表，处理前先插入 | 通用，注意表膨胀与清理 |
| Redis SETNX | \`SET msgId 1 NX EX 86400\` | 高性能，允许极小概率丢失（Redis 故障） |
| 状态机 | 只允许 \`PENDING → PAID → SHIPPED\` 的合法跃迁 | 订单类，天然幂等 |
| 乐观锁 | \`UPDATE ... WHERE version = ?\` | 更新类，防并发覆盖 |

## 工程建议

1. **优先状态机 + 唯一索引**：不依赖外部组件，语义清晰；
2. Redis 去重只做"前置快速失败"，最终一致性仍由 DB 唯一约束兜底；
3. 去重表的键要有 TTL 或分区清理策略，否则无限增长；
4. 幂等键要**跨重试稳定**（用业务 ID，不要用消息中间件生成的随机 ID）。`,
  },

  // ── 计算机网络 ───────────────────────────────────────────────────────────
  {
    id: 'net-tcp-01',
    title: 'TCP 三次握手与四次挥手',
    difficulty: 'medium',
    categoryId: 'network',
    tags: ['cs-basic', 'network'],
    order: 10,
    question: `描述三次握手与四次挥手的过程，并解释"为什么握手是三次、挥手是四次"。`,
    answer: `## 三次握手

\`\`\`text
Client                        Server
  |--- SYN  seq=x ------------>|
  |<-- SYN+ACK seq=y,ack=x+1 --|
  |--- ACK ack=y+1 ----------->|
\`\`\`

- 为什么是三次：需要**双方都确认对方的收发能力**。两次无法让服务端确认客户端的接收能力，也无法防止历史连接请求造成资源浪费。
- \`seq\` 随机初始化（ISN）是为了防止旧连接的报文被新连接误收。

## 四次挥手

\`\`\`text
Client                        Server
  |--- FIN ------------------>|   (客户端不再发数据)
  |<-- ACK -------------------|
  |<-- FIN -------------------|   (服务端数据发完)
  |--- ACK ------------------>|
  |     TIME_WAIT 2MSL        |
\`\`\`

- 为什么是四次：TCP 全双工，**两个方向的关闭要分别确认**。服务端收到 FIN 后可能还有数据要发，所以 ACK 与 FIN 不能合并。
- **TIME_WAIT（2MSL）** 的作用：① 保证最后的 ACK 能到达（丢失可重传）；② 让本次连接的残留报文在网络中消散，避免污染新连接。

## 高频追问点

- 大量 \`TIME_WAIT\` 出现在**主动关闭方**（通常是服务端），可开 \`tcp_tw_reuse\`，但不要动 \`tcp_tw_recycle\`（NAT 环境下有害）；
- 大量 \`CLOSE_WAIT\` 说明**应用没调用 close**，是代码 bug（连接泄漏），不是内核参数问题。`,
  },
  {
    id: 'net-http-01',
    title: 'HTTP/1.1、HTTP/2、HTTP/3 有什么区别？',
    difficulty: 'medium',
    categoryId: 'network',
    tags: ['cs-basic', 'network'],
    order: 10,
    question: `对比三代 HTTP 协议的关键改进，并说明它们分别解决了什么问题。`,
    answer: `| 版本 | 传输层 | 关键特性 | 解决的问题 |
|---|---|---|---|
| HTTP/1.1 | TCP | 持久连接、管线化（实际很少用） | 每次请求都建连 |
| HTTP/2 | TCP | 多路复用、头部压缩（HPACK）、二进制分帧、服务端推送 | 队头阻塞（应用层） |
| HTTP/3 | **QUIC（UDP）** | 0-RTT、独立流、连接迁移 | 队头阻塞（传输层） |

## 要点

- HTTP/2 的**多路复用**让一个 TCP 连接并行承载多个流，解决了 HTTP/1.1 的"6 连接上限 + 队头阻塞"；
- 但 TCP 层仍有队头阻塞：一个包丢失会阻塞该连接上**所有**流 ⇒ HTTP/3 改用 QUIC，每个流独立重传；
- HTTP/3 的 0-RTT 复用会话票据，弱网下首包延迟显著降低；
- HTTP/2 头部压缩对小请求收益明显（HPACK 静态表 + 动态表）。

## 实践

- 内网 gRPC（基于 HTTP/2）适合高频小消息；
- 面向公网的静态资源，HTTP/3 在弱网/移动网络收益最大，但需评估 CDN 与中间设备支持度。`,
  },
  {
    id: 'net-http2-01',
    title: 'What happens when you type a URL into a browser?',
    difficulty: 'easy',
    categoryId: 'network',
    tags: ['cs-basic', 'network'],
    order: 20,
    question: `Walk through what happens, end to end, when you type \`https://example.com\` into a browser and press Enter. Keep it structured and mention where caches can short-circuit the flow.`,
    answer: `## End-to-end flow

1. **URL parsing** — scheme/host/port/path resolved; default port 443 for HTTPS.
2. **Cache lookups** (short-circuits): browser cache → Service Worker → OS DNS cache → hosts file.
3. **DNS resolution** — recursive resolver → root → TLD → authoritative; A/AAAA record returned. Cached by TTL.
4. **TCP handshake** — SYN / SYN+ACK / ACK; if HTTP/3, a QUIC handshake over UDP instead.
5. **TLS handshake** — ClientHello (SNI, ALPN), certificate verification, key exchange; TLS 1.3 takes 1 RTT (0-RTT on resumption).
6. **HTTP request** — headers (Host, Cookie, Accept-Encoding), optional body.
7. **Server processing** — routing, auth, business logic, DB/cache access.
8. **Response** — status line, headers (Cache-Control, ETag), body; possibly via CDN edge.
9. **Rendering** — HTML parsing → DOM, CSSOM, render tree, layout, paint, composite; subresources trigger more requests.
10. **Connection teardown** — keep-alive by default; FIN/ACK when idle timeout hits.

## Where latency usually hides

| Stage | Typical cost | Where to optimize |
|---|---|---|
| DNS | 20–120 ms cold | Preconnect / dns-prefetch |
| TCP + TLS | 2–3 RTT | TLS 1.3, session resumption, edge termination |
| TTFB | server-bound | caching, DB indexes, CDN |
| Subresources | often the largest | compression, HTTP/2 multiplexing, asset budget |

**Note:** the first three stages are almost entirely avoidable on repeat visits — that is why caching correctness matters more than micro-optimizing step 7.`,
  },

  // ── 操作系统 ─────────────────────────────────────────────────────────────
  {
    id: 'os-process-01',
    title: '进程和线程的区别？协程又是什么？',
    difficulty: 'easy',
    categoryId: 'os',
    tags: ['cs-basic', 'os', 'concurrent'],
    order: 10,
    question: `说明进程、线程、协程的区别与各自的开销。`,
    answer: `| 维度 | 进程 | 线程 | 协程 |
|---|---|---|---|
| 资源 | 独立地址空间 | 共享进程地址空间 | 共享线程栈外资源 |
| 切换开销 | 大（切页表、TLB 失效） | 中（切栈、寄存器） | 小（用户态，无内核参与） |
| 调度者 | 操作系统 | 操作系统 | 用户态运行时 |
| 通信 | IPC（管道、共享内存、socket） | 共享内存 + 同步原语 | 直接共享变量 |
| 崩溃影响 | 隔离 | 拖垮整个进程 | 拖垮所在线程 |

## 关键点

- **线程切换为什么比进程便宜**：同一进程内地址空间不变，不需要切换页表与刷新 TLB；
- **协程为什么更便宜**：切换在用户态完成，不陷入内核，栈可以很小（KB 级）⇒ 单机可跑十万级；
- 协程的代价：**一个协程阻塞会阻塞整个线程**，因此必须配合非阻塞 IO 使用（Go 的 GMP、Kotlin 的挂起函数都是这个思路）。

## Java 侧

虚拟线程（JDK 21 正式）本质是 JVM 调度的协程：每线程栈由堆上对象承载，阻塞操作会被 JVM 挂起而不占用 OS 线程。适合高并发 IO 密集场景，不适合长时间 CPU 计算。`,
  },
  {
    id: 'os-memory-01',
    title: '虚拟内存与页面置换算法',
    difficulty: 'medium',
    categoryId: 'os',
    tags: ['cs-basic', 'os'],
    order: 20,
    question: `解释虚拟内存的作用，并比较常见页面置换算法。`,
    answer: `## 虚拟内存解决什么

1. **隔离**：每个进程独立地址空间，互不可见；
2. **超额分配**：可用空间 = 物理内存 + 交换区，程序不必感知物理上限；
3. **共享与映射**：同一份代码段/文件可映射到多个进程（动态库、mmap）。

实现基础：**分页 + 页表 + MMU**；缺页时触发中断，由内核决定换入哪个页。

## 置换算法

| 算法 | 思想 | 问题 |
|---|---|---|
| OPT（最优） | 淘汰未来最久不用 | 无法实现，仅作理论上界 |
| FIFO | 先进先出 | 有 Belady 异常（页框变多缺页反而增加） |
| LRU | 淘汰最久未使用 | 需要精确记录访问序，硬件成本高 |
| **Clock / 二次机会** | 用访问位近似 LRU，环形扫描 | 实际主流（Linux 的变体） |
| LFU | 淘汰访问次数最少 | 历史热点难以淘汰 |

## 缺页与性能

- **主缺页**：页面首次访问，必须读磁盘；
- **次缺页**：页已在内存但未映射到该进程；
- 页框不足 ⇒ **抖动（thrashing）**：CPU 大量时间花在换页上，表现为负载高但吞吐低。这是内存不足的典型信号。

## 与 JVM 的联系

JVM 的分代回收本质上是把"对象生命周期"当作局部性假设，而虚拟内存是把"空间局部性"当作假设——两者都是在利用局部性换取吞吐。`,
  },
  {
    id: 'os-io-01',
    title: '五种 IO 模型与零拷贝',
    difficulty: 'hard',
    categoryId: 'os',
    tags: ['cs-basic', 'os'],
    order: 30,
    question: `说明阻塞、非阻塞、IO 多路复用、信号驱动、异步 IO 的区别，并解释零拷贝的原理。`,
    answer: `## 五种 IO 模型

| 模型 | 等待数据 | 拷贝数据 | 特点 |
|---|---|---|---|
| 阻塞 IO | 阻塞 | 阻塞 | 最简单，一连接一线程 |
| 非阻塞 IO | 轮询 | 阻塞 | 空转消耗 CPU |
| **IO 多路复用** | 阻塞在 select/epoll | 阻塞 | 一线程管多连接，**主流** |
| 信号驱动 | 不阻塞 | 阻塞 | 用得少 |
| 异步 IO（AIO） | 不阻塞 | **不阻塞** | 真正的异步，Linux io_uring 是成熟形态 |

关键区别：前四种在"数据从内核拷贝到用户空间"这一步都是阻塞的；只有异步 IO 全程不阻塞。

## epoll 相对 select 的优势

1. 无 FD 数量上限（select 默认 1024）；
2. 不需要每次把整个 FD 集合拷进内核（epoll 用红黑树维护，事件就绪放就绪链表）；
3. 返回的是**就绪的** FD，时间复杂度 O(就绪数) 而非 O(总数)。

## 零拷贝

传统 read+write 要 4 次拷贝 + 4 次上下文切换（磁盘→内核页缓存→用户缓冲→内核 socket 缓冲→网卡）。

\`\`\`c
sendfile(out_fd, in_fd, NULL, count);   // 数据不经过用户空间
\`\`\`

配合 \`SG-DMA\` 可做到 **2 次拷贝（且都不经过 CPU）**：

\`\`\`text
磁盘 → 内核页缓存 →(DMA)→ 网卡
\`\`\`

\`mmap + write\` 是另一种方案（3 次拷贝）。Kafka 用 sendfile 做日志传输、Netty 用 \`FileRegion\` 提供支持，都是这个原理。`,
  },

  // ── 分布式系统 ───────────────────────────────────────────────────────────
  {
    id: 'dist-cap-01',
    title: 'CAP 与 BASE 理论怎么落地？',
    difficulty: 'medium',
    categoryId: 'distributed',
    tags: ['distributed'],
    order: 10,
    question: `解释 CAP 定理的准确含义，说明常见的误解，并给出实际系统中的取舍例子。`,
    answer: `## 准确定义

C（一致性）：所有节点同一时刻看到相同数据；
A（可用性）：每个请求都能在**有限时间内**得到**非错误**响应；
P（分区容错）：网络分区时系统仍能继续运行。

**关键**：CAP 的取舍只在**发生分区时**才需要做。没有分区时，C 和 A 可以同时满足。

## 常见误解

1. "三选二"——错。P 在分布式系统中是**必须接受的前提**，实际是在 **C 与 A 之间取舍**；
2. 把 C 理解成"强一致"是数据库 ACID 的 C——不是，CAP 的 C 是线性一致性；
3. 忽略"有限时间"——很多系统用超时代替错误，这仍是 A 的妥协。

## 落地例子

| 系统 | 分区时倾向 | 说明 |
|---|---|---|
| ZooKeeper / etcd | CP | 选主期间拒绝写，保证一致性 |
| Eureka | AP | 节点间不同步也能读，可能读到旧数据 |
| Nacos | 可切换 | 临时实例 AP，持久实例 CP |
| Cassandra / DynamoDB | AP（可调） | 用 quorum 参数调节 |

## BASE

Basically Available（基本可用）、Soft state（软状态）、Eventually consistent（最终一致）。

工程落地方式：TCC、Saga、本地消息表、最大努力通知——都是"**放弃强一致，换最终一致**"，手段不同而已。`,
  },
  {
    id: 'dist-tx-01',
    title: '分布式事务有哪些方案？',
    difficulty: 'hard',
    categoryId: 'distributed',
    tags: ['distributed', 'transaction'],
    order: 20,
    question: `对比 2PC、TCC、Saga、本地消息表、事务消息的实现与取舍。`,
    answer: `| 方案 | 一致性 | 侵入性 | 适用场景 |
|---|---|---|---|
| 2PC/XA | 强 | 低（依赖数据库） | 同一数据库厂商、短事务 |
| TCC | 强（业务级） | **高**（写 Try/Confirm/Cancel） | 资金、库存等核心链路 |
| Saga | 最终 | 中（写正向 + 补偿） | 长流程、跨服务编排 |
| 本地消息表 | 最终 | 中 | 已有事务型数据库，简单可靠 |
| 事务消息（RocketMQ） | 最终 | 低-中 | 已有 MQ 基础设施 |
| 最大努力通知 | 最终 | 低 | 对账、非核心通知 |

## 要点

- **2PC 的痛点**：同步阻塞、协调者单点、极端情况数据不一致，不适合长事务与高并发；
- **TCC 的三个坑**：① 必须处理**空回滚**（Try 未执行就来了 Cancel）；② **幂等**（Confirm/Cancel 可能重复）；③ **悬挂**（Cancel 比 Try 先到，需用防悬挂记录拦截）；
- **Saga**：无隔离性，中间状态对外可见，需要业务容忍或加语义锁；
- **本地消息表**：与业务写入同一本地事务 ⇒ 天然原子，靠定时任务补投，是**性价比最高**的方案；
- 绝大多数业务不需要强一致，**先把幂等与对账做好**比选型更重要。`,
  },
  {
    id: 'dist-id-01',
    title: '分布式 ID 生成方案怎么选？',
    difficulty: 'medium',
    categoryId: 'distributed',
    tags: ['distributed', 'database'],
    order: 30,
    question: `对比 UUID、数据库自增、号段模式、雪花算法，并说明各自的缺陷。`,
    answer: `| 方案 | 有序性 | 性能 | 缺陷 |
|---|---|---|---|
| UUID | 无序 | 高（本地生成） | 无序 ⇒ B+ 树随机写、页分裂；占 16 字节 |
| 数据库自增 | 严格递增 | 低（DB 瓶颈） | 单点、扩展难 |
| 号段模式（Leaf-segment） | 趋势递增 | 高 | 依赖 DB 发号，需双 buffer 防抖动 |
| 雪花算法（Snowflake） | 趋势递增 | 极高 | **时钟回拨**问题 |
| Redis INCR | 递增 | 高 | 依赖 Redis 可用性 |

## 雪花算法结构（64 bit）

\`\`\`text
1 bit 符号(0) | 41 bit 毫秒时间戳 | 10 bit 机器 ID | 12 bit 序列号
\`\`\`

- 41 bit 时间戳 ≈ 69 年；
- 每毫秒每机器 4096 个 ID ⇒ 单机理论 409 万 QPS。

## 时钟回拨怎么处理

1. 回拨幅度小（< 5ms）：**等待**到时间追上再生成；
2. 回拨幅度大：**拒绝服务并告警**（绝不可用回拨后的时间，否则 ID 重复）；
3. 更稳的做法：用 \`Leaf-snowflake\` 把 workerId 与时钟状态放 ZooKeeper，异常时**摘除节点**；
4. 或者干脆用「号段模式 + 雪花」组合：号段保证趋势递增与低依赖，雪花负责本地提速。

## 选型建议

- 单库单表、量小 ⇒ 自增即可；
- 分库分表、需要趋势递增主键 ⇒ **号段模式**（最省心）；
- 超高性能、能接受运维复杂度 ⇒ 雪花 + 时钟监控；
- 任何方案都要保证：**趋势递增**（对 B+ 树友好）+ **业务无依赖**（不要用 ID 表达业务语义）。`,
  },
];
