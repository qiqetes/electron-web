import { app, autoUpdater, BrowserWindow, ipcMain } from "electron";
import projectInfo from "../../package.json";
import path from "path";
import { AppData } from "../../src/data/appData";
import axios from "axios";
import os from "os";
import { log, logError, logWarn } from "./loggers";
import fs from "fs";
import { download } from "./downloadsHelpers";
import url from "url";
import { sendToast, sendUpdaterEvent } from "./ipcMainActions";

type Pckg = { url: string };

interface UpdateManifest {
  name: string;
  version: string;
  description: string;
  manifestUrl: string;
  packages: {
    [bar: string]: Pckg;
  };
}
interface UpdateData {
  data: {
    type: string;
    attributes: {
      url: string,
      version: string,
      plattform: string
    };
  }
}

const isNewVersionNuber = (actual: string, incoming: string) => {
  for (let i = 0; i < 3; i++) {
    const act = parseInt(actual.split(".")[i]);
    const inc = parseInt(incoming.split(".")[i]);

    if (inc > act) return true;
    if (act > inc) return false;
  }
  return false;
};

const registerAutoUpdaterEvents = () => {
  autoUpdater.on("error", (err) => {
    logError("Registering auto updater events", err);
    sendUpdaterEvent({ type: "update_error", error: err.toString() });
  });

  autoUpdater.on("checking-for-update", () =>
    log("Checking if the update is valid")
  );

  autoUpdater.on("update-available", () => {
    log("Update available, updating");
    sendUpdaterEvent({ type: "update_installing" });
  });

  autoUpdater.on("update-not-available", () => logWarn("Update not available"));

  autoUpdater.on(
    "update-downloaded",
    (_, releaseNotes, releaseName, releaseDate, updateUrl) => {
      log("Update downloaded, ready for install");
      log("Release notes: ", releaseNotes);
      log("Release name: ", releaseName);
      log("Release date: ", releaseDate);
      log("Update url: ", updateUrl);
      sendToast("Instalando actualización. Se reiniciará la aplicación...");
      try {
        // https://github.com/electron-userland/electron-builder/issues/6120
        setImmediate(() => {
          app.removeAllListeners("window-all-closed");
          const browserWindows = BrowserWindow.getAllWindows();
          log(
            `closing ${browserWindows.length} BrowserWindows for autoUpdater.quitAndInstall`
          );
          for (const browserWindow of browserWindows) {
            browserWindow.close();
          }
          autoUpdater.quitAndInstall();
        });
      } catch (err) {
        logError("Installing update", err);
        sendUpdaterEvent({
          type: "update_error",
          error: err?.toString() || "Error installing update",
        });
      }
    }
  );
};

const getMostUpdatedManifest = async (allowedChannels: {
  revision: boolean | undefined;
  beta: boolean | undefined;
}): Promise<UpdateManifest | null> => {

  const manifestRevision = allowedChannels.revision
    ? await getManifest('revision')
    : null;
  const manifestBeta = allowedChannels.beta
    ? await getManifest('beta')
    : null;
  const manifestProduction = (
    await axios.get<UpdateManifest>(
      "https://s3-eu-west-1.amazonaws.com/bestcycling-production/desktop/production/manifest.json" // TODO: change to production
    )
  ).data;

  return [manifestRevision, manifestBeta, manifestProduction]
    .filter((man) => man != null)
    .reduce((prev, curr) => {
      if (prev == null) return curr;
      if (curr == null) return prev;
      if (isNewVersionNuber(prev.version, curr.version)) return curr;
      return prev;
    });
};

const getManifest = async (channel: 'beta' | 'revision' | 'production'):Promise<UpdateManifest|null> => {
  try{
    const manifest = (
      await axios.get<UpdateManifest>(
        `https://s3-eu-west-1.amazonaws.com/bestcycling-production/desktop/${channel}/manifest.json`
      )
    ).data;
    return manifest;
  }
  catch(err){
    logError("Error getting manifest", err);
    return null;
  }
}

/**
 * Sets the autoUpdater to check the s3 manifest and check wether there are updates
 * to be downloaded.
 * */
export const setAutoUpdater = async () => {
  const config = {
    headers: {
      "Content-Type": "application/vnd.api+json",
      "X-APP-ID": AppData.XAPPID,
      Authorization: AppData.AUTHORIZATION,
      "User-Agent": AppData.USER_AGENT ?? app.userAgentFallback,
    },
  };
  const desktopUpdate = (await axios.get<UpdateData>(`${AppData.API}/desktop_updaters`,config)).data;

  const version = desktopUpdate?.data?.attributes?.version;
  const updateUrl = desktopUpdate?.data?.attributes?.url;
  if(updateUrl === undefined || updateUrl == ""){
    return;
  }
  const tempPath = path.join(app.getPath("temp"), "updateVersion");
  const setAutoUpdaterMac = () => {

    if (!app.isInApplicationsFolder()) {
      logError("Tried updating from a non-app folder, aborting");
      sendUpdaterEvent({
        type: "update_error",
        error:
          "Por favor, instala la aplicación arrastrándola a la carpeta de aplicaciones",
      });
      sendToast(
        "Por favor, instala la aplicación arrastrándola a la carpeta de aplicaciones"
      );
      return;
    }

    // We need to manually create a feed.json file with a `url` key that points to our local `.zip` update file.
    const json = {
      url: url.pathToFileURL(path.join(tempPath, "update.zip")).href,
    };

    fs.writeFileSync(tempPath + "/feed.json", JSON.stringify(json));

    autoUpdater.setFeedURL({
      url: url.pathToFileURL(path.join(tempPath, "feed.json")).href,
    });

    autoUpdater.checkForUpdates();
  };

  const setAutoUpdaterWin = async () => {
    // In windows we need to avoid running an update the first time the app runs
    const cmd = process.argv[1];
    if (cmd == "--squirrel-firstrun") {
      sendUpdaterEvent({
        type: "update_error",
        error:
          "Por favor reinicia la aplicación para instalar la actualización",
      });
      return;
    }

    log("RELEASES downloaded in temp folder", tempPath);
    fs.readFile(path.join(tempPath, "RELEASES"), "utf8", (err, data) => {
      if (err) {
        logError("Reading RELEASES file", err);
        return;
      }
      const nupkgName = data.split(" ")[1];

      const updateDirTem = updateUrl.split('/');
      updateDirTem.pop();
      const updateDir = updateDirTem.join('/');
      log("NUPKG NAME:", nupkgName, "update Dir ",updateDir);

      download(
        tempPath,
        nupkgName,
        `${updateDir}/${nupkgName}`,
        () => {
          log("NUPKG downloaded in temp folder", tempPath);
          autoUpdater.setFeedURL({
            url: tempPath,
          });
          autoUpdater.checkForUpdates();
          AppData.LAST_VERSION_DOWNLOADED = version;
        },
        (percentage) =>
          sendUpdaterEvent({ type: "update_downloading", progress: percentage })
      );
    });
  };

  registerAutoUpdaterEvents();
  sendUpdaterEvent({ type: "update_found", version });
  if (os.platform() == "darwin") {
    download(
      tempPath,
      "update.zip",
      updateUrl,
      setAutoUpdaterMac,
      (percentage) =>
        sendUpdaterEvent({ type: "update_downloading", progress: percentage })
    );
  } else if (os.platform() == "win32") {
    download(tempPath, "RELEASES", updateUrl, setAutoUpdaterWin);
  }
};

/**
 * @deprecated since the update is now always installed
 * */
export const isUpdateAlreadyDownloaded = (ver: string) => {
  if (AppData.LAST_VERSION_DOWNLOADED == ver) {
    // Check if the file already exists
    const tempPath = path.join(app.getPath("temp"), "updateVersion");
    const filename = os.platform() == "darwin" ? "update.zip" : "update.nupkg";
    return fs.existsSync(path.join(tempPath, filename));
  }
  AppData.LAST_VERSION_DOWNLOADED = null;
  return false;
};
