import { logError } from "../helpers/loggers";
import { isCompleteTrainingClass } from "../helpers/downloadsHelpers";
import { api, DB } from "../helpers/init";
import { AppData } from "./appData";

class TrainingClassesDataModel implements TrainingClassesData {
  trainingClasses: { [key: string]: TrainingClass } = {};
  trainingClassesToFetch: (number | string)[] = []; // IDs de clases que tocaría hacer un fetch

  // Adds a class with all the parameters (media, progression...)
  addTraining = (
    trainingClass: TrainingClass | number | string,
    complete = true
  ) => {
    const id =
      typeof trainingClass === "object" ? trainingClass.id : trainingClass;

    // Class already exists?
    const tc = this.trainingClasses[id];
    if (tc) {
      if (isCompleteTrainingClass(tc)) return;
      else if (!complete) return;
    }

    if (typeof trainingClass === "object") {
      if (complete && isCompleteTrainingClass(trainingClass)) {
        this.trainingClasses[id] = trainingClass;
        this.saveToDb();
      } else if (complete && !isCompleteTrainingClass(trainingClass)) {
        this.fetchTrainingClass(id);
      } else {
        this.trainingClasses[id] = trainingClass;
      }
    } else {
      this.fetchTrainingClass(id);
    }
  };

  fetchTrainingClass(id: number | string): void {
    api
      .fetch(`training_classes/${id}`, {
        params: {
          include: "trainer,training_materials",
        },
      })
      .then((res: any) => {
        this.trainingClasses[id] = res.data as TrainingClass;
        this.saveToDb();
      })
      .catch((err: any) => {
        this.trainingClassesToFetch.push(id);
        console.log(err);
      });
  }

  async saveToDb(): Promise<void> {
    if (!DB.data) return;
    DB.data.trainingClasses = this;
    await DB.write();
  }

  getFromDb(): void {
    if (!DB.data?.trainingClasses) return;
    this.trainingClasses = DB.data.trainingClasses.trainingClasses;
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
        logError("fetching TRAINING CLASS from API");
        return null;
      }
    }

    return this.trainingClasses[id];
  }
}

export = TrainingClassesDataModel;
