const { withAppBuildGradle, withGradleProperties } = require('@expo/config-plugins');

/**
 * Android 发布包只打 arm64-v8a，把 debug/验收用的 ABI 留给命令行按需打开。
 *
 * ## 为什么需要它
 * 默认 `gradle.properties` 的 `reactNativeArchitectures` 含四个 ABI
 * （armeabi-v7a,arm64-v8a,x86,x86_64），同一套 18 个 .so 会被打进包四遍：
 * 实测 release APK 85.8MB，其中原生库 67.6MB（84%），手机只需要其中 arm64 那 17.9MB。
 *
 * ## 为什么不是给 buildType 加 ndk.abiFilters
 * 试过：在 `buildTypes.release` 里注入 `ndk { abiFilters 'arm64-v8a' }` **不生效** ——
 * React Native 的 gradle 插件会把 ABI 列表写进 `defaultConfig.ndk.abiFilters`，
 * 而 buildType 上的过滤与 defaultConfig 是**并集**，减不掉任何 ABI（实测仍产出 85.8MB）。
 * 真正的总开关是 `reactNativeArchitectures` 这个 gradle 属性，所以这里改它。
 *
 * ## 为什么用 config plugin
 * `android/` 是 prebuild 产物（在 .gitignore 里），手改会在下次 `expo prebuild` 时丢失。
 *
 * ## 开发/验收时怎么把模拟器 ABI 打开
 * Gradle 支持用环境变量覆盖属性，无需改文件：
 *   # 在 x86_64 模拟器上跑 debug（开发日常）
 *   ORG_GRADLE_PROJECT_reactNativeArchitectures=x86_64,arm64-v8a npx expo run:android
 *   # 在模拟器上验收 release 包
 *   cd android && ./gradlew assembleRelease -PreactNativeArchitectures=x86_64
 *   # 出正式发布包（默认值即可）
 *   cd android && ./gradlew assembleRelease
 * 需要兼容极老设备时，把下面的值改成 'arm64-v8a,armeabi-v7a'（+12.5MB）。
 */

const RELEASE_ARCHITECTURES = 'arm64-v8a';

const withAndroidArm64Release = (config) => {
  // 1) 总开关：决定编译与打包哪些 ABI
  config = withGradleProperties(config, (gradleConfig) => {
    const key = 'reactNativeArchitectures';
    const existing = gradleConfig.modResults.find(
      (item) => item.type === 'property' && item.key === key,
    );
    if (existing) {
      existing.value = RELEASE_ARCHITECTURES;
    } else {
      gradleConfig.modResults.push({ type: 'property', key, value: RELEASE_ARCHITECTURES });
    }
    return gradleConfig;
  });

  // 2) 兜底断言：万一 RN 模板将来改了默认值，也让 release 的 ABI 过滤显式可见
  config = withAppBuildGradle(config, (gradleConfig) => {
    if (gradleConfig.modResults.language !== 'groovy') {
      throw new Error('withAndroidArm64Release 只支持 groovy 版 build.gradle');
    }
    let contents = gradleConfig.modResults.contents;
    if (contents.includes('facee.releaseAbis')) return gradleConfig;

    const anchor = '        release {\n';
    if (!contents.includes(anchor)) {
      throw new Error('withAndroidArm64Release: 未找到 buildTypes.release 区块，Android 模板可能已变更');
    }
    const injection = [
      `            // 由 plugins/withAndroidArm64Release.js 注入；真正的开关是 gradle.properties`,
      `            // 里的 reactNativeArchitectures（见该插件注释说明）。`,
      `            def faceeReleaseAbis = (findProperty('reactNativeArchitectures') ?: '${RELEASE_ARCHITECTURES}')`,
      `            ndk { abiFilters(*faceeReleaseAbis.split(',')) }`,
      ``,
    ].join('\n');
    gradleConfig.modResults.contents = contents.replace(anchor, anchor + injection);
    return gradleConfig;
  });

  return config;
};

module.exports = withAndroidArm64Release;
