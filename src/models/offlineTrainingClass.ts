export class OfflineTrainingClass implements OfflineTrainingClass {
  id: number | string;
  statusVideoHd: downloadStatus;
  statusVideoSd: downloadStatus;
  statusAudio: downloadStatus;
  statusMusic: downloadStatus;
  progress: number;
  timeStamp: number | null;
  retries: number;

  constructor(
    trainingClass: TrainingClass | string | number,
    mediaTypeToQueue: mediaType,
    timestamp?: number
  ) {
    this.id =
      typeof trainingClass === "object" ? trainingClass.id : trainingClass;
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

  static fromDB(dbOfflineTrainingClass: OfflineTrainingClass) {
    const off = new this(
      dbOfflineTrainingClass.id,
      null,
      dbOfflineTrainingClass.timeStamp
    );
    off.statusVideoHd = dbOfflineTrainingClass.statusVideoHd;
    off.statusVideoSd = dbOfflineTrainingClass.statusVideoSd;
    off.statusAudio = dbOfflineTrainingClass.statusAudio;
    off.statusMusic = dbOfflineTrainingClass.statusMusic;
    off.progress = dbOfflineTrainingClass.progress;
    off.retries = dbOfflineTrainingClass.retries;
    return off;
  }

  alreadyQueued(mediaType: mediaType) {
    if (mediaType == "video_hd") return this.statusVideoHd != "none";
    if (mediaType == "video_sd") return this.statusVideoSd != "none";
    if (mediaType == "audio") return this.statusAudio != "none";
    if (mediaType == "music") return this.statusMusic != "none";
    return false;
  }
}
