/*Byte 0: estado general
    Byte 1 a 4: posición del motor en pasos (entero de 32 bits)
    Byte 5: estado de los sensores de paso por cero de la unidad de resistencia
    Byte 6 y Byte 7: Velocidad de giro del disco de inercia en RPM (entero de 16 bits)
    Byte 8 y Byte 9: Potencia instantánea generada por el rodillo (entero de 16 bits)
    Byte 10 y Byte 11: temperatura del rodillo en centésimas de grado (entero de 16 bits)  (0x09C4 --> 25 grados)
    Byte 12: estado actual del nivel de resistencia
    Byte 13: modo de trabajo del rodillo
  */

import { listToBinary, listToInt } from "./bluetoothDataParser";

export class ZycleButton {

  position?:number;
  mode:Map<number, ButtonMode>;
  lastMode?:number;

  constructor(){
    this.mode = new Map<number, ButtonMode>();
  }
  /* typo de orden de los bytes*/
  static  orderBytes:OrderBytes = 'lso';
  static  GENERAL_STATUS = "Estado general";
  static  POSITION_MOTOR = "Posición del motor";
  static  SENSOR_STATUS = "Estado de los sensores";
  static  SPEED = "Velocidad de giro";
  static  WATTS = "Potencia instantanea";
  static  TEMPERATURE = "Temperatura del rodillo";
  static  LEVEL = "Nivel de resistencia";
  static  MODE = "Modo de trabajo";

  /* Lista ordenadas de características */
  static  orderFeatures:string[] = [
    ZycleButton.GENERAL_STATUS, //estado general
    ZycleButton.POSITION_MOTOR,
    ZycleButton.SENSOR_STATUS,
    ZycleButton.SPEED,
    ZycleButton.WATTS,
    ZycleButton.TEMPERATURE,
    ZycleButton.LEVEL,
    ZycleButton.MODE
  ];
  /* Lista de tamaño de bits por cada carácteristica*/
  static  sizeFeature:Map<string,number> = new Map([
    [ZycleButton.GENERAL_STATUS, 8],
    [ZycleButton.POSITION_MOTOR, 32],
    [ZycleButton.SENSOR_STATUS, 8],
    [ZycleButton.SPEED, 16],
    [ZycleButton.WATTS, 16],
    [ZycleButton.TEMPERATURE, 16],
    [ZycleButton.LEVEL, 8],
    [ZycleButton.MODE, 8]]);

  static  valuesFeatures= (intValues:number[]):Map<string,number> => {
    const valuesFeature = new Map<string, number>();

    let currentBit = 0;
    const bitsValues = listToBinary(intValues);
    ZycleButton.orderFeatures.forEach((feature) =>  {
      const numBits = ZycleButton.sizeFeature.get(feature) ?? 0;
      const toBits = currentBit + numBits;
      // Energy tiene 3 valores
      const value = ZycleButton.parseValue(
        listToInt(bitsValues,
             currentBit, toBits)!,
        feature);
      valuesFeature.set(feature, value);
      currentBit = toBits;
    });
    return valuesFeature;
  }

  // De momento solo se devuelve el dato sin parsear
  static  parseValue = (value:number, feature:string):number  => {
    return value;
  }


  changeValues(dataController:Map<string,number>) {
    const newPosition = dataController.get(ZycleButton.LEVEL);
    const currentMode = dataController.get(ZycleButton.MODE);
    let changeValue = false;

    // Seteamos valores iniciales.
    if (currentMode && this.mode.get(currentMode) == null ||
        (currentMode && !this.mode.get(currentMode)!.hasValues() && newPosition != null)) {
     const newMode = new  ButtonMode(currentMode);
     newMode.addPosition(newPosition!);
     this.mode.set(currentMode, newMode);
      // Si hay cambio en la posición del los botones ( ha habido pulsaciones)
    } else if (currentMode && this.mode.get(currentMode)?.hasValues() &&
        newPosition != null &&
        this.mode.get(currentMode)!.isDifferent(newPosition)) {
          const mode = this.mode.get(currentMode);
          if(mode){
            mode.addPosition(newPosition);
            this.mode.set(currentMode,mode);
          }
      changeValue = true;
      // Si ya ha terminado el cambio del motor
    }
    if (this.lastMode == null || (this.lastMode != currentMode)) {
      this.lastMode = currentMode;
      changeValue = false;
    }

    return changeValue;
  }

  toJson():Map<string,number>|{} {
    if (this.lastMode != null && this.mode.get(this.lastMode) != null) {
      const data  = {
      'mode': this.lastMode,
      'position': this.mode.get(this.lastMode)!.position,
      'value': this.mode.get(this.lastMode)!.value
    }
      return data;
    }
    return {};
  }
}


export class ButtonMode {
  static AUTO = 2;
  static MANUAL = 1;

  mode:number;
  position?:number;
  value:number;

  constructor(mode:number, position?:number) {
    this.mode = mode;
    this.position = position;
    this.value = 0;
  }

   hasValues():boolean {
    return this.position != null;
  }

  isDifferent(newPosition:number):boolean {
    return this.position != newPosition;
  }

  addPosition(newPosition:number) {
    this.position = newPosition;
    // EN modo automático cada posición de resistencia corresponde a 5W
    if (this.mode == ButtonMode.AUTO) {
      this.value = newPosition * 5;
    } else {
      this.value = newPosition;
    }
  }
}