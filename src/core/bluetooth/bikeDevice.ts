var AsyncLock = require('async-lock');

import noble, { Advertisement, Characteristic, Peripheral, Service } from "@abandonware/noble";

import { BluetoothDeviceState, BluetoothDeviceTypes } from "./bluetoothDeviceEnum";
import {BluetoothDevice} from "./bluetoothDevice";

interface BikeDeviceInterface extends BluetoothDevice  {
  setAdvertisment(advertisement: Advertisement): void;
  getFeatures(): Promise<string[] | undefined>;
  getLevelRange(): Promise<Map<string, number> | undefined>;
  setPowerTarget(power:number): Promise<void>;
  setResistanceTarget(resistance:number): Promise<void>;
  stopPowerTarget(): Promise<void>;
  autoMode(enable:boolean): Promise<void>;
}


export class BikeDevice extends BluetoothDevice implements BikeDeviceInterface{
  bikeValues: Map<string, any>;
  resistanceRange: Map<string, number> | undefined;
  lock: any;
  lockKey: any;
  powerTarget: number;
  resistanceTarget:number;

  constructor(
    deviceId: string,
    deviceName: string,
    state: BluetoothDeviceState = BluetoothDeviceState.unknown,
    peripheral: Peripheral | undefined,
    parserType: BluetoothParserType,
    broadcast: boolean = false
  ) {
    super(deviceId,deviceName,BluetoothDeviceTypes.Bike,state,peripheral,parserType,false);
    this.bikeValues = new Map<string, any>();
    this.resistanceRange = undefined;
    this.lock = new AsyncLock({timeout: 5000});
    this.powerTarget = 10;
    this.resistanceTarget = 10;
  }
  getLevelRange(): Promise<Map<string, number> | undefined> {
    throw new Error("Method not implemented.");
  }
  setPowerTarget(power: number): Promise<void> {
    throw new Error("Method not implemented.");
  }
  setResistanceTarget(resistance: number): Promise<void> {
    throw new Error("Method not implemented.");
  }
  stopPowerTarget(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  autoMode(enable: boolean): Promise<void> {
    throw new Error("Method not implemented.");
  }



}