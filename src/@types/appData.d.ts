interface AppData extends IndexableData, AppDataDB {}

interface AppDataDB {
  LAST_VERSION_DOWNLOADED: null | string;
  FIRST_TIME_IT_RUNS: boolean;
  LAST_LOGIN: null | number; // timestamp value
}
