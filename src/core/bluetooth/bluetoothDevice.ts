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

  constructor(deviceId:string, deviceName:string,deviceType: BluetoothDeviceTypes, state: BluetoothDeviceState =BluetoothDeviceState.unknown  ){
    this.id = deviceId;
    this.name = deviceName;
    this.deviceType = deviceType;
    this.state = state;
  };

  static fromPeripheral(peripheral: noble.Peripheral, type: BluetoothDeviceTypes){
    const statePeripheal = BluetoothDeviceState[peripheral.state] || BluetoothDeviceState.disconnected;

    return new BluetoothDevice(peripheral.uuid,peripheral.advertisement.localName,type,statePeripheal)

  }

}
