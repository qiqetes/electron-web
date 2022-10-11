interface BinData {
  binaryPath: string,
  macPath: string,
  win32Path: string,
  win64Path: string
}

type BinTypes =
  | 'ffmpeg'