import { app, ipcMain } from "electron";
import { DB, DownloadsData } from "../helpers/init";
import { informSettingState, sendToast } from "../helpers/ipcMainActions";
import { log, logError } from "../helpers/loggers";
import { defaultDownloadsPath } from "../helpers/downloadsHelpers";
import path from "path";
import fs from "fs";
import { mainWindow } from "../index";

class SettingsDataModel implements SettingsData {
  ask_graph_intro_video = true; // Mostrar popup de ajuste bicicleta en pantalla externa
  autoStartGymsScheduler = false; // Iniciar planificador de gimnasios automáticamente, C11
  C16 = false; // Aceleración generador MP4
  defaultRoom = 1;
  download_scheduled_training_classes = true;
  downloadsPath = path.join(app.getPath("userData"), "Default", "offline"); // Directorio de descarga de clases C1
  gymsLogoPath = ""; // Archivo logo gimnasios C8
  maxDownloadsSize = 50; // Espacio máximo en GB ocupado por descargas C13
  offlineResolution: "hd" | "hq" = "hd"; // Calidad videos al descargar offline C9
  playerVolume = 1.0; // Volumen reproductor C7
  playOnlyOffline = true; // Siempre se trata de reproducir una clase offline desde el planificador play_only_offline_classes
  resolutionCreateMP4: "hd" | "hq" = "hq"; // Calidad HD al generar mp4, C10
  show_external_setup_video = false; // Mostrar video de ajuste en pantalla externa
  showMonitorView = false; // Mostrar vista monitor
  showSecondaryDisplay = false; // Mostrar Display secundario y pausar al inicio
  updated_to_life = false;
  videoHD = true;
  waitingMusicPath = ""; // Archivo música en espera, waiting_music_file

  async saveToDb(): Promise<void> {
    if (!DB.data) return;
    DB.data.settings = this;
  }

  init(): void {
    this.ask_graph_intro_video = true; // Mostrar popup de ajuste bicicleta en pantalla externa
    this.autoStartGymsScheduler = false; // Iniciar planificador de gimnasios automáticamente, C11
    this.C16 = false; // Aceleración generador MP4
    this.defaultRoom = 1;
    this.download_scheduled_training_classes = false;
    this.downloadsPath = path.join(
      app.getPath("userData"),
      "Default",
      "offline"
    ); // Directorio de descarga de clases C1
    this.gymsLogoPath = ""; // Archivo logo gimnasios C8
    this.maxDownloadsSize = 50; // Espacio máximo en GB ocupado por descargas C13
    this.offlineResolution = "hd"; // Calidad videos al descargar offline C9
    this.playerVolume = 1.0; // Volumen reproductor C7
    this.playOnlyOffline = false; // Siempre se trata de reproducir una clase offline desde el planificador play_only_offline_classes
    this.resolutionCreateMP4 = "hq"; // Calidad HD al generar mp4, C10
    this.show_external_setup_video = false; // Mostrar video de ajuste en pantalla externa
    this.showMonitorView = false; // Mostrar vista monitor
    this.showSecondaryDisplay = false; // Mostrar Display secundario y pausar al inicio
    this.updated_to_life = false;
    this.videoHD = true;
    this.waitingMusicPath = "";
  }

  getFromDb(): void {
    if (!DB.data) return;
    if (DB.data.settings) Object.assign(this, DB.data.settings);
    this.ensureDownloadsPathExists();
  }

  // Saves an old setting to new Settings
  saveSetting(setting: string, value: any): void {
    let validSetting = true;
    switch (setting) {
      case "default_room":
        this.defaultRoom = value;
        break;
      case "updated_to_life":
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        this.updated_to_life = value;
        break;
      case "C1":
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        // THIS SETTING IS HANDLED DIFFERENTLY
        log("Downloads path changed to: " + this.downloadsPath);
        break;
      case "C7":
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        this.playerVolume = value;
        break;
      case "C8":
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        this.gymsLogoPath = value;
        break;
      case "C9":
        this.offlineResolution = value == "1" ? "hd" : "hq";
        break;
      case "C10":
        this.resolutionCreateMP4 = value == "1" ? "hd" : "hq";
        break;
      case "C11":
        this.autoStartGymsScheduler = value == "1";
        break;
      case "C13": {
        const prevSize = this.maxDownloadsSize;
        this.maxDownloadsSize = parseInt(value);
        if (prevSize < this.maxDownloadsSize) {
          DownloadsData.startDownloads();
        }
        break;
      }
      case "waiting_music_file":
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        this.waitingMusicPath = value;
        break;
      case "C14":
        this.download_scheduled_training_classes = value == "1";
        break;
      case "videoHD":
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        this.videoHD = value; // TODO: recheck
        break;
      case "C22":
        this.showMonitorView = value == "1";
        break;
      case "show_external_setup_video":
        this.show_external_setup_video = value == "1";
        break;
      case "ask_graph_intro_video":
        this.ask_graph_intro_video = value == "1";
        break;
      default:
        validSetting = false;
        break;
    }

    if (validSetting) {
      log(`Setting ${setting} saved`);
      this.saveToDb();
    }
  }

  ensureDownloadsPathExists(): void {
    if (!fs.existsSync(this.downloadsPath)) {
      logError("Downloads path does not exist", this.downloadsPath);

      if (!fs.existsSync(defaultDownloadsPath())) {
        fs.mkdirSync(defaultDownloadsPath());
      }
      this.downloadsPath = defaultDownloadsPath();
      DB.data!.downloads = {
        offlineTrainingClasses: {},
        trainingClassesScheduled: [],
        isDownloading: false,
        hasAdjustVideo: false,
      };
    }

    ipcMain.once("mainLoaded", async () => {
      const webDownloadsPath = await this.getWebSetting("C1");
      if (webDownloadsPath !== this.downloadsPath) {
        informSettingState("C1", this.downloadsPath);
      }
    });
  }

  async getWebSetting(settingCode: string): Promise<any> {
    const settingsRaw = await mainWindow.webContents.executeJavaScript(
      `localStorage.getItem("settings");`,
      true
    );
    const settings = JSON.parse(settingsRaw);
    return settings[settingCode] ?? null;
  }
}

export = SettingsDataModel;
