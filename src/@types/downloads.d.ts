interface DownloadsData extends IndexableData {
  offlineTrainingClasses: OfflineTrainingClass[];
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
  id: number;
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
