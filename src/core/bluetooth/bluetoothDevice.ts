import noble, { Characteristic, Peripheral } from '@abandonware/noble';
import { mainWindow } from '../../index';
import { BluetoothDeviceState } from './bluetoothDeviceEnum';
import { BluetoothFeatures, getFtmsFeatures } from './bluetoothFeatures';
import { GattSpecification } from './gattSpecification';
interface BluetoothDeviceInterface {
  // Docs: https://electronjs.org/docs/api/structures/bluetooth-device
  id: string;
  broadcast: boolean;
  parserType: BluetoothParserType;
  peripheral: Peripheral|undefined;
  cacheMeasurement: Characteristic[];
  getId():string;
  getName():string;
  getDeviceType():BluetoothDeviceTypes;
  getState():BluetoothDeviceState;
  getFeatures():Promise<string[]|undefined>;
  connect(): void;
  disconnect():void;
  startNotify():void;
  serialize():{};
}


export class BluetoothDevice implements BluetoothDeviceInterface{
  id: string;
  name: string
  deviceType: BluetoothDeviceTypes;
  state: BluetoothDeviceState;
  broadcast: boolean;
  parserType: BluetoothParserType;
  peripheral: Peripheral|undefined;
  cacheMeasurement: Characteristic[];
  notifing: boolean;

  constructor(deviceId:string, deviceName:string,deviceType: BluetoothDeviceTypes, state: BluetoothDeviceState =BluetoothDeviceState.unknown, parserType: BluetoothParserType,peripheral: Peripheral|undefined, broadcast:  boolean=false  ){
    this.id = deviceId;
    this.name = deviceName;
    this.deviceType = deviceType;
    this.state = state;
    this.broadcast= broadcast;
    this.parserType = parserType;
    this.peripheral = peripheral;
    this.cacheMeasurement = [];
    this.notifing = false;
  }
  serialize(): {} {
    return {
      id:this.getId(),
      name:this.getName(),
      deviceType: this.getDeviceType(),
      state: this.getState(),
      broadcast: this.broadcast
    }
  }
    async startNotify(): Promise<void> {
      console.log("Step 0");

    if(!this.peripheral){
      return
    }
    this.peripheral.removeAllListeners('serviceDiscover');

    if(this.deviceType == 'heartrate'){
      const {characteristics}  = await this.peripheral.discoverSomeServicesAndCharacteristicsAsync(GattSpecification.heartRate.services,[GattSpecification.heartRate.measurements.heartRate] );
      if(characteristics != null && characteristics.length > 0){
        this.cacheMeasurement = characteristics;
        const beatMeasuerment = characteristics[0];
        console.log("Step 3");

        console.log(`${this.peripheral.address} (${this.peripheral.advertisement.localName}): ${beatMeasuerment}%`);
        beatMeasuerment.notify(true, (( state) => {
          console.log("SIIIII EL HEART RATE3  este MEASURE ES ",state,);
        }))

        beatMeasuerment.on('data',(( state:Buffer, isNotify ) => {
          console.log("emitimos esto ",state.readInt8(1))
          var data =  state.readInt8(1); //heart rate measurement
          mainWindow.webContents.send("heartRateData-"+this.id,data);
        }));

        beatMeasuerment.once('notify', ((state) => {
          console.log("el notifiy state es ",state);
        }));
      }
    }else if(this.deviceType == 'bike'){

      if(this.parserType == 'ftms'){
        const {characteristics}  = await this.peripheral.discoverSomeServicesAndCharacteristicsAsync(GattSpecification.ftms.services,[GattSpecification.ftms.measurements.bikeData] );

      }
    }
  }

  async connect(): Promise<void> {
    if (!this.peripheral){
      return
    }
    this.peripheral.removeAllListeners('connect');
    this.peripheral.removeAllListeners('disconnect');
    this.peripheral.on('connect',(stream) => {
      console.log("AL CONECTAR EL STREAM TENEMOS ESTO ",stream);
      this.state =  BluetoothDeviceState[this.peripheral!.state];
      mainWindow.webContents.send("bluetoothDeviceState",this.serialize());

      this.startNotify();
    });

    this.peripheral.on('disconnect',async (stream) => {
      this.state =  BluetoothDeviceState[this.peripheral!.state];
      mainWindow.webContents.send("bluetoothDeviceState",this.serialize());

      const measuremnts = this.cacheMeasurement;
      if(measuremnts){
        measuremnts.forEach((char) => {
          char.notify(false);
          char.removeAllListeners();
        })
      }
      //Desde que emite el disconnect hasta que deja de verse en el discover pasa un tiempo, esperamos para que no haga reconexiones inválidas
      // const sleep = (ms:number) => new Promise(r => setTimeout(r, ms));
    //  await sleep(5000);
        this.peripheral!.removeAllListeners();
      }
    );

    await this.peripheral.connectAsync();
  }

  async disconnect(): Promise<void> {
    if(this.peripheral){
      await this.peripheral.disconnectAsync();
    }
  }

  async getFeatures():Promise<string[] | undefined> {
    if(this.deviceType == 'heartrate'){
      return [BluetoothFeatures.HeartRate];
    }
    else if(this.parserType == 'ftms'){
      await this.getFeaturesFtms();
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

    if(!this.peripheral){
      return [];
    }
    var features:string[] = [];

    const {characteristics} = await this.peripheral.discoverSomeServicesAndCharacteristicsAsync(GattSpecification.ftms.services, [GattSpecification.ftms.measurements.feature]);

    if(characteristics){
      characteristics.forEach(async (char) => {
        const values = await char.readAsync();
        features = getFtmsFeatures(values);
      })
    }
    return features;
  }

  static fromPeripheral(peripheral: noble.Peripheral, type: BluetoothDeviceTypes, parserType: BluetoothParserType){
    const statePeripheal = BluetoothDeviceState[peripheral.state] || BluetoothDeviceState.disconnected;
    const broadcast = !peripheral.connectable;
    const id = peripheral.uuid.toLowerCase();


    return new BluetoothDevice(id,peripheral.advertisement.localName,type,statePeripheal,parserType, peripheral, broadcast)
  }
  static fromKnwonDevice(device: KnownDevice){
    const statePeripheal = BluetoothDeviceState.unknown;

    return new BluetoothDevice(device.id,device.name, device.deviceType,BluetoothDeviceState.unknown, device.parserType, undefined, device.broadcast)
  }

}
