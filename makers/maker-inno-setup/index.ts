const { MakerBase, MarkerOptions } = require("@electron-forge/maker-base");
const fs = require("fs-extra");
const path = require("path");

const { spawnSync, execSync } = require("child_process");
const { zip } = require("cross-zip");
const { promisify } = require("util");

class MakerInnoSetup extends MakerBase {
  name = "InnoSetup";
  defaultPlatforms = ["win32"];
  platforms = ["win32"];

  isSupportedOnCurrentPlatform() {
    return true;
    this.isInstalled("electron-winstaller");
  }
  async make({ dir, makeDir, targetArch, packageJSON, appName, forgeConfig }) {
    const outPath = path.resolve(
      makeDir,
      `innosetup/${targetArch}/${packageJSON.version}`
    );
    await this.ensureDirectory(outPath);

    const innoSetupScript =
      targetArch === "ia32" ? "innosetup32.iss" : "innosetup64.iss";
    const exe = `SetupBestcycling${targetArch === "ia32" ? "32" : "64"}`;
    const updater = `update-win${targetArch === "ia32" ? "32" : "64"}`;
    const innoSetupConfig = {
      name: "Bestcycling",
      innoSetupScript,
      outputDirectory: outPath,
      exe: exe,
      updater: updater,
      ...this.config,
    };

    await createWindowsInstaller(innoSetupConfig);

    await signWindowsInstaller(innoSetupConfig);

    await packagingWindowsUpdater(innoSetupConfig);

    const artifacts = [
      path.resolve(outPath, `${exe}.exe`),
      path.resolve(outPath, `${updater}.zip`),
    ];

    return artifacts;
  }
}

async function createWindowsInstaller(config) {
  const cmd = "C:\\Program Files (x86)\\Inno Setup 6\\ISCC.exe";

  const args = [
    `/O${config.outputDirectory}`,
    `/F${config.exe}`,
    config.innoSetupScript,
  ];

  console.info("building...");
  return spawnSync(cmd, args, { stdio: "pipe" });
}

async function signWindowsInstaller(config) {
  const cmd = "signtool.exe";

  let args = [
    "sign",
    // config.signParams,
    "/tr",
    "http://timestamp.digicert.com",
    "/td",
    "SHA256",
    "/fd",
    "SHA256",
    path.resolve(config.outputDirectory, `${config.exe}.exe`),
  ].filter((a) => a);

  console.info("signing...");

  const signResult = spawnSync(cmd, args, { stdio: "pipe" });
  console.info(signResult.output.toString());
  if (!signResult.output.toString().includes("Successfully signed")) {
    throw `No se ha podido firmar.\n${signResult.output.toString()}`;
  }

  args = [
    "verify",
    "/pa",
    path.resolve(config.outputDirectory, `${config.exe}.exe`),
  ];
  console.info("validating...");
  const validateResult = spawnSync(cmd, args, { stdio: "pipe" });
  console.info(validateResult.output.toString());
  if (!validateResult.output.toString().includes("Successfully verified")) {
    throw `No se ha podido validar la firma.\n${validateResult.output.toString()}`;
  }
}

async function packagingWindowsUpdater(config) {
  console.info("compressing...");
  const source = path.resolve(config.outputDirectory, `${config.exe}.exe`);
  const tmpdir = path.resolve(config.outputDirectory, "temp");
  const temp = path.resolve(tmpdir, `Bestcycling TV.exe`);
  const updater = path.resolve(config.outputDirectory, `${config.updater}.zip`);

  if (!fs.existsSync(tmpdir)) {
    fs.mkdirSync(tmpdir);
  }
  fs.copyFileSync(source, temp);
  await promisify(zip)(tmpdir, updater);

  if (fs.existsSync(tmpdir)) {
    fs.rmdirSync(tmpdir, { recursive: true, maxRetries: 3 });
  }
}

exports.default = MakerInnoSetup;
