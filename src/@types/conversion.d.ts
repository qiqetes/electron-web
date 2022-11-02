type ConversionResponse =
  | {
    status: 'success',
    url: string
  }
  | {
    status: 'canceled'
  }