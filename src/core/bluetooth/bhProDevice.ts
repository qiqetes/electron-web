import noble, { Peripheral } from "@abandonware/noble";
import { BluetoothDeviceState } from "./bluetoothDeviceEnum";
import { GattSpecification } from "./gattSpecification";
import { BikeDevice } from "./bikeDevice";
import { BikeDataFeaturesFtms } from "./bikeDataFeaturesFtms";
import { bufferToListInt } from "./bluetoothDataParser";
import { mainWindow } from "../../index";

export class BhProDevice extends BikeDevice {
  constructor(
    deviceId: string,
    deviceName: string,
    state: BluetoothDeviceState = BluetoothDeviceState.unknown,
    peripheral: Peripheral | undefined,
    broadcast: boolean = true
  ) {
    super(deviceId, deviceName, state, peripheral, "bhPro", broadcast);
    this.bikeValues = new Map<string, any>();
    this.resistanceRange = undefined;
  }

  static isDevice(peripheral: Peripheral): BhProDevice | undefined {
    if (!peripheral) {
      return;
    }
    const currentName = peripheral.advertisement.localName;
    const allowedNames = GattSpecification.bhPro.allowedNames;

    if (this.isName(currentName, allowedNames)) {
      return BhProDevice.fromPeripheral(peripheral, false);
    }
  }

  static fromPeripheral(peripheral: noble.Peripheral, broadcast?: boolean) {
    const statePeripheal =
      BluetoothDeviceState[peripheral.state] ||
      BluetoothDeviceState.disconnected;
    const isBroadcast = broadcast || true;
    const id = peripheral.uuid.toLowerCase();

    return new BhProDevice(
      id,
      peripheral.advertisement.localName,
      statePeripheal,
      peripheral,
      isBroadcast
    );
  }

  static fromKnwonDevice(device: KnownDevice) {
    const statePeripheal = BluetoothDeviceState.unknown;

    return new BhProDevice(
      device.id,
      device.name,
      BluetoothDeviceState.unknown,
      undefined,
      true
    );
  }

  setAdvertisment(advertisement: noble.Advertisement): void {
    const values = bufferToListInt(advertisement.manufacturerData);
    this.readValues(values);

    if (this.state == BluetoothDeviceState.connected) {
      mainWindow.webContents.send("bikeData-" + this.id, this.bikeValues);
    }
  }

  readValues(values: number[]): Map<string, any> {
    const cadence = values[13];
    const power = values[14] * 256 + values[15];
    const resistance = values[21];
    const speed = values[18] + values[19] / 100;

    this.bikeValues.set(BikeDataFeaturesFtms.CADENCE, cadence);
    this.bikeValues.set(BikeDataFeaturesFtms.POWER, power);
    this.bikeValues.set(BikeDataFeaturesFtms.RESISTANCE, resistance);
    this.bikeValues.set(BikeDataFeaturesFtms.SPEED, speed);

    return this.bikeValues;
  }

  getValues() {
    return this.bikeValues;
  }

  async startNotify(): Promise<void> {
    console.log("unimplemented");
  }

  async getFeatures(): Promise<string[] | undefined> {
    this.features = [
      BikeDataFeaturesFtms.CADENCE,
      BikeDataFeaturesFtms.POWER,
      BikeDataFeaturesFtms.DISTANCE,
      BikeDataFeaturesFtms.RESISTANCE,
    ];
    return this.features;
  }

  async startTraining() {
    this.bikeValues = new Map<string, any>();
  }

  async resetTraining() {
    this.bikeValues = new Map<string, any>();
  }

  async stopTraining() {
    this.bikeValues = new Map<string, any>();
  }

  async requestControl(): Promise<void> {}

  async setPowerTarget(power: number): Promise<void> {}

  async setResistanceTarget(resistance: number): Promise<void> {}
  async stopPowerTarget(): Promise<void> {}

  async autoMode(enable: boolean): Promise<void> {}

  async getLevelRange(): Promise<Map<string, number> | undefined> {
    return;
  }
}
