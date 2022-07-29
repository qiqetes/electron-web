import { DB } from "../helpers/init";
import { app } from "electron";
import { sendToast } from "../helpers/ipcMainActions";

class SettingsDataModel implements SettingsData {
  ask_graph_intro_video = true; // Mostrar popup de ajuste bicicleta en pantalla externa
  autoStartGymsScheduler = false; // Iniciar planificador de gimnasios automáticamente, C11
  C16 = false; // Aceleración generador MP4
  defaultRoom = 1;
  download_scheduled_training_classes = false;
  downloadsPath = app.getPath("userData") + "/Default/offline"; // Directorio de descarga de clases C1
  first_experience_status: "idle" = "idle"; // Ocultar primera experiencia first_experience_status
  gymsLogoPath = ""; // Archivo logo gimnasios C8
  maxDownloadsSize = 50; // Espacio máximo en GB ocupado por descargas C13
  offlineResolution: "hd" | "hq" = "hd"; // Calidad videos al descargar offline C9
  playerVolume = 1.0; // Volumen reproductor C7
  playOnlyOffline = false; // Siempre se trata de reproducir una clase offline desde el planificador play_only_offline_classes
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
    await DB.write();
  }

  getFromDb(): void {
    if (!DB.data) return;
    Object.assign(this, DB.data.settings);
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
      case "first_experience_status":
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        this.first_experience_status = value;
        break;
      case "C1":
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        this.downloadsPath = value;
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
      console.log(`Setting ${setting} saved`);
      this.saveToDb();
      sendToast("Preferencia guardada", null, 5);
    }
  }
}

export = SettingsDataModel;
