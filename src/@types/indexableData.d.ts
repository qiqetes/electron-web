/**
 * Models that can be saved in the db.json file will extend this interface
 */
interface IndexableData {
  saveToDb: () => void;
  getFromDb: () => void;
  init: () => void;
}
