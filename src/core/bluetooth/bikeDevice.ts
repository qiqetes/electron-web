var AsyncLock = require('async-lock');

import noble, { Advertisement, Characteristic, Peripheral, Service } from "@abandonware/noble";

import { BluetoothDeviceState, BluetoothDeviceTypes } from "./bluetoothDeviceEnum";
import {BluetoothDevice} from "./bluetoothDevice";
import { normalizedPower,getAvg,getMedian } from "../../helpers/statistics";
import { BluetoothFeatures } from "./bluetoothFeatures";

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
  normalization: normalization;
  normalizationData: Map<string,number[]>;
  windowValue:number;

  constructor(
    deviceId: string,
    deviceName: string,
    state: BluetoothDeviceState = BluetoothDeviceState.unknown,
    peripheral: Peripheral | undefined,
    parserType: BluetoothParserType,
    broadcast: boolean = false
  ) {
    super(deviceId,deviceName,BluetoothDeviceTypes.Bike,state,peripheral,parserType,broadcast);
    this.bikeValues = new Map<string, any>();
    this.resistanceRange = undefined;
    this.lock = new AsyncLock({timeout: 5000});
    this.powerTarget = 10;
    this.resistanceTarget = 10;
    this.normalization = 'none';
    this.normalizationData = new Map<string,number[]>();
    this.windowValue = 5;
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
  readFeaturesFromBuffer(data: Buffer): void {
    throw new Error("Method not implemented.");
  }

  //Calculamos los datos a enviar con la normalización indicada
  getFeaturesValues(bikeValues: Map<string,number> ) :Map<string,number> {
    const powerValue = bikeValues.get(BluetoothFeatures.Power);
    const cadenceValue = bikeValues.get(BluetoothFeatures.Cadence);
    const resistanceValue = bikeValues.get(BluetoothFeatures.Resistance);

    if(powerValue){
      bikeValues.set(BluetoothFeatures.Power, this.getWindowValue(BluetoothFeatures.Power,powerValue));
    }
    if(cadenceValue){
      bikeValues.set(BluetoothFeatures.Cadence, this.getWindowValue(BluetoothFeatures.Cadence,cadenceValue));
    }
    if(resistanceValue){
      bikeValues.set(BluetoothFeatures.Resistance, this.getWindowValue(BluetoothFeatures.Resistance,resistanceValue));
    }

    return bikeValues;
  };

  getWindowValue(type: string, value: number){
    if(this.normalization == 'none'){
      return value;
    }
    let values = this.normalizationData.get(type)||[];
    values.push(value);

    this.normalizationData.set(type,values);

    if(this.normalization == 'pow'){
      return normalizedPower(values, this.windowValue);
    }else{
      const slicesValues = values.slice(-1*this.windowValue);
      if(this.normalization == 'avg'){
        return getAvg(slicesValues);
      }else{
        return getMedian(slicesValues);
      }
    }
  }
  resetWindowValues(){
    this.normalizationData = new Map<string,number[]>();

  }
}