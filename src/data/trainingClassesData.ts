import { DB } from "../helpers/init";

class TrainingClassesDataModel implements TrainingClassesData {
  trainingClasses: TrainingClass[] = [];

  saveToDb: () => void = async () => {
    DB.data.trainingClasses = this;
    await DB.write();
  };
  getFromDb: () => void = () => {
    this.trainingClasses = DB.data.trainingClasses.trainingClasses;
  };
}

export const TrainingClassesData = new TrainingClassesDataModel();
