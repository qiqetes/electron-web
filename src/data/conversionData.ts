import os from "os";
import path from "path";
import * as fs from "fs";
import { app } from "electron";
import { log, logError } from "../../src/helpers/loggers";
import { BinData } from "../../src/helpers/init";

class ConversionDataImpl implements ConversionData {
  url: string;
  ffmpegBin: BinTypes;

  name : string;
  date: number;
  outputPath: string;

  constructor(url: string) {
    this.url = url;

    this.name = url.split(path.sep).reverse()[0].split(".")[0];
    this.date = new Date().getTime();
    this.outputPath = path.join(app.getPath("temp"), `${this.name}_${this.date}.mp3`);

    if (os.platform() === "win32") {
      this.ffmpegBin = "ffmpeg.exe";
      this.url = `"${path.resolve(this.url)}"`
      this.outputPath = `"${path.resolve(this.outputPath)}"`
    } else {
      this.ffmpegBin = "ffmpeg";
    }
  }

  toSeconds(date: string[]) {
    const times = [3600, 60, 1];
    let seconds = 0;

    times.forEach((time, index) => (seconds += parseInt(date[index]) * time));
    return seconds;
  }

  onExit() {
    BinData.removeProcess("ffmpeg");
    const path = this.outputPath.replace(/\\/, "\\");

    fs.rm(path, (err) => {
      if (err) {
        logError(
          `Couldn't delete file for download: ${path}, error: `,
          err
        );
        return;
      }

      log("removeTempMp3");
    });
  }

  checkExtension(): Promise<ConversionResponse> {
    return new Promise<ConversionResponse>((resolve, reject) => {
      log("Getting data from file...");

      const data = BinData.executeBinary(this.ffmpegBin, ["-i", this.url]);
      const buff: string[] = [];

      data.stderr.on("data", (data: number) => buff.push(data.toString()));
      data.stderr.once("end", () => {
        const regex = /Stream.+Audio: mp3,/;
        const matches = buff.join().match(regex);
        const isMp3 = matches?.length;

        resolve(isMp3 ? { status: "success", url: this.url } : null);
      });
      data.stderr.once("close", (error: boolean) => {
        if (!error) return;

        logError("getting data from file");
        reject({ status: "error" });
      });
    });
  }

  convert(onUpdate: (value: number) => void): Promise<ConversionResponse> {
    let durationInSeconds = 0;

    return new Promise<ConversionResponse>((resolve, reject) => {
      log("Creating mp3 from wav...");

      const process = BinData.executeBinary(
        this.ffmpegBin,
        [
          "-y",
          "-i",
          this.url,
          "-codec:a",
          "libmp3lame",
          "-b:a",
          "320k",
          "-ar",
          "44100",
          "-write_xing",
          "false",
          "-f",
          "mp3",
          this.outputPath,
        ],
        "ffmpeg"
      );

      process.stderr.on("data", (data: number) => {
        // Looking for Duration in console err output
        const buff = data.toString().split(" ");
        const durationIndex = buff.indexOf("Duration:");

        if (durationIndex !== -1) {
          const duration = buff[durationIndex + 1].split(",")[0].split(":");
          durationInSeconds = this.toSeconds(duration);
          return;
        }

        // Looking for Time in console err output
        const timeBuff = buff.join("=").split("=");
        const timeIndex = timeBuff.indexOf("time");

        if (timeIndex !== -1) {
          // Convert times to percent
          const time = timeBuff[timeIndex + 1].split(":");
          const seconds = this.toSeconds(time);

          const percent = Math.trunc((100 * seconds) / durationInSeconds);

          log(
            `Converting => totalSeconds: ${durationInSeconds} | currentSeconds: ${seconds} | percent: ${percent}`
          );

          onUpdate(percent);
        }
      });
      process.stderr.once("end", () => {
        if (BinData.processes["ffmpeg"]) {
          resolve({ status: "success", url: this.outputPath });
          return;
        }

        this.onExit();
        resolve({ status: "canceled" });
      });
      process.stderr.once("close", (error: boolean) => {
        if (!error) return;

        this.onExit();

        logError("convertToMp3: Error converting to mp3");
        reject({ status: "error" });
      });
    });
  }
}

export = ConversionDataImpl;