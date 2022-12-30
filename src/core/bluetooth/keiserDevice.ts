
import noble, {  Peripheral } from "@abandonware/noble";
import { mainWindow } from "../../index";
import { BikeDataFeaturesFtms } from "./bikeDataFeaturesFtms";
import { bufferToListInt, concatenateTo16BytesInt, intToBuffer } from "./bluetoothDataParser";
import { BluetoothDeviceState } from "./bluetoothDeviceEnum";
import { GattSpecification } from "./gattSpecification";
import { BikeDevice } from "./bikeDevice";

export class KeiserDevice extends BikeDevice   {

  constructor(
    deviceId: string,
    deviceName: string,
    state: BluetoothDeviceState = BluetoothDeviceState.unknown,
    peripheral: Peripheral | undefined,
    broadcast: boolean = true
  ) {
    super(deviceId,deviceName,state,peripheral,'keiser',broadcast);
    this.bikeValues = new Map<string, any>();
    this.resistanceRange = undefined;

  }
  static isDevice(peripheral:Peripheral):KeiserDevice|undefined {
    if(!peripheral){
      return
    }
    const currentName = peripheral.advertisement.localName;
    const allowedNames = GattSpecification.heartRate.allowedNames;

    if(this.hasName(currentName,allowedNames) && peripheral.advertisement.manufacturerData){
      return  KeiserDevice.fromPeripheral(peripheral,true)
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

    return new KeiserDevice(
      id,
      peripheral.advertisement.localName,
      statePeripheal,
      peripheral,
      isBroadcast,
    );
  }
  static fromKnwonDevice(device: KnownDevice) {
    const statePeripheal = BluetoothDeviceState.unknown;

    return new KeiserDevice(
      device.id,
      device.name,
      BluetoothDeviceState.unknown,
      undefined,
      device.broadcast
    );
  }
  setAdvertisment(advertisement: noble.Advertisement): void {
    const values = bufferToListInt(advertisement.manufacturerData);
    this.readValues(values);

    if(this.state == BluetoothDeviceState.connected){
      mainWindow.webContents.send("heartRateData-" + this.id, this.bikeValues);
    }
  }

  readValues(values:number[]): Map<string, any> {

    if(values.length >= 16){
    var cadence =
        (Math.round(concatenateTo16BytesInt(values[5], values[4])) / 10)
    var distance =
        concatenateTo16BytesInt(values[15], values[14]) /10.0;
    var power = concatenateTo16BytesInt(values[9], values[8]);
    var resistance = values[16];
      this.bikeValues.set(BikeDataFeaturesFtms.CADENCE, cadence);
      this.bikeValues.set(BikeDataFeaturesFtms.DISTANCE, distance);
      this.bikeValues.set(BikeDataFeaturesFtms.POWER, power);
      this.bikeValues.set(BikeDataFeaturesFtms.RESISTANCE, resistance);
    }
    return this.bikeValues;
  }

  getValues(){
    return this.bikeValues;
  }

  async startNotify(): Promise<void> {

  }

  async getFeatures(): Promise<string[] | undefined> {

    this.features = [
      BikeDataFeaturesFtms.CADENCE,
      BikeDataFeaturesFtms.POWER,
      BikeDataFeaturesFtms.DISTANCE,
      BikeDataFeaturesFtms.RESISTANCE
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
    return ;
  }

}
