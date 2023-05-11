interface DownloadsData extends IndexableData, DownloadsDataDB {
  getFirstQueued: () => OfflineTrainingClass;
  stopDownloading: () => void;
  downloadNext: () => void;
  removeAll: () => void;
  importFromFolder: (folder: string) => void;
}
interface DownloadsDataDB {
  offlineTrainingClasses: { [id: string]: OfflineTrainingClass };
  trainingClassesScheduled: number[];
  isDownloading: boolean;
  hasAdjustVideo: boolean;
}

type downloadStatus =
  | "none" // won't be donwloaded, doesn't count as a download
  | "queued"
  | "downloading"
  | "downloaded"
  | "error";

type mediaType = "video_hd" | "video_sd" | "audio" | "music";
interface Media {
  type: mediaType;
  url: string;
  size: number;
}

type downloadRequest = {
  trainingClass: TrainingClass;
  mediaType: mediaType;
  timestamp: number | null;
};

type webappDownload = {
  id: string;
  downloadedMedia: {
    type: mediaType;
    progress: number;
    downloaded: boolean;
    downloading: boolean;
    queued: boolean;
  }[];
  trainingClass: TrainingClass;
  offline: boolean;
};

// The downloadsState that the webapp expects
// TODO: mejorar esto que es un desastre, pero se usa igual en toda la webapp
type downloadsStateWebapp = {
  /**
   * Devuelve si se está descargando alguna clase actualmente.
   */
  isDownloading: boolean;
  /**
   * Clases encoladas (['285303-music'])
   */
  queue: string[];
  /*
   * Clase actualmente en descarga ({ id: 285303, key: 'audio', progress: 20 }) o null si no hay ninguna descarga activa
   */
  downloading: null | OfflineTrainingClass;
  /**
   * Clases descargadas
   */
  trainingClasses: webappDownload[];
  /**
   * Listado de ids de clases descargadas de las cuales no tenemos información en base de datos.
   */
  unregisteredDownloads: string[];
};

type conversionStateWebapp = {
  percent: number;
};
