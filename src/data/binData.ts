import * as os from 'os';
import path from 'path';
import child_process from 'child_process';

class BinDataModel implements BinData {

  binaryPath = '';
  macPath = 'mac';
  win32Path = 'win32';
  win64Path = 'win64';

  constructor() {
    this.binaryPath = this.getBinaryPath();
  }

  getBinaryPath() {
    if (process.env.NODE_ENV === 'development') {
      return path.join('extraResource', this.macPath); 
    }

    let osPath = '';

    switch (os.platform()) {
      case 'darwin': osPath = this.macPath;
        break;
      case 'win32': osPath = this.win32Path;
        break;
    }

    return path.join(process.resourcesPath, osPath);
  }

  executeBinary(command: BinTypes, args: string[]) {
    const fullCommand = path.join(this.binaryPath, command);

    return child_process.spawn(fullCommand, args);
  }

}

export = BinDataModel;