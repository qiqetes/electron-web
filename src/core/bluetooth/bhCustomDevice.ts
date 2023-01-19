import noble, { Peripheral } from "@abandonware/noble";
import { BluetoothDeviceState } from "./bluetoothDeviceEnum";
import { GattSpecification } from "./gattSpecification";
import { BikeDevice } from "./bikeDevice";
import { bufferToListInt, intToBuffer } from "./bluetoothDataParser";
import { mainWindow } from "../../index";
import { BikeDataFeaturesBh } from "./bikeDataFeaturesBh";

export class BhCustomDevice extends BikeDevice {
  intervalWrite: NodeJS.Timer | undefined;
  constructor(
    deviceId: string,
    deviceName: string,
    state: BluetoothDeviceState = BluetoothDeviceState.unknown,
    peripheral: Peripheral | undefined,
    broadcast: boolean = false
  ) {
    super(deviceId, deviceName, state, peripheral, "bhCustom", broadcast);
    this.bikeValues = new Map<string, any>();
    this.resistanceRange = undefined;
    this.powerTarget = 10;
    this.resistanceTarget = 10;

    this.normalization = "none";
  }

  static isDevice(peripheral: Peripheral): BhCustomDevice | undefined {
    if (!peripheral) {
      return;
    }
    const currentServices = peripheral.advertisement.serviceUuids;
    const allowedService = GattSpecification.bhCustom.service;

    if (this.hasService(currentServices, allowedService)) {
      return BhCustomDevice.fromPeripheral(peripheral, false);
    }
  }

  static fromPeripheral(peripheral: noble.Peripheral, broadcast?: boolean) {
    const statePeripheal =
      BluetoothDeviceState[peripheral.state] ||
      BluetoothDeviceState.disconnected;
    const isBroadcast = broadcast || false;
    const id = peripheral.uuid.toLowerCase();

    return new BhCustomDevice(
      id,
      peripheral.advertisement.localName,
      statePeripheal,
      peripheral,
      isBroadcast
    );
  }

  static fromKnwonDevice(device: KnownDevice) {
    const statePeripheal = BluetoothDeviceState.unknown;

    return new BhCustomDevice(
      device.id,
      device.name,
      BluetoothDeviceState.unknown,
      undefined,
      device.broadcast
    );
  }

  setAdvertisment(advertisement: noble.Advertisement): void {}

  getValues() {
    return this.bikeValues;
  }

  async startNotify(): Promise<void> {
    if (!this.peripheral) {
      return;
    }
    const characteristic = await this.getMeasurement(
      GattSpecification.bhCustom.service,
      GattSpecification.bhCustom.measurement.rx
    );

    if (characteristic != null) {
      const bikeDataFeatures = new BikeDataFeaturesBh();
      if (characteristic.properties.includes("notify")) {
        this.notify(characteristic, (state: Buffer) => {
          const values = bufferToListInt(state);
          this.bikeValues = bikeDataFeatures.updateValueSuscription(values);
          this.bikeValues = this.getFeaturesValues(this.bikeValues);
          mainWindow.webContents.send("bikeData-" + this.id, this.bikeValues);
        });
      }
    }
  }
  async getFeatures(): Promise<string[] | undefined> {
    this.features = BikeDataFeaturesBh.orderFeatures;
    await this.getLevelRange();
    await this.startTraining();
    return this.features;
  }

  async getLevelRange() {
    const levelRange = new Map<string, any>();
    if (this.resistanceRange) {
      return this.resistanceRange;
    }

    if (
      this.bikeValues.get(BikeDataFeaturesBh.RESISTENCE_LEVEL_RANGE) == null
    ) {
      levelRange.set("min", 1);
      levelRange.set("max", 24);
      levelRange.set("increment", 1);
      this.resistanceRange = levelRange;
    }
    return this.resistanceRange;
  }

  async safeWrite(values: Buffer) {
    try {
      if (this.intervalWrite) {
        clearInterval(this.intervalWrite);
      }
      const characteristicToWrite = await this.getMeasurement(
        GattSpecification.bhCustom.service,
        GattSpecification.bhCustom.measurement.tx
      );
      if (characteristicToWrite != null) {
        this.writeData(
          GattSpecification.bhCustom.service,
          GattSpecification.bhCustom.measurement.tx,
          values
        );
      }
    } catch (e) {
      console.log("error", e);
    }
  }

  async startTraining() {
    await this.safeWrite(
      Buffer.from(GattSpecification.bhCustom.controlPoint.start)
    );
  }

  async resetTraining() {
    //Reseteamos los controles de botón
    await this.safeWrite(
      Buffer.from(GattSpecification.bhCustom.controlPoint.reset)
    );
  }

  async stopTraining() {
    //Reseteamos los controles de botón
    // writeTarget = null;
    await this.safeWrite(
      Buffer.from(GattSpecification.bhCustom.controlPoint.stop)
    );
  }

  async pauseTraining() {
    await this.safeWrite(
      Buffer.from(GattSpecification.bhCustom.controlPoint.pause)
    );
  }

  async setResistanceTarget(level: number) {
    const features = await this.getFeatures();

    if (level <= 0) {
      level++;
    }
    if (features?.includes(BikeDataFeaturesBh.RESISTANCE_TARGET)) {
      if (level >= 25) {
        level = level % 25;
      }
      this.safeWrite(Buffer.from([85, 17, 0o1, level]));
    }
  }
}
