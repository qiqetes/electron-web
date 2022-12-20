import { existsSync } from "original-fs";
import { getAvailableFeatures, intToBinary, listToBinary, listToInt } from "./bluetoothDataParser";

export class BikeDataFeatures {
  static  SPEED = "Velocidad";
  static  AVG_SPEED = "Velocidad media";
  static  CADENCE = "Cadencia";
  static  AVG_CADENCE = "Cadencía media";
  static  DISTANCE = "Distancia";
  static  RESISTANCE = "Resistencia";
  static  POWER = "Potencia";
  static  ENERGY = "Calorías";
  static  TOTAL_ENERGY = "Calorías totales";
  static  ENERGY_PER_HOUR = "Calorías por hora";
  static  ENERGY_PER_MINUTE = "Calorías por minuto";
  static  HEART_RATE = "Heart Rate";
  static  METABOLIC = "Metabolic";
  static  ELAPSED_TIME = "Elapsed time";
  static  REMAINING_TIME = "Remaining time";


  /* Lista ordenadas de características */
  static  orderFeatures:string[] = [
    this.SPEED,
    this.AVG_SPEED,
    this.CADENCE,
    this.AVG_CADENCE,
    this.DISTANCE,
    this.RESISTANCE,
    this.POWER,
    this.ENERGY,
    this.HEART_RATE,
    this.METABOLIC,
    this.ELAPSED_TIME,
    this.REMAINING_TIME
  ];
  /* Lista de tamaño de bits por cada carácteristica*/
  static  sizeFeature: Map<string,number> =  new Map([
    [this.SPEED, 16],
    [this.AVG_SPEED, 16],
    [this.CADENCE, 16],
    [this.AVG_CADENCE, 16],
    [this.DISTANCE, 24],
    [this.RESISTANCE, 16],
    [this.POWER, 16],
    [this.ENERGY, 40],
    [this.HEART_RATE, 8],
    [this.TOTAL_ENERGY, 16],
    [this.ENERGY_PER_HOUR, 16],
    [this.ENERGY_PER_MINUTE, 8],
    [this.METABOLIC, 8],
    [this.ELAPSED_TIME, 16],
    [this.REMAINING_TIME, 16]]);

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


  static resistanceLevel = (intValues:number[]):Map<String, number> => {
    let resistanceData = new Map<String, number>();

    console.log("EEEII QUE ESTAMOS EN RESISTANCE LEVEL ",intValues);
    if (intValues.length == 6) {
      const bitsValues = listToBinary(intValues);
      console.log("DE BITS VALUES TENEMOS ESTO ",bitsValues);
      resistanceData.set('min' ,
          listToInt(bitsValues, 0, 16)!);
      resistanceData.set('max',
          listToInt(bitsValues,  16, 32)!);
      resistanceData.set('increment',
          listToInt(bitsValues, 32,48)!);
    }
    console.log("AL FINAL TENEMOS ",resistanceData);
    existsSync

    return resistanceData;
  }


  getCurrentFeatures = (features:number[]):string[] =>  {
    if(features.length < 2){
      return [];
    }
    const featuresBits = intToBinary(features[0]).reverse().concat(intToBinary(features[1]).reverse());

    return getAvailableFeatures(
        featuresBits,
        BikeDataFeatures.orderFeatures,
        this.activeValueFeatures);
  }

  valuesFeatures = (intValues: number[]):Map<string,number> => {
    const featureRead = new Map<string, number>();
    const features = this.getCurrentFeatures(intValues);
    let  currentBit = 16;
    const bitsValues = listToBinary(intValues);

    features.forEach((feature) => {
      let numBits = BikeDataFeatures.sizeFeature.get(feature)!;
      let toBits = currentBit + numBits;
      // Energy tiene 3 valores
      if (feature != BikeDataFeatures.ENERGY) {
        featureRead.set(feature,this.parseValue(
            listToInt(bitsValues,
                currentBit,toBits)!,
            feature));
      } else {
        //TODO añadir logica para los tipos de energy

      }
      currentBit = toBits;
    });
    return featureRead;
  }


  parseValue = (value: number, feature: string): number => {
    let realValue:number;
    switch (feature) {
      case BikeDataFeatures.SPEED:
      case BikeDataFeatures.AVG_SPEED:
        realValue = this.parseSpeed(value);
        break;
      case BikeDataFeatures.DISTANCE:
        realValue = this.parseDistance(value);
        break;

      case BikeDataFeatures.CADENCE:
      case BikeDataFeatures.AVG_CADENCE:
        realValue = this.parseCadence(value);
        break;
      case BikeDataFeatures.POWER:
        realValue = this.parsePower(value);
        break;
      case BikeDataFeatures.ENERGY:
      case BikeDataFeatures.ENERGY_PER_HOUR:
      case BikeDataFeatures.ENERGY_PER_MINUTE:
        realValue = this.parseEnergy(value);
        break;
      case BikeDataFeatures.METABOLIC:
        realValue = this.parseMetabolic(value);
        break;
      case BikeDataFeatures.ELAPSED_TIME:
      case BikeDataFeatures.REMAINING_TIME:
        realValue = this.parseMetabolic(value);
        break;
      default:
        realValue = value;
        break;
    }
    return realValue;
  }

  ///minute with a resolution of 0.5
  parseCadence = (value:number):number => {
    return Math.ceil( value / 2);
  }

  // Kilometer per hour with a resolution of 0.01
  parseSpeed = (value:number):number =>  {
    return value;
  }

  //Meters with a resolution of 1
  parseDistance = (value: number):number =>  {
    return value;
  }

  //Unitless with a resolution of 1
 parseResistance = (value:number):number => {
    return value;
  }

  //Watts with a resolution of 1
  parsePower = (value:number):number => {
    return value;
  }

  //Kilo Calorie with a resolution of 1
  parseEnergy = (value:number):number =>  {
    return value;
  }

  //Beats per minute with a resolution of 1
  parseHearRate = (value:number):number => {
    return value;
  }

  //Metabolic Equivalent with a resolution of 0.1
  parseMetabolic = (value:number):number => {
    return value;
  }

  //Second with a resolution of 1
  parseTime = (value:number):number =>  {
    return value;
  }
}
