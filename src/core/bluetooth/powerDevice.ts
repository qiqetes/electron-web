
import noble, {  Peripheral } from "@abandonware/noble";
import { mainWindow } from "../../index";
import { BikeDataFeaturesPower } from "./bikeDataFeaturesPower";
import { bufferToListInt, intToBuffer } from "./bluetoothDataParser";
import { BluetoothDeviceState } from "./bluetoothDeviceEnum";
import { BluetoothFeatures, getFtmsFeatures, getPowerFeatures } from "./bluetoothFeatures";
import { GattSpecification } from "./gattSpecification";
import { ButtonMode, ZycleButton } from "./zycleButton";
import { BikeDevice } from "./bikeDevice";

export class PowerDevice extends BikeDevice   {
  constructor(
    deviceId: string,
    deviceName: string,
    state: BluetoothDeviceState = BluetoothDeviceState.unknown,
    peripheral: Peripheral | undefined,
    broadcast: boolean = false
  ) {
    super(deviceId,deviceName,state,peripheral,'power',broadcast);
    this.bikeValues = new Map<string, any>();
    this.resistanceRange = undefined;
    this.powerTarget = 10;
    this.resistanceTarget = 10;
  }

  static isDevice(peripheral:Peripheral):PowerDevice|undefined {
    if(!peripheral){
      return
    }
    const currentServices = peripheral.advertisement.serviceUuids;
    const allowedService = GattSpecification.power.service;

    if (this.hasService(currentServices, allowedService)){
      return PowerDevice.fromPeripheral(peripheral, false);
    }
  }

  static fromPeripheral(
    peripheral: noble.Peripheral,
    broadcast?: boolean
  ) {
    const statePeripheal =
      BluetoothDeviceState[peripheral.state] ||
      BluetoothDeviceState.disconnected;
    const isBroadcast = broadcast||false;
    const id = peripheral.uuid.toLowerCase();

    return new PowerDevice(
      id,
      peripheral.advertisement.localName,
      statePeripheal,
      peripheral,
      isBroadcast,
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
  setAdvertisment(advertisement: noble.Advertisement): void {
  }

  getValues(){

    return this.bikeValues;
  }

  async startNotify(): Promise<void> {
    if (!this.peripheral) {
      return;
    }
    const characteristic = await this.getMeasurement(
      GattSpecification.ftms.service,
      GattSpecification.ftms.measurements.bikeData
    );

    if (characteristic != null) {
      let bikeDataFeatures = new BikeDataFeaturesPower();
      // this.peripheral.removeAllListeners('notify');

      this.notify(characteristic, (state: Buffer) => {
        const values = bufferToListInt(state);
        this.bikeValues = bikeDataFeatures.valuesFeatures(values);
        console.log("BIKE DATA =  ", this.bikeValues);
        mainWindow.webContents.send("bikeData-" + this.id, this.bikeValues);
      });
    }

  }
  async getFeatures(): Promise<string[] | undefined> {

    if (!this.peripheral) {
      return [];
    }
    if(this.features){
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
  }

  async resetTraining() {
  }

  async stopTraining() {

  }

  async requestControl(): Promise<void> {

  }

  async setPowerTarget(power: number): Promise<void> {

  }

  async setResistanceTarget(resistance: number): Promise<void> {

  }
  async stopPowerTarget(): Promise<void> {

  }

  async autoMode(enable: boolean): Promise<void> {

  }

  async getLevelRange(): Promise<Map<string, number> | undefined> {
    return
  }

}
