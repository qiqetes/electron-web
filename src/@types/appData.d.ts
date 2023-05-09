interface AppData extends IndexableData, AppDataDB { }

interface AppDataDB {
  LAST_VERSION_DOWNLOADED: null | string;
  LAST_LOGIN: null | number; // timestamp value
  USER: User | null;
  LAST_WINDOW_SIZE: null | { width: number; height: number };
  LAST_WINDOW_POSITION: null | { x: number; y: number };
  WORKER_INSTALLED: boolean;
  AUTHORIZATION: string;
}
