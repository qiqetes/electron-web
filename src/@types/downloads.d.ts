interface DownloadsData extends IndexableData {
  offlineTrainingClasses: { [id: string]: OfflineTrainingClass };
  trainingClassesScheduled: number[];

  isDownloading: boolean;
  getFirstQueued: () => OfflineTrainingClass;
  stopDownloading: () => void;
  downloadNext: () => void;
  removeAll: () => void;
  importFromFolder: (folder: string) => void;
}

type downloadStatus =
  | "none" // won't be donwloaded
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

interface OfflineTrainingClass {
  id: number | string;
  statusVideoHd: downloadStatus;
  statusVideoSd: downloadStatus;
  statusAudio: downloadStatus;
  statusMusic: downloadStatus;
  progress: number;
  timeStamp: number | null;
  retries: number;

  getQueuedMediaType: () => mediaType | null;
  changeStatus: (mediaType: mediaType, status: downloadStatus) => void;
}

type downloadRequest = {
  trainingClass: TrainingClass;
  mediaType: mediaType;
  timestamp?: number | null;
};

// The donloadsState that the webapp expects
// TODO: mejorar esto que es un desastre, pero se usa igual en toda la webapp
type downloadsStateWebapp = {
  isDownloading: boolean; // Downloads are in progress
  queue: string[]; // Clases encoladas (['285303-music'])
  downloading: null | OfflineTrainingClass; // Clase actualmente en descarga ({ id: 285303, key: 'audio', progress: 20 })
  trainingClasses: {
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
  }[];
};
