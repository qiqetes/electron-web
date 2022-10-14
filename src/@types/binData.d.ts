interface BinData {
  binaryPath: string,
  macPath: string,
  win32Path: string,
  win64Path: string,
  currentSystem: SystemsAllowed
}

type BinTypes =
  | 'ffmpeg'

type SystemsAllowed =
  | 'MAC'
  | 'WIN'