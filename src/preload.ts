import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  isDesktop: true,
  // Saves settings from webapp to SettingsData
  saveSetting: (setting: string, value: any) => {
    ipcRenderer.send("saveSetting", setting, value);
  },

  // Send toast notification
  handleToast: (
    callback: (
      event: Event,
      text: string,
      variant?: string,
      seconds?: number
    ) => void
  ) => ipcRenderer.on("toast", callback),

  setAuth: (auth: string) => {
    ipcRenderer.send("setAuth", auth);
  },
});

contextBridge.exposeInMainWorld("downloadsAPI", {
  // offlineTrainingClasses: DownloadsData,
  startLocalServer: ipcRenderer.send("startLocalServer"),
  stopLocalServer: ipcRenderer.send("stopLocalServer"),
});
