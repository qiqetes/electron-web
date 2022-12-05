import noble, { Peripheral } from '@abandonware/noble';
import {  IpcMain, IpcRenderer } from 'electron';
import { mainWindow } from '../../index';
import {BluetoothDevice} from './bluetoothDevice';
import { BluetoothDeviceState, BluetoothDeviceTypes, bluetoothState } from './bluetoothDeviceEnum';

export class BluetoothManager {
  allPeriphealList: Map<string,noble.Peripheral>;
  statusBluetooth = bluetoothState.unknown;

  constructor(readonly ipcMain: IpcMain) {
    this.ipcMain = ipcMain;
    this.allPeriphealList = new Map<string,noble.Peripheral>;

    ipcMain.on("bluetoothStartScan", () => {
      console.log("^^^^^ÂSDF Â^SD ^F A^SDF A^S DF^SD^F D^S")
      // this.callback("");
      this.startScan();
    });

    ipcMain.on('connectDevice',async(_,id:string)=>{
      console.log("estamo sen el connecte decies ");
      this.connect(id);
    });

    ipcMain.on('disconnectDevice',async(_,id:string)=>{
      console.log("estamo sen el connecte decies ");
      this.disconnect(id);
    });
  }


  disconnect = async (id:string) =>{
    console.log("SIIIIII DESCONECTAMOS ESTO");
    const foundPeripheral: noble.Peripheral|undefined = this.allPeriphealList.get(id);
    console.log("el id es este ",id,foundPeripheral);
    if(foundPeripheral as noble.Peripheral){
      const peripheral = foundPeripheral as noble.Peripheral;
      await peripheral.disconnectAsync();
    }
  }

  connect = async (id:string) =>{
    const foundPeripheral: noble.Peripheral|undefined = this.allPeriphealList.get(id);
    if(foundPeripheral as noble.Peripheral){
      const peripheral = foundPeripheral as noble.Peripheral;

      peripheral.on('connect',(stream) => {
        const bl = BluetoothDevice.fromPeripheral(peripheral,BluetoothDeviceTypes.HeartRate);
        mainWindow.webContents.send("bluetoothDeviceState",bl);
        this.allPeriphealList.set(bl.id,peripheral);
      });

      peripheral.on('disconnect',(stream) => {
        const bl = BluetoothDevice.fromPeripheral(peripheral,BluetoothDeviceTypes.HeartRate);
        mainWindow.webContents.send("bluetoothDeviceState",bl);
        this.allPeriphealList.set(bl.id,peripheral);
      });

      await peripheral.connectAsync();

      const {characteristics} = await peripheral.discoverSomeServicesAndCharacteristicsAsync([], []);
      console.log("de char ",characteristics)
      const hearRateMeasure = await characteristics.find((char) => char.uuid=='2a37');
      console.log("el measure conseguido es este ",hearRateMeasure)
      if(hearRateMeasure != null){
        console.log(`${peripheral.address} (${peripheral.advertisement.localName}): ${hearRateMeasure}%`);
        hearRateMeasure.notify(true, (( state) => {
          console.log("SIIIII EL HEART RATE3  este MEASURE ES ",state,);
        }))

        hearRateMeasure.on('data',(( state:Buffer, isNotify ) => {
          console.log("SIIIII EL HEART RATE2 este MEASURE ES ",state, "y isNotify",isNotify);
          console.log("el length es ",state.length);

          console.log(" el 0 es ",state.readInt8(0));
          console.log(" el 1 es ",state.readInt8(1)); //Heart rate
          var data =  state.readInt8(1);

          mainWindow.webContents.send("heartRateData",data);

          //return this.ipcMain.emit("dataRate",state.readInt8(1) );

          //callback(state.readInt8(1));
          console.log(" el 2 es ",state.readInt8(2));
          console.log(" el 3 es ",state.readInt8(3));
        }));

        hearRateMeasure.once('notify', ((state) => {
          console.log("SIIIII EL HEART RATE MEASURE ES ",state);
        }));
      }
    }
  }

  bluetoothStateChange = async () =>{
    noble.on('stateChange', async (state) => {
      this.statusBluetooth = state;
      mainWindow.webContents.send("stateChange",state);
    });
  }

  getConnectedDevices = async () =>{
    const devices = Array.from(this.allPeriphealList.values());
    console.log("eieiiiiiiIA SDFIA QUE SIIII ESTAMOS EN EL GET CONNECTED DEVICES ");
    console.log(devices);
    return devices.filter((device) =>{
      return device.state == BluetoothDeviceState.connected;
    })


  }
 startScan = async () =>{
  const BLE= "BLUETOOTH: ";
  //Vamos a probar aqui los dispositivos
  console.log(BLE+"state ",noble.state);
  console.log(BLE+"START SCANING ");

  (await this.getConnectedDevices()).forEach((peripheral) =>{
    const bl = BluetoothDevice.fromPeripheral(peripheral,BluetoothDeviceTypes.HeartRate);
    console.log("emitimos ",bl)
    mainWindow.webContents.send("bluetoothDeviceFound",bl);
  });
  noble.on('stateChange', async (state) => {
    console.log(BLE+"stateChange ",state);
    if (state === bluetoothState.poweredOn) {
      await noble.startScanningAsync(['180d'], false);
    }
  });



  noble.on('discover', async (peripheral) => {
    if(peripheral.advertisement.localName != null && peripheral.advertisement.localName != ""){
      console.log(BLE+" Peripheal DISCOVER  ",peripheral.advertisement.localName);
    }else{
      return
    }

    console.log("eiiii que estamos aquiii con ",peripheral);
    const bl = BluetoothDevice.fromPeripheral(peripheral,BluetoothDeviceTypes.HeartRate);
    console.log("emitimos ",bl)
    mainWindow.webContents.send("bluetoothDeviceFound",bl);
    if(!this.allPeriphealList.get(bl.id)){
      this.allPeriphealList.set(bl.id,peripheral);
    }
    //this.ipcMain.emit("bluetoothDeviceFound",bl)
    console.log("emitido")

    await noble.stopScanningAsync();


   // await peripheral.disconnectAsync();
    //process.exit(0);
  });
  if(this.statusBluetooth == bluetoothState.poweredOn){
    await noble.startScanningAsync(['180d'], false);
  }
}

}
