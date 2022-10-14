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

    let osPath = this.macPath;

    switch (os.platform()) {
      case 'darwin': osPath = this.macPath;
        break;
      case 'win32': osPath = this.win32Path;
        break;
    }

    return path.join(process.resourcesPath, `extraResource/${osPath}`);
  }

  executeBinary(command: BinTypes, args: string[], options?: Record<string, unknown>) {
    // Deberia de añadirse \C o /C (no recuerdo) si es windows antes del fullCommand/binaryPath
    const fullCommand = path.join(this.binaryPath, command);

    return child_process.spawn(fullCommand, args, options);
  }

}

export = BinDataModel;