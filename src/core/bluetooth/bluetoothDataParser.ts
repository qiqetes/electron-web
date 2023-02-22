export const bufferToListInt = (values: Buffer): number[] => {
  return Array.from(new Uint8Array(values));
};
export const getFeatures = (bits: number[], features: string[]): string[] => {
  const sizeFeatures = features.length;
  const availableFeatures: string[] = [];

  bits.forEach((value, index) => {
    if (index < sizeFeatures) {
      if (value == 1) {
        availableFeatures.push(features[index]);
      }
    }
  });
  return availableFeatures;
};
//**Extraemos las features dadas por los valores de la bicicleta */
export const getAvailableFeatures = (
  bits: number[],
  features: string[],
  activeValueFeatures: number[] | undefined
): string[] => {
  const availableFeatures: string[] = [];
  bits.forEach((value, index) => {
    if (index < features.length) {
      let valueTrue = 1;
      if (activeValueFeatures != null) {
        valueTrue = activeValueFeatures[index];
      }
      if (value == valueTrue) {
        availableFeatures.push(features[index]);
      }
    }
  });
  return availableFeatures;
};

export const intToBinary = (value: number): number[] => {
  const result = value
    .toString(2)
    .padStart(8, "0")
    .split("")
    .map((e) => parseInt(e, 2));
  return result;
};

export const listToBinary = (listValues: number[]): number[] => {
  let bitsValues: number[] = [];
  listValues.forEach((element) => {
    bitsValues = bitsValues.concat(intToBinary(element));
  });
  return bitsValues;
};

export const listToInt = (
  bitsValues: number[],
  from: number,
  to: number,
  order: OrderBytes = "lso"
): number | undefined => {
  const fromValue = from;
  const toValue = to;
  const orderType = order || "lso";

  if (bitsValues.length >= toValue) {
    const bitsFeature = bitsValues.slice(fromValue, to);
    const value = orderList(orderType, bitsFeature);
    const binaryString = value.join("");
    return parseInt(binaryString, 2);
  }
  return 0;
};
// Ordena los bytes extraidos para que coincida con lso o mso
export const orderList = (order: OrderBytes, bits: number[]): number[] => {
  const numBytes = Math.floor(bits.length / 8);

  let orderedBits: number[] = [];
  if (order != "lso") {
    for (let i = 0; i < numBytes; i++) {
      const initialBit = i * 8;
      const finalBit = (i + 1) * 8;
      if (finalBit <= bits.length) {
        const readValues = bits.slice(initialBit, finalBit);
        orderedBits = orderedBits.concat(readValues);
      }
    }
  } else {
    for (let i = numBytes; i > 0; i--) {
      const initialBit = (i - 1) * 8;
      const finalBit = i * 8;
      if (finalBit <= bits.length && initialBit >= 0) {
        const readValues = bits.slice(initialBit, finalBit);
        orderedBits = orderedBits.concat(readValues);
      }
    }
  }

  return orderedBits;
};

export const intToBuffer = (valueTarget: number): Buffer => {
  let rest = 0;
  let value = valueTarget;

  if (valueTarget > 255) {
    rest = Math.floor(valueTarget / 255);
    value = valueTarget % 255;
  }
  return Buffer.from([value, rest]);
};

export const concatenateTo16BytesInt = (num1: number, num2: number): number => {
  return num1 + num2 * 256;
};
