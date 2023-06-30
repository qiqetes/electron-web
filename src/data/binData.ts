import * as os from "os";
import path from "path";
import * as child_process from "child_process";
import { log } from "../helpers/loggers";

interface IBinProcessesData {
  [key: string]: child_process.ChildProcessWithoutNullStreams;
}

class BinDataModel implements IBinData {
  binaryPath = "";
  macPath = "mac";
  win32Path = "win32";
  // win64Path = "win64";

  currentSystem: SystemsAllowed = "WIN";
  processes: IBinProcessesData = {};

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
    }

    return path.join(process.resourcesPath, "bin", osPath);
  }

  killProcess(pid: string) {
    const childProcess = this.processes[pid];

    if (!childProcess) {
      log(`Process with ${pid} can't be killed, already dead`);
      return;
    }

    if (os.platform() === "darwin") {
      if (childProcess.kill()) {
        console.log(`Process ${pid} killed`);
        return;
      }
      console.log(`Process ${pid} couldn't be killed`);
    } else {
      const _pid = childProcess.pid;
      child_process.exec("taskkill /pid " + _pid + " /T /F");

      console.log(`Killing process ${pid} with pid${childProcess.pid}`);
    }
  }

  removeProcess(pid: string) {
    this.killProcess(pid);
    delete this.processes[pid];
  }

  executeBinary(
    command: BinTypes,
    args: string[],
    pid?: string,
    options?: Record<string, unknown>
  ) {
    let process: child_process.ChildProcessWithoutNullStreams;

    if (os.platform() === "darwin") {
      process = child_process.spawn(path.join(this.binaryPath, command), args, options);
    } else if (os.platform() === "win32") {
      process = child_process.spawn(
        "cmd.exe",
        ["/c", command, ...args],
        {
          ...options,
          shell: true,
          cwd: this.binaryPath,
        }
      );
    } else {
      throw new Error("Platform not supported");
    }
    if (pid) {
      this.processes[pid] = process;
      log(`ChildProcess ${pid} with pid:${this.processes[pid].pid} created`);
      process.on("exit", (code, signal) => {
        if (signal === "SIGTERM") {
          console.log(
            `Child process ${pid} with pid:${process.pid} was killed with SIGTERM`
          );
        } else if (signal === "SIGINT") {
          console.log(
            `Child process ${pid} with pid:${process.pid} was killed with SIGINT`
          );
        } else {
          console.log(
            `Child process ${pid} with pid:${process.pid} exited with code ${code}`
          );
        }
        delete this.processes[pid];
      });
    }

    return process;
  }
}

export = BinDataModel;
