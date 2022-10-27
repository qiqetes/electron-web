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
  isDownloading: boolean; // Downloads are in progress
  queue: string[]; // Clases encoladas (['285303-music'])
  downloading: null | OfflineTrainingClass; // Clase actualmente en descarga ({ id: 285303, key: 'audio', progress: 20 })
  trainingClasses: webappDownload[];
};

type conversionStateWebapp = {
  percent: number
}
