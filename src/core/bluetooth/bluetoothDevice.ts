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
  features:string[];
  bikeValues:Map<string,any>;

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
    this.features =[];
    this.bikeValues = new Map<string, any>();
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

        this.notify(beatMeasuerment, (state:Buffer) => {
          var data =  state.readInt8(1); //heart rate measurement
          mainWindow.webContents.send("heartRateData-"+this.id,data);
        })
      }
    }else if(this.deviceType == 'bike'){

      if(this.parserType == 'ftms'){
        const {characteristics}  = await this.peripheral.discoverSomeServicesAndCharacteristicsAsync(GattSpecification.ftms.services,[GattSpecification.ftms.measurements.bikeData] );
        if(characteristics != null && characteristics.length > 0){
          this.cacheMeasurement = characteristics;
          const bikeData = characteristics[0];
          this.notify(bikeData, (state:Buffer) => {
           // console.log("SIiiii los valores de la bicicleta son estos ");
           // console.log(state);

          })
          console.log("Step 3");
        }
      }
    }
  }

  async connect(): Promise<void> {
    if (!this.peripheral){
      return
    }
    this.peripheral.removeAllListeners('connect');
    this.peripheral.removeAllListeners('disconnect');
    this.peripheral.on('connect',async (stream) => {
      console.log("AL CONECTAR EL STREAM TENEMOS ESTO ",stream);
      await this.getFeatures();
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
    if(this.features.length > 0){
      return this.features;
    }

    if(this.deviceType == 'heartrate'){
      this.features = [BluetoothFeatures.HeartRate];
      return this.features;
    }
    else if(this.parserType == 'ftms'){
      this.features = await this.getFeaturesFtms();
      console.log("TEMEMOS DE FEATURES FINAL ",this.features);
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

    if(!this.peripheral){
      return [];
    }
    var features:string[] = [];

    const {characteristics:featureChar} = await this.peripheral.discoverSomeServicesAndCharacteristicsAsync(GattSpecification.ftms.services, [GattSpecification.ftms.measurements.feature]);

    if(featureChar && featureChar.length > 0){
      await this.read(featureChar[0],async (features:any) => {
        this.features = await getFtmsFeatures(features);
      });

    }
    const {characteristics:featureRange} = await this.peripheral.discoverSomeServicesAndCharacteristicsAsync(GattSpecification.ftms.services, [GattSpecification.ftms.measurements.powerRange]);
    if(featureRange && featureRange.length > 0){
      await   this.read(featureRange[0],(values:any) => {
        this.bikeValues.set(BluetoothFeatures.ResistanceLevelTarget ,values.toString());
      });
    }

    const {characteristics:zycleButton} = await this.peripheral.discoverSomeServicesAndCharacteristicsAsync(GattSpecification.ftms.services, [GattSpecification.ftms.measurements.powerRange]);
    if(zycleButton.length > 0 ){
      this.features.push(BluetoothFeatures.ZycleButton );
    }

    return features;
  }
  requestControl():void {
    const data = Buffer.from([0x00]);
    const data2= Buffer.from('');
    console.log("antes de l wreite ");

    const valueWrite = this.peripheral?.writeHandleAsync(data,data2,false);
    console.log("valuewrite ",valueWrite);
  }

  notify(measurement:Characteristic, callback:Function):void{
    measurement.notify(true, (( state) => {
    }))

    measurement.on('data',(( state:Buffer, isNotify ) => {
      callback(state);
    }));

    measurement.once('notify', ((state) => {
    }));
  }
  async read(measurement:Characteristic, callback:Function):Promise<void>{
    const values = await measurement.readAsync();
    callback(values);
  }


}
