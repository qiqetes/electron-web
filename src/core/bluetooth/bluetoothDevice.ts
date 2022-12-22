var AsyncLock = require('async-lock');

import noble, { Characteristic, Peripheral, Service } from "@abandonware/noble";
import { mainWindow } from "../../index";
import { BikeDataFeatures } from "./bikeDataFeatures";
import { bufferToListInt, intToBuffer } from "./bluetoothDataParser";
import { BluetoothDeviceState } from "./bluetoothDeviceEnum";
import { BluetoothFeatures, getFtmsFeatures } from "./bluetoothFeatures";
import { GattSpecification } from "./gattSpecification";
import { ButtonMode, ZycleButton } from "./zycleButton";

interface BluetoothDeviceInterface {
  // Docs: https://electronjs.org/docs/api/structures/bluetooth-device
  id: string;
  broadcast: boolean;
  parserType: BluetoothParserType;
  peripheral: Peripheral | undefined;
  cachedMeasurement: Characteristic[];
  getId(): string;
  getName(): string;
  getDeviceType(): BluetoothDeviceTypes;
  getState(): BluetoothDeviceState;
  getFeatures(): Promise<string[] | undefined>;
  getLevelRange(): Promise<Map<string, number> | undefined>;
  setPowerTarget(power:number): Promise<void>;
  setResistanceTarget(resistance:number): Promise<void>;
  stopPowerTarget(): Promise<void>;
  autoMode(enable:boolean): Promise<void>;

  connect(): void;
  disconnect(): void;
  serialize(): {};
}

export class BluetoothDevice implements BluetoothDeviceInterface {
  id: string;
  name: string;
  deviceType: BluetoothDeviceTypes;
  state: BluetoothDeviceState;
  broadcast: boolean;
  parserType: BluetoothParserType;
  peripheral: Peripheral | undefined;
  cachedMeasurement: Characteristic[];
  cachedServices: Service[];

  notifing: boolean;
  features: string[];
  bikeValues: Map<string, any>;
  resistanceRange: Map<string, number> | undefined;
  lock: any;
  lockKey: any;
  zycleButton: ZycleButton;
  powerTarget: number;
  resistanceTarget:number;

  constructor(
    deviceId: string,
    deviceName: string,
    deviceType: BluetoothDeviceTypes,
    state: BluetoothDeviceState = BluetoothDeviceState.unknown,
    parserType: BluetoothParserType,
    peripheral: Peripheral | undefined,
    broadcast: boolean = false
  ) {
    this.id = deviceId;
    this.name = deviceName;
    this.deviceType = deviceType;
    this.state = state;
    this.broadcast = broadcast;
    this.parserType = parserType;
    this.peripheral = peripheral;
    this.cachedMeasurement = [];
    this.cachedServices = [];
    this.notifing = false;
    this.features = [];
    this.bikeValues = new Map<string, any>();
    this.resistanceRange = undefined;
    this.lock = new AsyncLock({timeout: 5000});
    this.zycleButton = new ZycleButton();
    this.powerTarget = 10;
    this.resistanceTarget = 10;
  }
  static fromPeripheral(
    peripheral: noble.Peripheral,
    type: BluetoothDeviceTypes,
    parserType: BluetoothParserType
  ) {
    const statePeripheal =
      BluetoothDeviceState[peripheral.state] ||
      BluetoothDeviceState.disconnected;
    const broadcast = !peripheral.connectable;
    const id = peripheral.uuid.toLowerCase();

    return new BluetoothDevice(
      id,
      peripheral.advertisement.localName,
      type,
      statePeripheal,
      parserType,
      peripheral,
      broadcast
    );
  }

  static fromKnwonDevice(device: KnownDevice) {
    const statePeripheal = BluetoothDeviceState.unknown;

    return new BluetoothDevice(
      device.id,
      device.name,
      device.deviceType,
      BluetoothDeviceState.unknown,
      device.parserType,
      undefined,
      device.broadcast
    );
  }

  serialize(): {} {
    return {
      id: this.getId(),
      name: this.getName(),
      deviceType: this.getDeviceType(),
      state: this.getState(),
      broadcast: this.broadcast,
    };
  }
  async startNotify(): Promise<void> {
    if (!this.peripheral) {
      return;
    }
   // this.peripheral.removeAllListeners("notify");
    if (this.deviceType == "heartrate") {
      const characteristic = await this.getMeasurement(
        GattSpecification.heartRate.service,
        GattSpecification.heartRate.measurements.heartRate
      );

      if (characteristic != null) {

        this.notify(characteristic, (state: Buffer) => {
          var data = state.readInt8(1); //heart rate measurement
          mainWindow.webContents.send("heartRateData-" + this.id, data);
        });
      }
    } else if (this.deviceType == "bike") {
      if (this.parserType == "ftms") {
        const characteristic = await this.getMeasurement(
          GattSpecification.ftms.service,
          GattSpecification.ftms.measurements.bikeData
        );

        if (characteristic != null) {
          let bikeDataFeatures = new BikeDataFeatures();
         // this.peripheral.removeAllListeners('notify');

          this.notify(characteristic, (state: Buffer) => {
            const values = bufferToListInt(state);
            this.bikeValues = bikeDataFeatures.valuesFeatures(values);
            console.log("BIKE DATA =  ", this.bikeValues);
            mainWindow.webContents.send("bikeData-" + this.id, this.bikeValues);
          });
        }

        if(this.features.find((feature) => feature == BluetoothFeatures.ZycleButton) ){
          this.startZycleButton();

        }
      }
    }
  }

  async startZycleButton() {

    const characteristic = await this.getMeasurement(
      GattSpecification.zycleButton.service,
      GattSpecification.zycleButton.measurements.buttonControl
    );
    if (characteristic != null) {

      this.notify(characteristic, (state: Buffer) => {
        console.log("😅 PASO 0 SIiiiii ene l notificador del botón")
        const values = bufferToListInt(state);
        var dataController = ZycleButton.valuesFeatures(values);
        console.log("😅 PASO 1 El data controller ",dataController);
        if(this.zycleButton.changeValues(dataController)){
          console.log("😅 PASO 1 El CAMBIA EL VALOR ",dataController);

          if(dataController.get(ZycleButton.MODE) == ButtonMode.AUTO){
            if(dataController.get(ZycleButton.LEVEL) != Math.floor( this.powerTarget /5 ) && this.powerTarget != 10){
              console.log("😅 PASO 2 envia el valor modo auto ",this.zycleButton.toJson());

              mainWindow.webContents.send("buttonChange-" + this.id,this.zycleButton.toJson());
            }
          } else {
            if (dataController.get(ZycleButton.LEVEL) !=
                Math.floor(this.resistanceTarget)) {
                  console.log("😅 PASO 2.1 envia el valor modo manual ",this.zycleButton.toJson());
                  mainWindow.webContents.send("buttonChange-" + this.id,this.zycleButton.toJson());
                }
          }
        }
     });
    }

  }

  async connect(): Promise<void> {
    if (!this.peripheral) {
      return;
    }
    this.peripheral.removeAllListeners("connect");
    this.peripheral.removeAllListeners("disconnect");
    this.peripheral.on("connect", async (stream) => {
      this.cachedMeasurement = [];
      await this.getFeatures();
      this.state = BluetoothDeviceState[this.peripheral!.state];
      mainWindow.webContents.send("bluetoothDeviceState", this.serialize());

      this.startNotify();
    });

    this.peripheral.on("disconnect", async (stream) => {
      this.state = BluetoothDeviceState[this.peripheral!.state];
      mainWindow.webContents.send("bluetoothDeviceState", this.serialize());

      const measuremnts = this.cachedMeasurement;
        for(const char of measuremnts){
          char.notify(false);
          char.removeAllListeners();
        };
      //Desde que emite el disconnect hasta que deja de verse en el discover pasa un tiempo, esperamos para que no haga reconexiones inválidas
      // const sleep = (ms:number) => new Promise(r => setTimeout(r, ms));
      //  await sleep(5000);
      this.peripheral!.removeAllListeners();
    });

    await this.peripheral.connectAsync();
  }

  async disconnect(): Promise<void> {
    if (this.peripheral) {
      await this.peripheral.disconnectAsync();
    }
  }

  async getFeatures(): Promise<string[] | undefined> {
    if (this.features.length > 0) {
      return this.features;
    }

    if (this.deviceType == "heartrate") {
      this.features = [BluetoothFeatures.HeartRate];
      return this.features;
    } else if (this.parserType == "ftms") {
      this.features = await this.getFeaturesFtms();

      return this.features;
    }
  }
  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getDeviceType(): BluetoothDeviceTypes {
    return this.deviceType;
  }
  getState(): BluetoothDeviceState {
    return this.state;
  }

  async getFeaturesFtms(): Promise<string[]> {
    if (!this.peripheral) {
      return [];
    }
    const features: string[] = [];

    const characteristic = await this.getMeasurement(
      GattSpecification.ftms.service,
      GattSpecification.ftms.measurements.feature
    );
    if (characteristic) {
      await this.read(characteristic, async (features: any) => {
        this.features = await getFtmsFeatures(features);
      });
    }

    const zycleButton = await this.getMeasurement(
      GattSpecification.zycleButton.service,
      GattSpecification.zycleButton.measurements.buttonControl
    );
    if (zycleButton) {
      this.features.push(BluetoothFeatures.ZycleButton);
    }

    await this.requestControl();
    await this.startTraining();
    return this.features;
  }

  async startTraining() {
    if (this.parserType == "ftms") {
      const data = Buffer.from(GattSpecification.ftms.controlPoint.start);
      await this.writeData(
        GattSpecification.ftms.service,
        GattSpecification.ftms.measurements.controlPoint,
        data
      );
      this.powerTarget = 10;
      this.zycleButton = new ZycleButton();


    }
  }

  async resetTraining() {
    if (this.parserType == "ftms") {
      console.log("EEIEIII TENEMOS EL RESET ESTO PARA EL DATA ")
      const data = Buffer.from(GattSpecification.ftms.controlPoint.reset);

      console.log(data)
      await this.writeData(
        GattSpecification.ftms.service,
        GattSpecification.ftms.measurements.controlPoint,
        data
      );
    }
  }

  async stopTraining() {
    if (this.parserType == "ftms") {
      const data = Buffer.from(GattSpecification.ftms.controlPoint.stop);
      await this.writeData(
        GattSpecification.ftms.service,
        GattSpecification.ftms.measurements.controlPoint,
        data
      );
    }
  }

  async requestControl(): Promise<void> {
    if (!this.peripheral) {
      return;
    }
    if (this.parserType == "ftms") {
      const data = Buffer.from(
        GattSpecification.ftms.controlPoint.requestControl
      );
      await this.writeData(
        GattSpecification.ftms.service,
        GattSpecification.ftms.measurements.controlPoint,
        data
      );
    }
  }

  async setPowerTarget(power: number): Promise<void> {
    console.log("ESTMAO EN SET POWER TARGET");
    if (this.parserType == "ftms") {
      const values = intToBuffer(power);
      const data = Buffer.concat([Buffer.from(GattSpecification.ftms.controlPoint.setPower),values]);

      await this.writeData(
        GattSpecification.ftms.service,
        GattSpecification.ftms.measurements.controlPoint,
        data
      );
      console.log("HEMOS AÑADIDO LA POTENCIA ",power)
      this.powerTarget = power;

      //TODO no se porque hay que volver a notificar, comprobar esto
     // this.startNotify();


    }
  }

  async setResistanceTarget(resistance: number): Promise<void> {
    this.resistanceTarget = resistance;
    console.log("ESTMAO EN SET RESISTANCE TARGET");

    if (this.parserType == "ftms") {
      const values = intToBuffer(resistance);
      const data = Buffer.concat([Buffer.from(GattSpecification.ftms.controlPoint.setResistance),values]);
      await this.writeData(
        GattSpecification.ftms.service,
        GattSpecification.ftms.measurements.controlPoint,
        data
      );
      this.startNotify();
    }
  }
  async stopPowerTarget(): Promise<void> {
    console.log("EN STOP POWER TARGET");
    await this.startTraining()
  }

  async autoMode(enable: boolean): Promise<void> {
    console.log("en el auto mode ",enable)
    if(!enable){
      await this.stopPowerTarget();
    }else{
      await this.resetTraining();
      await this.setPowerTarget(this.powerTarget);
    }
  }

  async getLevelRange(): Promise<Map<string, number> | undefined> {
    if (this.deviceType == "bike") {
      if (this.resistanceRange) {
        return this.resistanceRange;
      }

      const featureRange = await this.getMeasurement(
        GattSpecification.ftms.service,
        GattSpecification.ftms.measurements.powerRange
      );
      if (featureRange) {
        await this.read(featureRange, (values: any) => {
          this.resistanceRange = BikeDataFeatures.resistanceLevel(values);
        });
        this.startNotify();
      }

      return this.resistanceRange;
    }
  }
  async notify(measurement: Characteristic, callback: Function): Promise<void> {
    measurement.on("notify", (state) => {});
    measurement.notify(true, (state) => {
    });

    measurement.on("data", (state: Buffer, isNotify) => {
      callback(state);
    });
  }
  async read(measurement: Characteristic, callback: Function): Promise<void> {
    const values = await measurement.readAsync();
    callback(values);
  }

  async writeData(service: string, char: string, data: Buffer) {
    if (!this.peripheral) {
      return null;
    }

    const characteristic = await this.getMeasurement(service, char);
    if (characteristic) {
    await this.lock.acquire(this.lockKey, async (done:any) => {
        const valueWrite = await characteristic.write(data, false, (error) => {
          if (error) {
            console.error("ERROR ON WRITE ", error);
          }
        });
        done();
        return valueWrite;
      });

    }
  }

  cacheMeasurement =  async (
  ): Promise<void> => {
    if (!this.peripheral) return;
    const values  = await this.peripheral.discoverSomeServicesAndCharacteristicsAsync([],[]);
    this.cachedMeasurement = values.characteristics;
    this.cachedServices = values.services;
  };


  getMeasurement = async (
    serviceId: string,
    charId: string
  ): Promise<Characteristic | undefined> => {

    if (!this.peripheral) return;
    if(this.cachedMeasurement.length == 0 ){
      await this.cacheMeasurement();
    }
    return this.cachedMeasurement.find((char) => char.uuid == charId);
  };


}
