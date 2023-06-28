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
    this.ffmpegBin = os.platform() === "win32" ? "ffmpeg.exe" : "ffmpeg";

    this.name = url.split(path.sep).reverse()[0].split(".")[0];
    this.date = new Date().getTime();
    this.outputPath = path.join(app.getPath("temp"), `${this.name}_${this.date}.mp3`);
  }

  toSeconds(date: string) {
    const times = [3600, 60, 1];
    let seconds = 0;

    times.forEach((time, index) => (seconds += parseInt(date[index]) * time));
    return seconds;
  }

  onExit() {
    BinData.removeProcess("ffmpeg");
    fs.rm(this.outputPath.replace(/\\/, "\\"), (err) => {
      if (err) {
        logError(
          `Couldn't delete file for download: ${this.outputPath}, error: `,
          err
        );
        return;
      }

      log("removeTempMp3");
    });
  }

  // TODO: stderr.on data required to be typed
  async checkExtension(): Promise<ConversionResponse> {
    return new Promise<ConversionResponse>((resolve, reject) => {
      log("Getting data from file...");

      const data = BinData.executeBinary(this.ffmpegBin, ["-i", `"${path.resolve(this.url)}"`]);
      const buff: number[] = [];

      data.stderr.on("data", (data: any) => buff.push(data.toString()));
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

  // TODO: stderr.on data required to be typed
  async convert(onUpdate: (value: number) => void): Promise<ConversionResponse> {
    let durationInSeconds = 0;

    return new Promise<ConversionResponse>((resolve, reject) => {
      log("Creating mp3 from wav...");

      const process = BinData.executeBinary(
        this.ffmpegBin,
        [
          "-y",
          "-i",
          `"${path.resolve(this.url)}"`,
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
          `"${path.resolve(this.outputPath)}"`,
        ],
        "ffmpeg"
      );

      process.stderr.on("data", (data: any) => {
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