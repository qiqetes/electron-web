export {};

declare global {
  interface Window {
    electronAPI: {
      baseURL;
    };
  }
}
