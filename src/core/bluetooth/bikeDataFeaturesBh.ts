import { listToBinary, listToInt } from "./bluetoothDataParser";
import { BluetoothFeatures } from "./bluetoothFeatures";

export class BikeDataFeaturesBh {
  static SPEED = BluetoothFeatures.Speed;

  static RESISTANCE = BluetoothFeatures.Resistance;
  static CADENCE = BluetoothFeatures.Cadence;
  static POWER = BluetoothFeatures.Power;
  static RESISTANCE_TARGET = BluetoothFeatures.ResistanceTarget;
  static SPIN_DOWN = BluetoothFeatures.SpinDown;
  static WHEEL_CIRCUNFERENCE = BluetoothFeatures.WheelCircunference;
  static BIKE_SIMILATION = BluetoothFeatures.BikeSimulation;
  static RESISTENCE_LEVEL_RANGE = BluetoothFeatures.ResistanceLevelTarget;
  /* Lista ordenadas de características */
  static orderFeatures: string[] = [
    BluetoothFeatures.Speed,
    BluetoothFeatures.Resistance,
    BluetoothFeatures.Cadence,
    BluetoothFeatures.Power,
    BluetoothFeatures.ResistanceTarget,
    BluetoothFeatures.SpinDown,
    BluetoothFeatures.WheelCircunference,
    BluetoothFeatures.BikeSimulation,
  ];

  /* Lista de tamaño de bits por cada carácteristica*/
  static sizeFeature: Map<string, number> = new Map([
    [BluetoothFeatures.Speed, 16],
    [BluetoothFeatures.Resistance, 16],
    [BluetoothFeatures.Cadence, 16],
    [BluetoothFeatures.Power, 16],
    [BluetoothFeatures.ResistanceTarget, 16],
    [BluetoothFeatures.SpinDown, 16],
    [BluetoothFeatures.WheelCircunference, 16],
    [BluetoothFeatures.BikeSimulation, 16],
  ]);

  valuesFeatures = (intValues: number[]): Map<string, number> => {
    const featureRead = new Map<string, number>();
    const features = BikeDataFeaturesBh.orderFeatures;
    let currentBit = 16;
    const bitsValues = listToBinary(intValues);

    features.forEach((feature) => {
      const numBits = BikeDataFeaturesBh.sizeFeature.get(feature)!;
      const toBits = currentBit + numBits;
      featureRead.set(
        feature,
        this.parseValue(listToInt(bitsValues, currentBit, toBits)!, feature)
      );
      currentBit = toBits;
    });
    return featureRead;
  };

  updateValueSuscription(values: number[]) {
    // console.log("values to update", values);
    const bikeValues = new Map<string, any>();
    if (values.length > 2) {
      bikeValues.set(
        BluetoothFeatures.Speed,
        values[3] + (1.0 * values[4]) / 100.0
      );
      bikeValues.set(BluetoothFeatures.Resistance, values[5]);
      bikeValues.set(BluetoothFeatures.Cadence, values[7]);
      bikeValues.set(BluetoothFeatures.Power, values[8] * 256 + values[9]);
    }
    return bikeValues;
  }
  parseValue = (value: number, feature: string): number => {
    let realValue: number;
    switch (feature) {
      case BikeDataFeaturesBh.SPEED:
        realValue = this.parseSpeed(value);
        break;
      case BikeDataFeaturesBh.CADENCE:
        realValue = this.parseCadence(value);
        break;
      case BikeDataFeaturesBh.POWER:
        realValue = this.parsePower(value);
        break;

      default:
        realValue = value;
        break;
    }
    return realValue;
  };

  // Kilometer per hour with a resolution of 0.01
  parseSpeed = (value: number): number => {
    return value;
  };

  //Watts with a resolution of 1
  parsePower = (value: number): number => {
    return value;
  };

  //minute with a resolution of 0.5
  parseCadence = (value: number): number => {
    return Math.ceil(value / 2);
  };
}
