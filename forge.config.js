module.exports = {
  packagerConfig: {
    icon: "./assets/app-icon.ico",
    appBundleId: "com.nw-builder.bestcyclingtv",
    osxSign: {
      identity: "Developer ID Application: Bestcycling SL (YMCHSA4437)",
      entitlements: "./process/entitlements.plist",
      "entitlements-inherit": "./process/entitlements.plist",
    },
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
    {
      name: "@electron-forge/maker-deb",
      config: {},
    },
    {
      name: "@electron-forge/maker-rpm",
      config: {},
    },
  ],
  publishers: [
    {
      name: "@electron-forge/publisher-s3",
      config: {
        bucket: "bestcycling-production",
        folder: "desktop/qiqe-temp",
        public: true,
      },
    },
  ],
  plugins: [
    [
      "@electron-forge/plugin-webpack",
      {
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
    ],
  ],
};
