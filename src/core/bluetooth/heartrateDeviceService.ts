import { BrowserWindow, IpcMain } from "electron";
import { log } from "../../helpers/loggers";

export class HeartRateDeviceService {
  private callback: (deviceId: string) => void;

  constructor(readonly ipcMain: IpcMain) {
    this.callback = () => null;

    ipcMain.on("hrDeviceSelected", (_, deviceId) => {
      log("Device selected", deviceId);
      this.callback(deviceId);
    });

    ipcMain.on("hrDeviceSelectionCancelled", () => {
      log("Device selection cancelled");
      this.callback("");
    });
  }

  registerBluetoothEvents = (mainWindow: BrowserWindow) => {
    mainWindow.webContents.on(
      "select-bluetooth-device",
      (event, deviceList, cb) => {
        event.preventDefault();
        log("List of bluetooth devices found:", JSON.stringify(deviceList));
        mainWindow.webContents.send("hrDevicesList", deviceList);
        this.callback = cb;
      }
    );
  };
}
