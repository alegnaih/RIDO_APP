// plugins/withMapbox.js
const { withProjectBuildGradle, withGradleProperties } = require('@expo/config-plugins');

module.exports = function withMapbox(config, { downloadsToken }) {
  // 1. Inject the token into android/gradle.properties safely
  config = withGradleProperties(config, (config) => {
    config.modResults.push({
      type: 'property',
      key: 'MAPBOX_DOWNLOADS_TOKEN',
      value: downloadsToken || '',
    });
    return config;
  });

  // 2. Inject the Maven repository into android/build.gradle
  config = withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      const buildGradle = config.modResults.contents;
      
      // Check if it's already there to prevent duplicates
      if (!buildGradle.includes('api.mapbox.com/downloads/v2/releases/maven')) {
        const mapboxRepo = `
        maven {
            url 'https://api.mapbox.com/downloads/v2/releases/maven'
            authentication {
                basic(BasicAuthentication)
            }
            credentials {
                username = 'mapbox'
                password = project.properties['MAPBOX_DOWNLOADS_TOKEN'] ?: ""
            }
        }
        `;

        // Inject the repository into the allprojects block
        config.modResults.contents = buildGradle.replace(
          /allprojects\s*\{\s*repositories\s*\{/,
          `allprojects {
    repositories {
        ${mapboxRepo}`
        );
      }
    }
    return config;
  });

  return config;
};