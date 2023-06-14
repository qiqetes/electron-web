import { app, autoUpdater, BrowserWindow, dialog, ipcMain } from "electron";
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
import extract from "extract-zip";
import { spawn } from "child_process";

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
      url: string;
      version: string;
      plattform: string;
    };
  };
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
    ? await getManifest("revision")
    : null;
  const manifestBeta = allowedChannels.beta ? await getManifest("beta") : null;
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

const getManifest = async (
  channel: "beta" | "revision" | "production"
): Promise<UpdateManifest | null> => {
  try {
    const manifest = (
      await axios.get<UpdateManifest>(
        `https://s3-eu-west-1.amazonaws.com/bestcycling-production/desktop/${channel}/manifest.json`
      )
    ).data;
    return manifest;
  } catch (err) {
    logError("Error getting manifest", err);
    return null;
  }
};

export const getUpdateManifest = async () => {
  const config = {
    headers: {
      "Content-Type": "application/vnd.api+json",
      "X-APP-ID": AppData.XAPPID,
      Authorization: AppData.AUTHORIZATION,
      "User-Agent": AppData.USER_AGENT ?? app.userAgentFallback,
    },
  };

  const desktopUpdate = (
    await axios.get<UpdateData>(`${AppData.API}/desktop_updaters`, config)
  ).data;

  return desktopUpdate?.data?.attributes ?? {};
};

export const forceCheckForUpdate = async () => {
  const updateManifest = await getUpdateManifest();

  // const version = updateManifest?.version;
  const updateUrl = updateManifest?.url;

  if (updateUrl) {
    setAutoUpdater();
  } else {
    const dialogOpts = {
      type: "info",
      buttons: ["Aceptar"],
      title: "Application Update",
      // message: process.platform === "win32" ? releaseNotes : releaseName,
      message: "Actualmente, no hay actualizaciones disponibles.",
    };
    dialog.showMessageBox(dialogOpts);
  }
};

/**
 * Sets the autoUpdater to check the s3 manifest and check wether there are updates
 * to be downloaded.
 * */
export const setAutoUpdater = async () => {
  // console.table(AppData);
  if (AppData.USER === null) {
    log("No user, abort updater");
    return;
  }

  const updateManifest = await getUpdateManifest();
  const updateUrl = updateManifest?.url;
  const version = updateManifest?.version;

  if (!updateUrl) return;

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
    console.info("JSON", json);
    console.info(
      "URL",
      url.pathToFileURL(path.join(tempPath, "feed.json")).href
    );

    fs.writeFileSync(tempPath + "/feed.json", JSON.stringify(json));

    autoUpdater.setFeedURL({
      url: url.pathToFileURL(path.join(tempPath, "feed.json")).href,
    });

    autoUpdater.checkForUpdates();
  };

  const setAutoUpdaterWin = async () => {
    // TODO: en mac se pasa un zip y funciona bien, en windows no lo he conseguido.
    // const source = path.join(tempPath, "update.zip");
    // const target = path.join(tempPath, "Bestcycling TV.exe");
    // await extract(source, { dir: target });
    // spawn(target, ["/SILENT"], {
    //   detached: true,
    //   stdio: ["ignore", "ignore", "ignore"],
    // }).unref();

    // app.quit();
    // We need to manually create a feed.json file with a `url` key that points to our local `.zip` update file.
    const json = {
      url: url.pathToFileURL(path.join(tempPath, "update.zip")).href,
    };
    console.info("JSON", json);
    console.info(
      "URL",
      url.pathToFileURL(path.join(tempPath, "feed.json")).href
    );

    fs.writeFileSync(tempPath + "/feed.json", JSON.stringify(json));

    autoUpdater.setFeedURL({
      url: url.pathToFileURL(path.join(tempPath, "feed.json")).href,
    });

    autoUpdater.checkForUpdates();
  };

  registerAutoUpdaterEvents();
  sendUpdaterEvent({ type: "update_found", version });

  const downloadedCallback =
    os.platform() == "darwin"
      ? setAutoUpdaterMac
      : os.platform() == "win32"
      ? setAutoUpdaterWin
      : undefined;

  const downloadProgressCallback = (percentage: number) =>
    sendUpdaterEvent({ type: "update_downloading", progress: percentage });

  if (downloadedCallback) {
    download(
      tempPath,
      "update.zip",
      updateUrl,
      downloadedCallback,
      downloadProgressCallback
    );
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
