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
      return path.join('extraResource', this.macPath); 
    }

    let osPath = this.macPath;

    switch (os.platform()) {
      case 'darwin': osPath = this.macPath;
        break;
      case 'win32': osPath = this.win32Path;
        break;
      
      default: osPath = this.win64Path;
    }

    return path.join(process.resourcesPath, `extraResource/${osPath}`);
  }

  executeBinary(command: BinTypes, args: string[], options?: Record<string, unknown>) {
    const fullCommand = path.join(this.binaryPath, command);
    const finalCommand = this.currentSystem === 'WIN' ? `\\c ${fullCommand}` : fullCommand;

    return child_process.spawn(finalCommand, args, options);
  }

}

export = BinDataModel;