
  export const normalizedPower = (valuesPower: number[],  windowLength:number): number =>{
    let movingAverage =
        getMovingAverage(valuesPower, windowLength,  2);
    return Math.round(Math.pow(movingAverage, 1 / 4));
  }
  // Calcula la media de los datos según una ventana de datos Window y las últimas medias lastAvgs

  const getMovingAverage = (power:number[], window:number,  lastAvgs?:number):number => {
    let out: number[] = [];
    let powerOut = power;

    if (lastAvgs != null && power.length > window * lastAvgs) {
      powerOut = power.slice(power.length - window * lastAvgs, power.length);
    }

    for (let i = window; i < powerOut.length; i++) {
      const windowArea =
          powerOut.slice(i - window, i);
      out.push(calculateAverage(windowArea));
    }

    if (out.length == 0) {
      out.push(calculateAverage(power));
    }

    return Math
        .pow(out.reduce((value, avg) => value + avg) / out.length, 4)
  }

  export const calculateAverage = (window?: number[]): number => {
    if (window != null && window.length> 0) {
      return (window.reduce((value, item) => value + item) / window.length)
    } else {
      return 0;
    }
  }

  export const getMedian = (valueLists:number[]):number =>  {
    if (valueLists.length > 0) {
      if (valueLists.length > 1) {
        valueLists = valueLists.sort((a, b) => a- b );

        const valueToGet = Math.round(valueLists.length / 2) - 1;
        return valueLists[valueToGet];
      } else {
        return valueLists[0];
      }
    } else {
      return 0;
    }
  }

  export const getAvg = (valueLists:number[]):number =>{
    if (valueLists.length > 0 ) {
      return Math.ceil(valueLists.reduce((a, b) => a + b) / valueLists.length);
    } else {
      return 0;
    }
  }
