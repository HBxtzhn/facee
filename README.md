# FaceE

本地优先的程序员面试题库 App：从 **GitHub 题库仓库**下载完整题库 ZIP，安装到手机后**完全离线**按分类 / 标签 / 难度刷题，支持复杂 Markdown、参考答案、面试官追问、正文全文搜索、收藏与连续刷题。

**当前版本：v1.0.0 · 仅 Android**

- 需求与实现方案：[`docs/FaceE-实现方案.md`](docs/FaceE-实现方案.md)（对照 PRD §1–§33）
- 题库契约：[`docs/题库规范-v1.md`](docs/题库规范-v1.md)
- 题库数据仓库：**https://github.com/HBxtzhn/facee-bank**
- 安装包下载：[Releases](https://github.com/HBxtzhn/facee/releases/latest)

## 技术栈

```text
expo 57 · react-native 0.86 · react-navigation · expo-file-system
react-native-markdown-display + markdown-it · zustand · async-storage
react-native-zip-archive（原生解压）
```

## 目录

```text
app/                     expo 入口（App.tsx / index.ts）
src/screens/             首页 / 题目列表 / 题目详情 / 收藏 / 我的 / 题库安装
src/question-bank/       题库领域层：安装管线、校验、检索、追问解析（可单测）
src/store/               zustand：刷题进度、收藏、用户设置
src/components/          通用组件（含全屏图片查看器）
src/lib/                 Markdown 解析配置、缩放数学等纯逻辑
plugins/                 Expo config plugin（发布包只打 arm64）
packages/bank-spec/      ★ 题库规范的可执行实现：生成器 + 校验器 + 恶意包 fixtures
docs/                    实现方案 + 题库规范
```

## 开发

```bash
npm ci
npm run typecheck     # tsc --noEmit
npm test              # jest：15 suites / 100 tests
npm start             # 需要 dev build（原生解压模块无法在 Expo Go 运行）
```

首次运行前把题库地址写进 `.env`（可参考 `.env.example`），或在 App 内「我的」页填写。

## Android 打包（发布包只打 arm64）

默认模板会把 4 个 ABI 全打进包 —— 同一套 18 个 `.so` 重复四遍，实测 release APK **85.8 MB**，
其中原生库 67.6 MB（84%），而手机只需要 arm64 那 18 MB。本仓库通过
`plugins/withAndroidArm64Release.js`（config plugin）把 `reactNativeArchitectures`
收敛为 `arm64-v8a`，**APK 降到 31 MB**。

```bash
# 正式发布包（默认 arm64-v8a）
cd android && ./gradlew assembleRelease

# 在 x86_64 模拟器上验收 release 包
cd android && ./gradlew assembleRelease -PreactNativeArchitectures=x86_64

# 模拟器上跑 debug（开发日常）
ORG_GRADLE_PROJECT_reactNativeArchitectures=x86_64,arm64-v8a npx expo run:android
```

> 环境要求：JDK 21、Android SDK、NDK `27.1.12297006`、build-tools `35.0.0`。
> 若 `android/` 不存在，先 `npx expo prebuild --platform android`。

## 题库侧工具链（packages/bank-spec）

```bash
cd packages/bank-spec
node generate.mjs --profile sample --out ../FaceBank --zip dist/sample-bank.zip   # 生成题库
node generate.mjs --profile malicious --out dist/fixtures                          # 生成恶意包并回归
node generate.mjs --verify ~/Downloads/main.zip --verbose                          # 校验任意 ZIP
```

`lib/zip.mjs` 的 `readCentralDirectory()` 是方案 §7「结构预检」的实现：
不解压即可枚举条目名、加密位、压缩方式与原始大小 —— 安全模型的第一道闸。

## 已实现（对照 PRD）

题库安装与更新（§15/§24/§25 原子安装、ZIP 安全四道闸）· 首页分类与继续学习（§5）·
列表搜索/难度/标签筛选（§6，含**正文全文搜索** §6.2）· 题目详情与全元素 Markdown（§7）·
参考答案（§8）· 面试官追问（§9）· 关联题跳转（§10）· 外链（§11）· 连续刷题（§12）·
收藏（§13）· 我的与题库管理（§14）· 图片渲染与全屏缩放（§21）· 离线（§26）· 本地数据（§27）

未实现/待办：正式真题内容、题库版本号与更新时间展示（§14.2）、iOS。
