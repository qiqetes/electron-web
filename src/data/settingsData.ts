import { sendToast } from "../helpers/ipcMainActions";
import { DB } from "../helpers/init";

class SettingsDataModel implements IndexableData {
  showSecondaryDisplay: boolean; // Mostrar Display secundario y pausar al inicio
  updated_to_life: boolean;
  first_experience_status: "idle"; // Ocultar primera experiencia first_experience_status
  downloadsPath: string; // Directorio de descarga de clases C1
  playerVolume: number; // Volumen reproductor C7
  gymsLogoPath: string; // Archivo logo gimnasios C8
  offlineResolution: "hd" | "hq"; // Calidad videos al descargar offline C9
  resolutionCreateMP4: "hd" | "hq"; // Calidad HD al generar mp4, C10
  autoStartGymsScheduler: boolean; // Iniciar planificador de gimnasios automáticamente, C11
  waitingMusicPath: string; // Archivo música en espera, waiting_music_file
  maxDownloadsSize: number; // Espacio máximo en GB ocupado por descargas C13
  playOnlyOffline: boolean; // Siempre se trata de reproducir una clase offline desde el planificador play_only_offline_classes
  download_scheduled_training_classes: boolean;
  C16: boolean; // Aceleración generador MP4
  videoHD: true;
  showMonitorView: boolean; // Mostrar vista monitor
  show_external_setup_video: boolean; // Mostrar video de ajuste en pantalla externa
  ask_graph_intro_video: boolean; // Mostrar popup de ajuste bicicleta en pantalla externa
  defaultRoom = 1;

  saveToDb: () => void = async () => {
    DB.data.settings = this;
    await DB.write();
  };

  getFromDb: () => void = () => {
    if (!DB.data.settings)
      throw new Error("SettingsData.getFromDb: DB.data.settings is null");
    Object.assign(this, DB.data.settings);
  };

  // Saves an old setting to new Settings
  saveSetting = (setting: string, value: any) => {
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
      DB.data.settings = this;
      this.saveToDb();
      sendToast("Preferencia guardada", null, 5);
    }
  };
}

export const SettingsData = new SettingsDataModel();
