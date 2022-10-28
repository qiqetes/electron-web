type ConversionType =
  | {
    status: 'success',
    url: string
  }
  | {
    status: 'canceled'
  }