require("dotenv").config();
// const makeUniversalApp = require("@electron/universal").makeUniversalApp;
const packageJson = require(__dirname + "/package.json");
const { version } = packageJson;

module.exports = {
  packagerConfig: {
    icon: "./assets/app-icon.ico",
    appBundleId: "com.nw-builder.bestcyclingtv",
    osxSign: {
      identity: "Developer ID Application: Bestcycling SL (YMCHSA4437)",
      entitlements: "./process/entitlements.plist",
      "entitlements-inherit": "./process/entitlements.plist",
      hardenedRuntime: true,
    },
    extraResource: "bin/",
    osxUniversal: {
      x64ArchFiles: "Contents/Resources/{bin/mac/ffmpeg,app/.webpack/native_modules/lib/mac/native/binding.node}",
      force: true,
    },

    // Commenting out this object will disable code signing for OS X.
    // osxNotarize: {
    //   appBundleId: "com.nw-builder.bestcyclingtv",
    //   appleId: process.env.APPLE_ID,
    //   appleIdPassword: process.env.APPLE_ID_PASSWORD,
    //   ascProvider: "YMCHSA4437",
    // },
  },
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        name: "BestcyclingTV",
      },
    },
    {
      name: "@electron-forge/maker-dmg",
      config: {
        icon: "./assets/app-icon.ico",
      },
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: ["darwin"],
    },
  ],
  publishers: [
    {
      name: "@electron-forge/publisher-s3",
      config: {
        bucket: "bestcycling-production",
        folder: `desktop/versions/v${version}`,
        public: true,
        keyResolver: (fileName, platform, arch) => {
          return `desktop/versions/v${version}/${arch}/${fileName}`;
        },
      },
    },
  ],
  plugins: [
    {
      name: "@electron-forge/plugin-webpack",
      config: {
        // Electron in development mode launches its own development server where it loads the renderer index.html
        // this option allows to do the fetch to localhost without content security policy errors
        devContentSecurityPolicy:
          "default-src 'self' 'unsafe-inline' http://localhost:8080 https://2.bestcycling.com https://bestcycling.com data:; script-src 'self' 'unsafe-eval' 'unsafe-inline' data:",
        mainConfig: "./webpack.main.config.js",
        renderer: {
          config: "./webpack.renderer.config.js",
          entryPoints: [
            {
              preload: {
                js: "./src/preload.ts",
              },
              html: "./src/renderer/index.html",
              js: "./src/renderer/index.ts",
              name: "main_window",
            },
          ],
        },
      },
    },
  ],
};
