import * as os from 'os';
import path from 'path';
import child_process from 'child_process';

class BinDataModel implements BinData {

  binaryPath = '';
  macPath = 'mac';
  win32Path = 'win32';
  win64Path = 'win64';

  currentSystem: SystemsAllowed = 'WIN';

  constructor() {
    this.binaryPath = this.getBinaryPath();
    this.currentSystem = this.binaryPath.split('/').reverse()[0] === this.macPath ? 'MAC' : 'WIN';
  }

  getBinaryPath() {
    if (process.env.NODE_ENV === 'development') {
      return path.join('bin', this.macPath); 
    }

    let osPath = this.macPath;

    switch (os.platform()) {
      case 'darwin': osPath = this.macPath;
        break;
      case 'win32': osPath = this.win32Path;
        break;
      
      default: osPath = this.win64Path;
    }

    return path.join(process.resourcesPath, 'bin', osPath);
  }

  executeBinary(command: BinTypes, args: string[], options?: Record<string, unknown>) {
    const fullCommand = path.join(this.binaryPath, command);
    const finalCommand = this.currentSystem === 'WIN' ? `\\c ${fullCommand}` : fullCommand;

    /**
     * TO-DO: Needs to be tested
     * For windows command should be something like:
     * command => cmd.exe (entry point for command line, not the parameter command)
     * args => ['c/', paramCommand, paramArgs]
     * 
     * return child_process.spawn('cmd.exe', ['c/', command, ...args]);
     */
    return child_process.spawn(finalCommand, args, options);
  }

}

export = BinDataModel;