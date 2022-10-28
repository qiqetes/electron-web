import * as os from "os";
import path from "path";
import child_process from "child_process";

class BinDataModel implements IBinData {
  binaryPath = "";
  macPath = "mac";
  win32Path = "win32";
  // win64Path = "win64";

  currentSystem: SystemsAllowed = "WIN";
  processes: IBinProcessesData  = {}

  constructor() {
    this.binaryPath = this.getBinaryPath();
    this.currentSystem =
      this.binaryPath.split("/").reverse()[0] === this.macPath ? "MAC" : "WIN";
  }

  getBinaryPath() {
    if (process.env.NODE_ENV === "development") {
      if (os.platform() === "darwin") {
        return path.join("bin", this.macPath);
      } else if (os.platform() === "win32") {
        return path.join("bin", this.win32Path);
      }
    }

    let osPath = this.macPath;

    switch (os.platform()) {
      case "darwin":
        osPath = this.macPath;
        break;
      case "win32":
        osPath = this.win32Path;
        break;

      // default:
      //   osPath = this.win64Path;
    }

    return path.join(process.resourcesPath, "bin", osPath);
  }

  removeProcess(pid: string) {
    delete this.processes[pid];
  }

  executeBinary(
    command: BinTypes,
    args: string[],
    pid?: string,
    options?: Record<string, unknown>
  ) {
    const fullCommand = path.join(this.binaryPath, command);

    /**
     * TO-DO: Needs to be tested
     * For windows command should be something like:
     * command => cmd.exe (entry point for command line, not the parameter command)
     * args => ['c/', paramCommand, paramArgs]
     *
     * return child_process.spawn('cmd.exe', ['c/', command, ...args]);
     *  var ffmpeg = spawn( 'cmd.exe', ['/c',  '"'+ffmpegpath+ '"', '-i', filelist[i], '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-y', outfile]));
     */

    if (os.platform() === "darwin") {
      const process = child_process.spawn(fullCommand, args, options);

      if (pid) {
        this.processes[pid] = process;
      }
      return process;
    } else if (os.platform() === "win32") {
      const process = child_process.spawn(
        "cmd.exe",
        ["/c", fullCommand, ...args],
        options
      );

      if (pid) {
        this.processes[pid] = process;
      }
      return process;
    } else {
      throw new Error("Platform not supported");
    }
  }
}

export = BinDataModel;
