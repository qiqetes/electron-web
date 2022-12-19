import noble, { Characteristic, Peripheral } from '@abandonware/noble';
import {  ipcMain } from 'electron';
import { mainWindow } from '../../index';
import {  KnownDevicesData } from "../../helpers/init";
import {BluetoothDevice} from './bluetoothDevice';
import { BluetoothDeviceState, BluetoothDeviceTypes, BTStatus } from './bluetoothDeviceEnum';
import { GattSpecification } from './gattSpecification';

export class BluetoothManager {
  knownDevices: KnownDevicesData | undefined;
  allDevicesList: Map<string,BluetoothDevice>;

  statusBluetooth = BTStatus.unknown;
  autoScan: boolean;

  constructor() {
    this.autoScan = false; //Controlar condición de carrera, se carga antes la webapp que los dispositivos conocidos
    this.allDevicesList = new Map<string,BluetoothDevice>;
    this.bluetoothStateChange();

    ipcMain.on("bluetoothStartScan", () => {
      // this.callback("");
      this.startScan();
    });

    ipcMain.on('connectDevice',async(_,id:string)=>{
      this.connect(id);
    });

    ipcMain.on('disconnectDevice',async(_,id:string)=>{
      this.disconnect(id);
    });

    ipcMain.on('syncDevices',async()=>{
      this.syncDevices();
    });

    ipcMain.on('syncStatus',async()=>{
      mainWindow.webContents.send("stateChange",this.statusBluetooth);
    });

    ipcMain.on('enableAutoScan', async()=>{
      this.enableAutoScan();
    });

    ipcMain.on('getFeatures', async(_,id:string)=>{
      this.getFeatures(id);
    });


    this.enableDiscoverDevices();
  }

  loadKnownDevices():void {
    this.knownDevices = KnownDevicesData;

    //ya se permite el auto escaneo
    if(this.autoScan && this.knownDevices != null && this.knownDevices.hasKnownDevices()){
      this.enableAutoScan();
    }
  }

  async getFeatures(deviceId:string): Promise<string[] | undefined> {
    const foundDevice: BluetoothDevice|undefined = this.allDevicesList.get(deviceId);

    if(foundDevice){
      const features = await foundDevice.getFeatures();
      console.log("+****Ç* AL FINAL DE FEATRURES TENEMOES ",features);
      return features;
    }
  }

  enableAutoScan():void{
    this.autoScan = true;

    if(this.knownDevices != null && this.knownDevices.hasKnownDevices()){
      this.enableScan();
    }
  }



  //Comprobamos si paramos con el escaneo del dispositivo o continuamos

  stopScanPeripheral = (device: BluetoothDevice|undefined, knownDevice: KnownDevice | undefined): boolean =>{
    //Sino lo tenemos registrado, continuamos
    if(!device){
      return false;
    }
    //Si el dispositivo está desconectado pero tiene conexión automática
    if(device.state == 'disconnected' && knownDevice?.autoConnect || device.state == 'disconnecting' && knownDevice?.autoConnect){
      return false;
    }
    return true;
  }

  enableDiscoverDevices = () =>{
    noble.on('discover', async (peripheral) => {
      const deviceId = peripheral.uuid.toLowerCase();
      const knownDevice = this.knownDevices?.getKnownDevice(deviceId);

      if((peripheral.advertisement.localName != null && peripheral.advertisement.localName != "") || knownDevice != null ){
        console.log(" Peripheal DISCOVER  ",peripheral.advertisement.localName);
      }else{
        //console.log(" Peripheal DISCOVER NOT FOUND  ",peripheral.id);

        return
      }

      const foundDevice: BluetoothDevice| undefined = this.allDevicesList.get(deviceId);
      if(this.stopScanPeripheral(foundDevice,knownDevice)){
        return
      }

      var bl;
      bl = this.findBluetoothDevice(peripheral);
      if(knownDevice != undefined){
        bl = BluetoothDevice.fromPeripheral(peripheral, knownDevice.deviceType, knownDevice.parserType);
      }else{
        bl = this.findBluetoothDevice(peripheral);
      }
      if(bl == null){
        return;
      }
      console.log("emitimos ",bl.serialize())
      mainWindow.webContents.send("bluetoothDeviceFound",bl.serialize());

      this.allDevicesList.set(deviceId,bl);
      //Autoconnect
      if(knownDevice != null && knownDevice.autoConnect){
        this.connect(deviceId);
      }
      //this.ipcMain.emit("bluetoothDeviceFound",bl)
      console.log("emitido")
    });
  }

  findBluetoothDevice =(peripheal: noble.Peripheral): BluetoothDevice| undefined=>{

    blDevice = this.isBike(peripheal);

    if(blDevice != null){
      return blDevice;
    }else{
      var blDevice = this.isHeartRate(peripheal);
    }

    return blDevice;
  }
  isBike = (peripheral: noble.Peripheral): BluetoothDevice| undefined => {
    if(peripheral.advertisement.serviceUuids != null){

      const service = peripheral.advertisement.serviceUuids.find((e)=> GattSpecification.ftms.services.includes(e));
      var typeParser: BluetoothParserType = 'ftms';
      if (service != null){
        return  BluetoothDevice.fromPeripheral(peripheral,BluetoothDeviceTypes.Bike,typeParser);
      }
    }
  }

  isHeartRate = (peripheral: noble.Peripheral): BluetoothDevice| undefined=> {
    if(peripheral.advertisement.serviceUuids != null){
      const service = peripheral.advertisement.serviceUuids.find((e)=> GattSpecification.heartRate.services.includes(e));
      var typeParser: BluetoothParserType = 'heartrate';

      if (service != null){
        return  BluetoothDevice.fromPeripheral(peripheral,BluetoothDeviceTypes.HeartRate,typeParser);
      }else{
        //ver por nombre
      }
    }
  }
  // await peripheral.disconnectAsync();
    //proces
  enableScan = () => {
    if(this.statusBluetooth == BTStatus.poweredOn){
      noble.startScanningAsync([], true);
    }
  }

  disconnect = async (id:string) =>{
    const foundDevice: BluetoothDevice|undefined = this.allDevicesList.get(id);

    if(foundDevice && foundDevice as BluetoothDevice){
      if(this.knownDevices != null){
        this.knownDevices.addFromBluetoothDevice(foundDevice,false);
      }

      await foundDevice.disconnect();
    }
  }

  connect = async (id:string) =>{
    const foundDevice: BluetoothDevice|undefined = this.allDevicesList.get(id);

    if(!foundDevice || !foundDevice?.peripheral){
      return;
    }
    if(this.knownDevices)
    this.knownDevices.addFromBluetoothDevice(foundDevice,true);

    await foundDevice.connect();
  }

  bluetoothStateChange = async () =>{
    this.statusBluetooth = noble.state;
    noble.on('stateChange', async (state) => {
      this.statusBluetooth = state;
      mainWindow.webContents.send("stateChange",state);
    });
  }

  //Devolvemos todos los dispositivos que hemos encontrado, junto con los que ya conocemos
  syncDevices = async () =>{
    let foundDevices: string[] = [];
    const devices = Array.from(this.allDevicesList.values());

    devices.forEach((device) =>{
      foundDevices.push(device.id);
      mainWindow.webContents.send("bluetoothDeviceFound",device.serialize());
    })

    //Devolvemos los dispositivos no encontrados
    const knownDevices = this.knownDevices?.getKnownDevices();

    if(knownDevices != null &&  Object.entries(knownDevices).length > 0)
    Object.keys(knownDevices).forEach(key => {
      const lowerKey = key.toLowerCase();
      if(!foundDevices.includes(lowerKey) && knownDevices[lowerKey] != null){
        const bl = BluetoothDevice.fromKnwonDevice(knownDevices[lowerKey]);
        mainWindow.webContents.send("bluetoothDeviceFound",bl.serialize());
      }
    });
  }

  getConnectedDevices = async () =>{
    const devices = Array.from(this.allDevicesList.values());
    return devices.filter((device) =>{
      return device.state == BluetoothDeviceState.connected;
    })
  }

  startScan = async () =>{
    await noble.stopScanningAsync();
    this.syncDevices();
    this.enableScan();
  }

  getDeviceType = (id:string): [BluetoothDeviceTypes,BluetoothParserType] => {
    var deviceType = BluetoothDeviceTypes.HeartRate;
    var parserType: BluetoothParserType = 'heartrate';

    if(this.knownDevices != null){
      const knwon = this.knownDevices.getKnownDevice(id.toLowerCase());
      if(knwon != null){
        deviceType = knwon.deviceType as BluetoothDeviceTypes;
      }
    }
    return [deviceType,parserType] ;
  }
}
