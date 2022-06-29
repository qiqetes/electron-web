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
import { showModal } from "./ipcMainActions";

const isNewVersionNuber = (actual: string, incoming: string) => {
  for (let i = 0; i < 3; i++) {
    const act = actual.split(".")[i];
    const inc = incoming.split(".")[i];

    if (inc > act) return true;
  }
  return false;
};

// TODO: esta función apunta a partes temporales de s3, cambiarlo cuando esté decidido.
export const setAutoUpdater = async () => {
  // AVOID TO RUN THE AUTOUPDATER THE FIRST TIME THE APP RUNS IN WINDOWS BY ALL MEANS
  if (AppData.FIRST_TIME_IT_RUNS) return;

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

  const resManifest = await axios.get(
    "https://s3-eu-west-1.amazonaws.com/bestcycling-production/desktop/qiqe-temp/manifest.json"
  );

  const manifest: UpdateManifest = resManifest.data;

  if (isNewVersionNuber(projectInfo.version, manifest.version)) {
    const version = manifest.version;
    log(`HAY UNA UPDATE DISPONIBLE: ${version}`);

    let platform: string = os.platform();
    const arch = os.arch();

    if (platform == "darwin") platform = "mac64";
    else if (platform == "win32") platform = "win" + arch.substring(1);

    const updateUrl = manifest.packages[platform].url;

    const tempPath = path.join(app.getPath("temp"), "updateVersion");

    const setAutoUpdater = () => {
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
      registerAutoUpdaterEvents();
    };

    download(tempPath, "update.zip", updateUrl, setAutoUpdater);
  }
};

const registerAutoUpdaterEvents = () => {
  autoUpdater.on("error", (err) => {
    logError(err);
  });

  autoUpdater.on("checking-for-update", () =>
    log("Checking if the update is valid")
  );

  autoUpdater.on("update-available", () => {
    log("Update available, updating");
    showModal(
      "Hay disponible una nueva versión de la aplicación ¿Desea actualizar?",
      "Sí",
      "No, gracias",
      () => autoUpdater.quitAndInstall()
    );
  });

  autoUpdater.on("update-not-available", () => logWarn("Update not available"));

  autoUpdater.on("update-downloaded", () =>
    log("Update downloaded, ready for install")
  );
};
