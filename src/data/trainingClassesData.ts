import { logError } from "../helpers/loggers";
import { isCompleteTrainingClass } from "../helpers/downloadsHelpers";
import { api, DB } from "../helpers/init";
import { AppData } from "./appData";
import { informDownloadsState } from "../helpers/ipcMainActions";

class TrainingClassesDataModel implements TrainingClassesData {
  trainingClasses: { [key: string]: TrainingClass } = {};
  trainingClassesToFetch: (number | string)[] = []; // IDs de clases que tocaría hacer un fetch
  lastFetch = 0;
  debounceInterval = 8000; // ms

  // Adds a class with all the parameters (media, progression...)
  addTrainingClass = (trainingClass: TrainingClass) => {
    // const id =
    //   typeof trainingClass === "object" ? trainingClass.id : trainingClass;

    // // Class already exists?
    // const tc = this.trainingClasses[id];
    // if (tc) {
    //   if (isCompleteTrainingClass(tc)) return;
    //   else if (!complete) {
    //     this.trainingClassesToFetch.push(id);
    //     return this.debouncedFetchTrainingClass;
    //   }
    // }

    // if (typeof trainingClass === "object") {
    //   if (complete && isCompleteTrainingClass(trainingClass)) {
    //     this.trainingClasses[id] = trainingClass;
    //     this.saveToDb();
    //   } else if (complete && !isCompleteTrainingClass(trainingClass)) {
    //     this.fetchTrainingClass(id);
    //   } else {
    //     this.trainingClasses[id] = trainingClass;
    //   }
    // } else {
    //   this.fetchTrainingClass(id);
    // }

    this.trainingClasses[trainingClass.id.toString()] = trainingClass;

    informDownloadsState();
    this.saveToDb();
  };

  needSyncTrainingClass = (id: string, complete = true) => {
    return !this.trainingClasses[id];
  };

  debouncedFetchTrainingClass = () => {
    if (this.trainingClassesToFetch.length === 0) return;
    const t = this.debounceInterval - (Date.now() - this.lastFetch);
    if (t > 0) {
      setTimeout(() => this.debouncedFetchTrainingClass(), t);
      return;
    }
    const id = this.trainingClassesToFetch.shift();
    // if (id) this.fetchTrainingClass(id);
    this.lastFetch = Date.now();
    this.debouncedFetchTrainingClass();
  };

  async saveToDb(): Promise<void> {
    if (!DB.data) return;
    DB.data.trainingClasses = this;
  }

  getFromDb(): void {
    if (!DB.data?.trainingClasses) return;
    this.trainingClasses = DB.data.trainingClasses.trainingClasses;
    this.trainingClassesToFetch =
      DB.data.trainingClasses.trainingClassesToFetch;
    this.debouncedFetchTrainingClass();
  }

  init(): void {
    this.trainingClasses = {};
    this.trainingClassesToFetch = [];
  }

  getTraingClass(id: number | string): TrainingClass | null {
    if (!Object.prototype.hasOwnProperty.call(this.trainingClasses, id)) {
      return null;
    }
    return this.trainingClasses[id];
  }

  async getFullTrainingClass(
    id: number | string
  ): Promise<TrainingClass | null> {
    if (
      !Object.prototype.hasOwnProperty.call(this.trainingClasses, id) ||
      !isCompleteTrainingClass(this.trainingClasses[id])
    ) {
      if (!AppData.ONLINE) return null;

      try {
        const fullTraining = await api.get(`training_classes/${id}`);
        if (fullTraining.data) {
          this.trainingClasses[id] = fullTraining.data as TrainingClass;
          return this.trainingClasses[id];
        }
      } catch (err) {
        logError("fetching TRAINING CLASS from API", err);
        return null;
      }
    }

    return this.trainingClasses[id];
  }
}

export = TrainingClassesDataModel;
