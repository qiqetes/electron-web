import noble from '@abandonware/noble';
import { BluetoothDeviceState } from './bluetoothDeviceEnum';
interface BluetoothDeviceInterface {
  // Docs: https://electronjs.org/docs/api/structures/bluetooth-device
  id: string;
  name: string;
  deviceType: BluetoothDeviceTypes;
  state: BluetoothDeviceState;
}


export class BluetoothDevice implements BluetoothDeviceInterface{
  id: string;
  name: string
  deviceType: BluetoothDeviceTypes;
  state: BluetoothDeviceState;
  broadcast: boolean;

  constructor(deviceId:string, deviceName:string,deviceType: BluetoothDeviceTypes, state: BluetoothDeviceState =BluetoothDeviceState.unknown, broadcast:  boolean=false  ){
    this.id = deviceId;
    this.name = deviceName;
    this.deviceType = deviceType;
    this.state = state;
    this.broadcast= broadcast;
  };

  static fromPeripheral(peripheral: noble.Peripheral, type: BluetoothDeviceTypes){
    const statePeripheal = BluetoothDeviceState[peripheral.state] || BluetoothDeviceState.disconnected;
    const broadcast = !peripheral.connectable;
    const id = peripheral.uuid.toLowerCase();

    return new BluetoothDevice(id,peripheral.advertisement.localName,type,statePeripheal, broadcast)
  }
  static fromKnwonDevice(device: KnownDevice){
    const statePeripheal = BluetoothDeviceState.unknown;

    return new BluetoothDevice(device.id,device.name,device.deviceType,BluetoothDeviceState.unknown, device.broadcast)
  }

}
