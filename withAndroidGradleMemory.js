const { withGradleProperties } = require('@expo/config-plugins');

module.exports = function withAndroidGradleMemory(config) {
  return withGradleProperties(config, (config) => {
    const jvmArgsKey = 'org.gradle.jvmargs';
    const newJvmArgs = '-Xmx4g -XX:MaxMetaspaceSize=1024m -Dfile.encoding=UTF-8';

    // Remove any existing jvmargs line to avoid duplicates
    config.modResults = config.modResults.filter(
      (item) => !(item.type === 'property' && item.key === jvmArgsKey)
    );

    // Add the new jvmargs line
    config.modResults.push({
      type: 'property',
      key: jvmArgsKey,
      value: newJvmArgs,
    });

    return config;
  });
};