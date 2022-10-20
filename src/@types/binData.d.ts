interface BinData {
  binaryPath: string;
  macPath: string;
  win32Path: string;
  // win64Path: string,
  currentSystem: SystemsAllowed;
}

type BinTypes = "ffmpeg" | "ffmpeg.exe";

type SystemsAllowed = "MAC" | "WIN";
