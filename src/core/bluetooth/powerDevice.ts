import noble, { Peripheral } from "@abandonware/noble";
import { mainWindow } from "../../index";
import { BikeDataFeaturesPower } from "./bikeDataFeaturesPower";
import { bufferToListInt, intToBuffer } from "./bluetoothDataParser";
import { BluetoothDeviceState } from "./bluetoothDeviceEnum";
import {
  BluetoothFeatures,
  getFtmsFeatures,
  getPowerFeatures,
} from "./bluetoothFeatures";
import { GattSpecification } from "./gattSpecification";
import { ButtonMode, ZycleButton } from "./zycleButton";
import { BikeDevice } from "./bikeDevice";
import { BluetoothDevice } from "./bluetoothDevice";

export class PowerDevice extends BikeDevice {
  lastCrank: number | undefined;
  lastTimestampCrank: number | undefined;

  constructor(
    deviceId: string,
    deviceName: string,
    state: BluetoothDeviceState = BluetoothDeviceState.unknown,
    peripheral: Peripheral | undefined,
    broadcast: boolean = false
  ) {
    super(deviceId, deviceName, state, peripheral, "power", broadcast);
    this.bikeValues = new Map<string, any>();
    this.resistanceRange = undefined;
    this.powerTarget = 10;
    this.resistanceTarget = 10;

    this.lastCrank = undefined;
    this.lastTimestampCrank = undefined;
    this.normalization = "pow";
  }

  static isDevice(peripheral: Peripheral): PowerDevice | undefined {
    if (!peripheral) {
      return;
    }
    const currentServices = peripheral.advertisement.serviceUuids;
    const allowedService = GattSpecification.power.service;

    if (this.hasService(currentServices, allowedService)) {
      return PowerDevice.fromPeripheral(peripheral, false);
    }
  }

  static fromPeripheral(peripheral: noble.Peripheral, broadcast?: boolean) {
    const statePeripheal =
      BluetoothDeviceState[peripheral.state] ||
      BluetoothDeviceState.disconnected;
    const isBroadcast = broadcast || false;
    const id = peripheral.uuid.toLowerCase();

    return new PowerDevice(
      id,
      peripheral.advertisement.localName,
      statePeripheal,
      peripheral,
      isBroadcast
    );
  }
  static fromKnwonDevice(device: KnownDevice) {
    return new PowerDevice(
      device.id,
      device.name,
      BluetoothDeviceState.unknown,
      undefined,
      device.broadcast
    );
  }

  static isDeviceChromium(device:BluetoothDevice, uuids:string[],advertisement?:Buffer ):PowerDevice|undefined {
    if(!device){
      return
    }
    const broadcast = false;
    const currentServices = uuids;
    const allowedService = GattSpecification.power.service;

    if (this.hasService(currentServices, allowedService)) {
      const dev =  PowerDevice.fromBluetoothDevice(device, broadcast);
      dev.currentServices = uuids;
      return dev;
    }
  }
  static fromBluetoothDevice(
    device: BluetoothDevice,
    broadcast?: boolean
  ) {
    const isBroadcast = broadcast||false;

    return new PowerDevice(
      device.id,
      device.name,
      device.state,
      undefined,
      isBroadcast,
    );
  }

  readDataFromBuffer(uuid:string, data: Buffer): void {
    const minUuid = uuid.split('-')[0].replace(/^0+/,'');
    const replaceUuid = uuid.replace(/-/g,'');
    if(minUuid == GattSpecification.power.measurements.bikeData){
      this.readBikeData(data);
    }else if( minUuid == GattSpecification.power.measurements.features){
      this.readFeaturesFromBuffer(data);
    }
  }

  setAdvertisment(advertisement: noble.Advertisement): void {
  }

  getValues() {
    return this.bikeValues;
  }

  async startNotify(): Promise<void> {
    if (!this.peripheral) {
      return;
    }
    const characteristic = await this.getMeasurement(
      GattSpecification.power.service,
      GattSpecification.power.measurements.bikeData
    );

    if (characteristic != null) {
      // this.peripheral.removeAllListeners('notify');

      this.notify(characteristic, (state: Buffer) => {
        this.readBikeData(state);
      });
    }
  }

  readBikeData(data:Buffer):void {
    let bikeDataFeatures = new BikeDataFeaturesPower();
    const state = Buffer.from(data);

    const values = bufferToListInt(state);
    const dataBike = bikeDataFeatures.valuesFeatures(values);
    this.bikeValues = this.parseValues(dataBike);
    this.bikeValues = this.getFeaturesValues(this.bikeValues);
    mainWindow.webContents.send("bikeData-" + this.id, this.bikeValues);
  }

  async readFeaturesFromBuffer(data: Buffer): Promise<void> {
    const featuresBuffer = Buffer.from(data);
    this.features = await getPowerFeatures(featuresBuffer);

    await this.requestControl();
    await this.startTraining();
  }

  parseValues(dataBike: Map<string,number>): Map<string,number>{
    var values = new Map<string,number>();
    if (dataBike.get(BluetoothFeatures.PowerBalance) ) {
      this.checkFeature(BluetoothFeatures.Power);
      const power = dataBike.get(BluetoothFeatures.PowerBalance);
      const crankValue = dataBike.get(BluetoothFeatures.CrankValue);
      if (power == 0 && this.lastCrank != undefined && crankValue) {
        if (this.lastCrank == crankValue) {
          //Es correcta la posición 0
          values.set(BluetoothFeatures.Power, power);
        }
      } else if (power != undefined) {
        values.set(BluetoothFeatures.Power, power);
      }
    }
    if (dataBike.get(BluetoothFeatures.CrankValue)) {
      this.checkFeature(BluetoothFeatures.Cadence);
      const crankValue = dataBike.get(BluetoothFeatures.CrankValue);
      const crankTimestamp = dataBike.get(BluetoothFeatures.CrankTimestamp);
      const currentTimestamp = new Date().getTime() / 1000;

      if(crankValue && crankTimestamp){
        if(this.lastCrank != undefined && this.lastTimestampCrank != undefined){

          let crankDifference = crankValue - this.lastCrank;
          let crankDifferenceTime =
            (crankTimestamp - this.lastTimestampCrank) / 1024;
          if (this.lastTimestampCrank < crankTimestamp) {
            if (crankDifferenceTime > 0) {
              let cadence = Math.floor(
                (crankDifference * 60) / crankDifferenceTime
              );
              this.lastTimestampCrank = currentTimestamp;
              if (cadence > 150) {
                cadence = 150;
              }
              values.set(BluetoothFeatures.Cadence, cadence);
            } else {
              if (
                this.lastTimestampCrank != undefined ||
                currentTimestamp - this.lastTimestampCrank > 3
              ) {
                this.lastTimestampCrank = currentTimestamp;
                values.set(BluetoothFeatures.Cadence, 0);
              }
            }
          }
        }
        this.lastCrank = crankValue;
        this.lastTimestampCrank = crankTimestamp;
      }
    }
    return values;
  }
  checkFeature(feature: string) {
    if (!this.features.find((feat) => feat == feature)) {
      this.features.unshift(feature);
    }
  }

  async getFeatures(): Promise<string[] | undefined> {
    if(this.features.length > 0){
      return this.features;
    }
    if (!this.peripheral) {
      return [];
    }

    if (this.features && this.features.length > 0) {
      return this.features;
    }

    const characteristic = await this.getMeasurement(
      GattSpecification.power.service,
      GattSpecification.power.measurements.features
    );

    if (characteristic) {
      await this.read(characteristic, async (features: any) => {
        this.features = await getPowerFeatures(features);
      });
    }
    await this.requestControl();
    await this.startTraining();
    return this.features;
  }

  async startTraining() {
    this.lastCrank = undefined;
    this.lastTimestampCrank = undefined;
    this.resetWindowValues();
  }

  async resetTraining() {
    this.lastCrank = undefined;
    this.lastTimestampCrank = undefined;
    this.resetWindowValues();
  }

  async stopTraining() {
    this.lastCrank = undefined;
    this.lastTimestampCrank = undefined;
    this.resetWindowValues();
  }

  async requestControl(): Promise<void> {
    this.lastCrank = undefined;
    this.lastTimestampCrank = undefined;
    this.resetWindowValues();
  }

  async setPowerTarget(power: number): Promise<void> {}

  async setResistanceTarget(resistance: number): Promise<void> {}
  async stopPowerTarget(): Promise<void> {}

  async autoMode(enable: boolean): Promise<void> {}

  async getLevelRange(): Promise<Map<string, number> | undefined> {
    return;
  }
}
