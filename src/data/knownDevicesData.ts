import { saveAll } from "../helpers/databaseHelpers";
import { BluetoothDevice } from "../core/bluetooth/bluetoothDevice";
import { DB } from "../helpers/init";

class KnownDevicesDataModel implements KnownDevicesData {
  knownDevices: KnownDevices; // [id: id+"-"+mediaType]

  constructor() {
    this.knownDevices = {};
  }

  hasKnownDevices(): boolean {
    if (
      this.knownDevices != null &&
      Object.keys(this.knownDevices).length > 0
    ) {
      return true;
    } else {
      return false;
    }
  }

  getKnownDevices(): KnownDevices {
    return this.knownDevices;
  }

  getKnownDevice(id: string): KnownDevice | undefined {
    return this.knownDevices[id];
  }

  addFromBluetoothDevice(device: BluetoothDevice, autoConnect: boolean) {
    const knownDevice: KnownDevice = {
      id: device.id,
      name: device.name,
      deviceType: device.deviceType,
      autoConnect: autoConnect,
      broadcast: device.broadcast,
      parserType: device.parserType,
    };

    this.saveKnwonDevice(knownDevice);
    this.saveToDb();
  }

  saveKnwonDevice(knownDevice: KnownDevice): void {
    if (this.knownDevices != null) {
      this.knownDevices[knownDevice.id] = knownDevice;
    }
  }

  getFromDb(): void {
    if (!DB.data) return;
    if (DB.data.knownDevices) {
      this.knownDevices = DB.data.knownDevices;
    }
  }

  async saveToDb(writeToDb = false): Promise<void> {
    if (!DB.data) return;
    DB.data.knownDevices = this.knownDevices;
  }

  init() {
    this.knownDevices = {};
  }
}

export = KnownDevicesDataModel;
