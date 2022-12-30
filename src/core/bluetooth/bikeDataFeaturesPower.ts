import { getAvailableFeatures, intToBinary, listToBinary, listToInt } from "./bluetoothDataParser";
import { BluetoothFeatures } from "./bluetoothFeatures";

export class BikeDataFeaturesPower {

  /* Lista ordenadas de características */
  static  orderFeatures:string[] = [
    BluetoothFeatures.PowerBalance,
    BluetoothFeatures.PowerBalanceReference,
    BluetoothFeatures.Torque,
    BluetoothFeatures.TorqueSource,
    BluetoothFeatures.WheelRevolution,
    BluetoothFeatures.CrankRevolution,
    BluetoothFeatures.ExtremesForcesMagnitudes,
    BluetoothFeatures.ExtremesTorqueMagnitures,
    BluetoothFeatures.ExtremesAngles,
    BluetoothFeatures.TopDeadSpotAngles,
    BluetoothFeatures.BottomDeadSpotAngles,
    BluetoothFeatures.Energy,
    BluetoothFeatures.OffsetCompensationIndicator
  ];


  /* Lista de tamaño de bits por cada carácteristica*/
  static  sizeFeature: Map<string,number> =  new Map([
    [BluetoothFeatures.Power, 16],
    [BluetoothFeatures.PowerBalance, 89],
    [BluetoothFeatures.PowerBalanceReference, 0],
    [BluetoothFeatures.Torque, 16],
    [BluetoothFeatures.TorqueSource, 0],
    [BluetoothFeatures.WheelRevolution, 48],
    [BluetoothFeatures.CrankRevolution, 32],
    [BluetoothFeatures.ExtremesForcesMagnitudes, 32],
    [BluetoothFeatures.ExtremesTorqueMagnitures, 32],
    [BluetoothFeatures.ExtremesAngles, 24],
    [BluetoothFeatures.TopDeadSpotAngles, 16],
    [BluetoothFeatures.BottomDeadSpotAngles, 16],
    [BluetoothFeatures.Energy, 16],
    [BluetoothFeatures.OffsetCompensation, 0]]);

  /* Lista ordenadas de valores para que esté activa las carácteristicas */
  activeValueFeatures: number[] = [
    0,
    1,
    1, // mirar esto que se supone que es 0
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1
  ];


  getCurrentFeatures = (features:number[]):string[] =>  {
    if(features.length < 2){
      return [];
    }
    const featuresBits = intToBinary(features[0]).reverse().concat(intToBinary(features[1]).reverse());

    return getAvailableFeatures(
        featuresBits,
        BikeDataFeaturesPower.orderFeatures,
        this.activeValueFeatures);
  }

  valuesFeatures = (intValues: number[]):Map<string,number> => {
    const featureRead = new Map<string, number>();
    const features = this.getCurrentFeatures(intValues);
    let  currentBit = 16;
    const bitsValues = listToBinary(intValues);
    features.unshift(BluetoothFeatures.Power);

    features.forEach((feature) =>  {
      if (BikeDataFeaturesPower.sizeFeature.get(feature) != null) {
        const numBits = BikeDataFeaturesPower.sizeFeature.get(feature)||0;
        let toBits = currentBit + numBits;
        if (feature == BluetoothFeatures.CrankRevolution) {
          const crankValue = listToInt(bitsValues,
              currentBit, currentBit + 15);
          const crankTimestamp = listToInt(bitsValues,
               currentBit + 16, toBits);

          if (crankValue != null) {
            featureRead.set(BluetoothFeatures.CrankValue, crankValue);
          }
          if (crankTimestamp != null) {
            featureRead.set(BluetoothFeatures.CrankTimestamp, crankTimestamp);
          }
        } else if (feature == BluetoothFeatures.Power) {
          featureRead.set(feature, listToInt(bitsValues,  currentBit,  toBits)!);
        }
        currentBit = toBits;
      }
    });
    return featureRead;
  }


}
