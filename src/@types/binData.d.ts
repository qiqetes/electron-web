interface IBinData {
  binaryPath: string;
  macPath: string;
  win32Path: string;
  // win64Path: string,
  currentSystem: SystemsAllowed;
  processes: IBinProcessesData;
}

type BinTypes = "ffmpeg" | "ffmpeg.exe";

type SystemsAllowed = "MAC" | "WIN";
