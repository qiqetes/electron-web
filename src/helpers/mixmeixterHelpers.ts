import { Buffer } from 'buffer';
import * as fs from "fs-extra";
import path from "path";
import id3 from "../libs/id3js-1.1.3";

export const readTagMp3 = async(file: string ,pathFile:string) =>  {
  if (fs.existsSync(file)) {
    pathFile = file;
  } else {
    pathFile = path.dirname(pathFile) + path.sep + path.win32.parse(file).base;
    if (!fs.existsSync(pathFile)) {
      pathFile= '';
    }
  }

  try {
    var tags =  await tagMp3(pathFile);
    return tags;
  } catch (e) {
    console.log(e);
    // BTD.notifyQueue.addMsgFixed( _l('Datos incorrectos en el audio ' + BTD.path.win32.parse(obj.file).base + '.') );
    /*if (typeof callback === 'function') {
      callback();
    }*/
  }
};


export const tagMp3 = async (pathFile:string ) => {
  // var id3 = require('id3js');
  return new Promise((resolve, reject) => {

     id3({ file: pathFile, type: id3.OPEN_LOCAL }, function (err: string, tags: any) {
      var tags = tags;
      if (err) {
        console.log(err);
        reject(err);
      }
      resolve(tags)
    });
    });

};