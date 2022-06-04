export class OfflineTrainingClass implements OfflineTrainingClass {
  id: number;
  statusVideoHd: downloadStatus;
  statusVideoSd: downloadStatus;
  statusAudio: downloadStatus;
  statusMusic: downloadStatus;
  progress: number;
  timeStamp: number | null;
  retries: number;

  constructor(
    trainingClass: TrainingClass,
    mediaTypeToQueue: mediaType,
    timestamp?: number
  ) {
    this.id = trainingClass.id;
    this.statusVideoHd = "none";
    this.statusVideoSd = "none";
    this.statusAudio = "none";
    this.statusMusic = "none";
    this.progress = 0;
    this.timeStamp = timestamp || null;
    this.retries = 0;

    this.changeStatus(mediaTypeToQueue, "queued");
  }

  getQueuedMediaType(): mediaType | null {
    if (this.statusVideoHd == "queued") return "video_hd";
    if (this.statusVideoSd == "queued") return "video_sd";
    if (this.statusAudio == "queued") return "audio";
    if (this.statusMusic == "queued") return "music";
    return null;
  }

  changeStatus(mediaType: mediaType, status: downloadStatus) {
    if (mediaType == "video_hd") this.statusVideoHd = status;
    if (mediaType == "video_sd") this.statusVideoSd = status;
    if (mediaType == "audio") this.statusAudio = status;
    if (mediaType == "music") this.statusMusic = status;
  }
}
