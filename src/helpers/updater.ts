import { app, autoUpdater } from "electron";
import projectInfo from "../../package.json";
import path from "path";
import { AppData } from "../../src/data/appData";
import axios from "axios";
import os from "os";
import { log, logError, logWarn } from "./loggers";
import fs from "fs";
import { download } from "./downloadsHelpers";
import url from "url";
import { sendToast, showModal } from "./ipcMainActions";

type Pckg = { url: string };

type UpdateManifest = {
  name: string;
  version: string;
  description: string;
  manifestUrl: string;
  packages: {
    [bar: string]: Pckg;
  };
};

const isNewVersionNuber = (actual: string, incoming: string) => {
  for (let i = 0; i < 3; i++) {
    const act = actual.split(".")[i];
    const inc = incoming.split(".")[i];

    if (inc > act) return true;
  }
  return false;
};

const registerAutoUpdaterEvents = () => {
  autoUpdater.on("error", (err) => {
    logError("Registering auto updater events", err);
  });

  autoUpdater.on("checking-for-update", () =>
    log("Checking if the update is valid")
  );

  autoUpdater.on("update-available", () => {
    log("Update available, updating");
    sendToast("Se ha encontrado una actualización. Descargando...");

    autoUpdater.quitAndInstall();
  });

  autoUpdater.on("update-not-available", () => logWarn("Update not available"));

  autoUpdater.on("update-downloaded", () =>
    log("Update downloaded, ready for install")
  );
};

// TODO: esta función apunta a partes temporales de s3, cambiarlo cuando esté decidido.
// TODO: anyadir tags para que se mire a diferentes manifest
/**
 * Sets the autoUpdater to check the s3 manifest and check wether there are updates
 * to be downloaded.
 * */
export const setAutoUpdater = async () => {
  // AVOID TO RUN THE AUTOUPDATER THE FIRST TIME THE APP RUNS IN WINDOWS BY ALL MEANS
  // if (AppData.FIRST_TIME_IT_RUNS) return;

  const resManifest = await axios.get(
    "https://s3-eu-west-1.amazonaws.com/bestcycling-production/desktop/qiqe-temp/manifest.json"
  );

  const manifest: UpdateManifest = resManifest.data;

  if (!isNewVersionNuber(projectInfo.version, manifest.version)) return;

  const version = manifest.version;
  if (isUpdateAlreadyDownloaded(version)) {
    log("Update already downloaded, installing");
    autoUpdater.quitAndInstall();
  }
  log(`THERE IS AN UPDATE AVAILABLE: ${version}`);

  let platform: string = os.platform();

  if (platform == "darwin") platform = "mac64";

  const updateUrl = manifest.packages[platform]?.url;
  if (!updateUrl) {
    logError(
      `The update is not available for this platform, you should check either if it wasn't uploaded yet or this platform is not supported. (platform: ${platform})`
    );
    return;
  }

  const tempPath = path.join(app.getPath("temp"), "updateVersion");

  const setAutoUpdaterMac = () => {
    // We need to manually create a feed.json file with a `url` key that points to our local `.zip` update file.
    const json = {
      url: url.pathToFileURL(path.join(tempPath, "update.zip")).href,
    };

    fs.writeFileSync(tempPath + "/feed.json", JSON.stringify(json));
    console.log("file://" + tempPath + "/feed.json");

    autoUpdater.setFeedURL({
      url: url.pathToFileURL(path.join(tempPath, "feed.json")).href,
    });

    autoUpdater.checkForUpdates();
  };

  const setAutoUpdaterWin = async () => {
    download(
      tempPath,
      "RELEASES",
      "https://s3-eu-west-1.amazonaws.com/bestcycling-production/desktop/qiqe-temp/RELEASES",
      () => {
        AppData.LAST_VERSION_DOWNLOADED = version;
        autoUpdater.setFeedURL({ url: tempPath });
        autoUpdater.checkForUpdates();
      }
    );
  };

  registerAutoUpdaterEvents();
  if (os.platform() == "darwin") {
    download(tempPath, "update.zip", updateUrl, setAutoUpdaterMac);
  } else if (os.platform() == "win32") {
    download(tempPath, "update.nupkg", updateUrl, setAutoUpdaterWin);
  }
};

const isUpdateAlreadyDownloaded = (ver: string) => {
  if (AppData.LAST_VERSION_DOWNLOADED == ver) {
    // Check if the file already exists
    const tempPath = path.join(app.getPath("temp"), "updateVersion");
    const filename = os.platform() == "darwin" ? "update.zip" : "update.nupkg";
    return fs.existsSync(path.join(tempPath, filename));
  }
  AppData.LAST_VERSION_DOWNLOADED = null;
  return false;
};
