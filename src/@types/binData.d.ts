interface IBinData {
  binaryPath: string;
  macPath: string;
  win32Path: string;
  // win64Path: string,
  currentSystem: SystemsAllowed;
  processes: IBinProcessesData
}

interface IBinProcessesData {
  [key: string]: child_process.ChildProcessWithoutNullStreams;
}

type BinTypes = "ffmpeg" | "ffmpeg.exe";

type SystemsAllowed = "MAC" | "WIN";
