interface ConversionData {
  url: string;
  ffmpegBin: BinTypes;

  name : string;
  date: number;
  outputPath: string;
}

type ConversionResponse =
  | {
    status: 'success',
    url: string
  }
  | {
    status: 'canceled'
  }
  | {
    status: 'error',
  }
  | null