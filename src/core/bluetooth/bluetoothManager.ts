import noble, { Characteristic, Peripheral } from '@abandonware/noble';
import {  ipcMain } from 'electron';
import { mainWindow } from '../../index';
import {  KnownDevicesData } from "../../helpers/init";
import {BluetoothDevice} from './bluetoothDevice';
import { BluetoothDeviceState, BluetoothDeviceTypes, BTStatus } from './bluetoothDeviceEnum';
import { GattSpecification } from './gattSpecification';

export class BluetoothManager {
  knownDevices: KnownDevicesData | undefined;
  allPeriphealList: Map<string,Peripheral>;
  statusBluetooth = BTStatus.unknown;
  discardDevices: string[];
  autoScan: boolean;
  cacheMeasurement: Map<string,Characteristic[]>;

  constructor() {
    this.autoScan = false; //Controlar condición de carrera, se carga antes la webapp que los dispositivos conocidos
    this.discardDevices =[];
    this.allPeriphealList = new Map<string,Peripheral>;
    this.cacheMeasurement = new Map<string,Characteristic[]>;

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

    this.enableDiscoverDevices();
  }

  loadKnownDevices():void {
    this.knownDevices = KnownDevicesData;

    //ya se permite el auto escaneo
    if(this.autoScan && this.knownDevices != null && this.knownDevices.hasKnownDevices()){
      this.enableAutoScan();
    }
  }

  enableAutoScan():void{
    this.autoScan = true;

    if(this.knownDevices != null && this.knownDevices.hasKnownDevices()){
      this.enableScan();
    }
  }

  //Comprobamos si paramos con el escaneo del dispositivo o continuamos

  stopScanPeripheral = (peripheral: noble.Peripheral|undefined, knownDevice: KnownDevice | undefined): boolean =>{
    //Sino lo tenemos registrado, continuamos
    if(!peripheral){
      return false;
    }
    //Si el dispositivo está desconectado pero tiene conexión automática
    if(peripheral.state == 'disconnected' || peripheral.state == 'disconnecting' && knownDevice?.autoConnect){
      return false;
    }
    return true;
  }

  enableDiscoverDevices = () =>{
    noble.on('discover', async (peripheral) => {
      const deviceId = peripheral.uuid.toLowerCase();
      const knownDevice = this.knownDevices?.getKnownDevice(deviceId);
      /*
      if(this.discardDevices.includes(peripheral.uuid) && knownDevice == undefined){
        return
      }*/
      if(peripheral.advertisement.localName != null && peripheral.advertisement.localName != ""){
        //console.log(" Peripheal DISCOVER  ",peripheral.advertisement.localName);
      }else{
        return
      }
      const foundPeripheral: noble.Peripheral|undefined = this.allPeriphealList.get(deviceId);

      if(this.stopScanPeripheral(foundPeripheral,knownDevice)){
        return
      }

      var bl;
      bl = this.findBluetoothDevice(peripheral);
      if(knownDevice != undefined){
        bl = BluetoothDevice.fromPeripheral(peripheral,knownDevice.deviceType);
      }else{
        bl = this.findBluetoothDevice(peripheral);
      }
      if(bl == null){
        this.discardDevices.push(peripheral.uuid);
        return;
      }
      console.log("emitimos ",bl)
      mainWindow.webContents.send("bluetoothDeviceFound",bl);

      this.allPeriphealList.set(deviceId,peripheral);
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

      if (service != null){
        return  BluetoothDevice.fromPeripheral(peripheral,BluetoothDeviceTypes.Bike);
      }
    }
  }

  isHeartRate = (peripheral: noble.Peripheral): BluetoothDevice| undefined=> {
    if(peripheral.advertisement.serviceUuids != null){
      const service = peripheral.advertisement.serviceUuids.find((e)=> GattSpecification.heartRate.services.includes(e));

      if (service != null){
        return  BluetoothDevice.fromPeripheral(peripheral,BluetoothDeviceTypes.HeartRate);
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
    const foundPeripheral: noble.Peripheral|undefined = this.allPeriphealList.get(id);
    if(foundPeripheral as noble.Peripheral){
      const peripheral = foundPeripheral as noble.Peripheral;
      const deviceType = this.getDeviceType(peripheral.id);
      const bl = BluetoothDevice.fromPeripheral(peripheral,deviceType);

      if(this.knownDevices != null){
        this.knownDevices.addFromBluetoothDevice(bl,false);
      }

      await peripheral.disconnectAsync();
    }
  }

  connect = async (id:string) =>{
    const foundPeripheral: noble.Peripheral|undefined = this.allPeriphealList.get(id);

    if(foundPeripheral as noble.Peripheral){
      const peripheral = foundPeripheral as noble.Peripheral;
      const deviceType = this.getDeviceType(id);

      peripheral.on('connect',(stream) => {
        const bl = BluetoothDevice.fromPeripheral(peripheral,deviceType);

        mainWindow.webContents.send("bluetoothDeviceState",bl);

        if(this.knownDevices != null){
          this.knownDevices.addFromBluetoothDevice(bl,true);
        }

        this.allPeriphealList.set(bl.id,peripheral);

        this.startNotify(peripheral);
      });

      peripheral.on('disconnect',async (stream) => {
        const bl = BluetoothDevice.fromPeripheral(peripheral,deviceType);
        mainWindow.webContents.send("bluetoothDeviceState",bl);

        const measuremnts = this.cacheMeasurement.get(id);
        if(measuremnts){
          measuremnts.forEach((char) => {
            char.notify(false);
            char.removeAllListeners();
          })
        }
        //Desde que emite el disconnect hasta que deja de verse en el discover pasa un tiempo, esperamos para que no haga reconexiones inválidas
       // const sleep = (ms:number) => new Promise(r => setTimeout(r, ms));
      //  await sleep(5000);

        peripheral.removeAllListeners();
        this.allPeriphealList.set(bl.id,peripheral);
      });

      await peripheral.connectAsync();
    }
  }

  startNotify = async (peripheral: noble.Peripheral) => {
    const deviceId = peripheral.id.toLowerCase();
    const {characteristics} = await peripheral.discoverAllServicesAndCharacteristicsAsync();
    const deviceType = this.getDeviceType(deviceId);

    if(deviceType == BluetoothDeviceTypes.HeartRate){
      const hearRateMeasure = await characteristics.find((char) => char.uuid == GattSpecification.heartRate.measurements.heartRate);

      if(hearRateMeasure != null){
        this.cacheMeasurement.set(deviceId,[hearRateMeasure]);
        console.log(`${peripheral.address} (${peripheral.advertisement.localName}): ${hearRateMeasure}%`);
        hearRateMeasure.notify(true, (( state) => {
          console.log("SIIIII EL HEART RATE3  este MEASURE ES ",state,);
        }))

        hearRateMeasure.on('data',(( state:Buffer, isNotify ) => {
          console.log("emitimos esto ",state.readInt8(1))
          var data =  state.readInt8(1); //heart rate measurement
          mainWindow.webContents.send("heartRateData-"+deviceId,data);
        }));

        hearRateMeasure.once('notify', ((state) => {
          console.log("el notifiy state es ",state);
        }));
      }
    }
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
    const peripherals = Array.from(this.allPeriphealList.values());

    peripherals.forEach((peripheral) =>{
      foundDevices.push(peripheral.uuid);
      const deviceType = this.getDeviceType(peripheral.uuid)
      const bl = BluetoothDevice.fromPeripheral(peripheral,deviceType);

      console.log("H****** hola que emitimos en el SYNCDEVICES",bl);
      mainWindow.webContents.send("bluetoothDeviceFound",bl);
    })

    //Devolvemos los dispositivos no encontrados
    const knownDevices = this.knownDevices?.getKnownDevices();

    if(knownDevices != null &&  Object.entries(knownDevices).length > 0)
    Object.keys(knownDevices).forEach(key => {
      const lowerKey = key.toLowerCase();
      if(!foundDevices.includes(lowerKey) && knownDevices[lowerKey] != null){
        const bl = BluetoothDevice.fromKnwonDevice(knownDevices[lowerKey]);
        mainWindow.webContents.send("bluetoothDeviceFound",bl);
      }
    });
  }

  getConnectedDevices = async () =>{
    const devices = Array.from(this.allPeriphealList.values());
    return devices.filter((device) =>{
      return device.state == BluetoothDeviceState.connected;
    })
  }

  startScan = async () =>{
    await noble.stopScanningAsync();
    this.syncDevices();
    this.enableScan();
  }

  getDeviceType = (id:string):BluetoothDeviceTypes => {
    var deviceType = BluetoothDeviceTypes.HeartRate;
    if(this.knownDevices != null){
      const knwon = this.knownDevices.getKnownDevice(id.toLowerCase());
      if(knwon != null){
        deviceType = knwon.deviceType as BluetoothDeviceTypes;
      }
    }
    return deviceType;
  }
}
