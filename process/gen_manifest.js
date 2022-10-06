import pack from "../package.json" assert { type: "json" };
import AWS from "aws-sdk";
import os from "os";

// {
//   "name": "Bestcycling TV",
//   "description": "Aplicacion de escritorio para Bestcycling TV",
//   "version": "3.5.11",
//   "manifestUrl": "https://s3.com/bestcycling-production/desktop/beta/manifest.json",
//   "packages": {
//     "mac64": {
//       "url": "https://s3.com/bestcycling-production/desktop/versions/v3.5.11/update-mac64.zip"
//     },
//     "win32": {
//       "url": "https://s3.com/bestcycling-production/desktop/versions/v3.5.11/update-win32.zip"
//     },
//     "win64": {
//       "url": "https://s3.com/bestcycling-production/desktop/versions/v3.5.11/update-win64.zip"
//     }
//   }
// }

const isNewVersionNuber = (actual, incoming) => {
  for (let i = 0; i < 3; i++) {
    const act = parseInt(actual.split(".")[i]);
    const inc = parseInt(incoming.split(".")[i]);

    if (inc > act) return true;
    if (act > inc) return false;
  }
  return false;
};

const fileName = "manifest.json";
let manifest;

const uploadManifest = async () => {
  // LAST MANIFEST
  const res = await fetch(
    `https://s3-eu-west-1.amazonaws.com/bestcycling-production/desktop/qiqe-temp/manifest.json`
  );
  if (res.ok) {
    const lastManifest = await res.json();
    const lastVer = lastManifest.version;

    if (isNewVersionNuber(pack.version, lastVer)) {
      console.log(
        "\x1b[36m%s\x1b[0m",
        "ERROR: Hay un manifest con una versión mayor subido actualmente!"
      );
      throw Error();
    }

    if (lastVer == pack.version) {
      console.log(
        "\x1b[36m%s\x1b[41m%s\x1b[0m",
        "Ya existe el manifest de esta versión con builds para ",
        Object.keys(lastManifest.packages).join(" ")
      );
      manifest = lastManifest;
    }
  }

  // Manifest with the last version is not uploaded
  if (!manifest) {
    manifest = {
      name: pack.productName,
      description: pack.description,
      version: pack.version,
      manifestUrl:
        "https://s3-eu-west-1.amazonaws.com/bestcycling-production/desktop/" +
        "qiqe-temp" +
        "/" +
        fileName,
      packages: {},
    };
  }

  let platform = process.platform;
  if (process.platform == "darwin") platform = "mac64";
  // if (process.platform == "win32") platform = "win" + os.arch().substring(1);

  if (platform == "mac64") {
    manifest.packages[platform] = {
      url: `https://s3-eu-west-1.amazonaws.com/bestcycling-production/desktop/qiqe-temp/${pack.productName.replace(
        " ",
        "+"
      )}-${os.platform()}-universal-${pack.version}.zip`,
    };
  } else if (platform == "win32") {
    const platforms = ["win32", "win64"];
    platforms.forEach(
      (p) =>
        (manifest.packages[platform] = {
          url: `https://s3-eu-west-1.amazonaws.com/bestcycling-production/desktop/qiqe-temp/${pack.productName.replace(
            " ",
            ""
          )}-${pack.version}-full.nupkg`,
        })
    );
  }

  const manifestStr = JSON.stringify(manifest, null, 2);

  const s3 = new AWS.S3();

  const bucketName = "bestcycling-production";
  const key = "desktop/qiqe-temp/manifest.json";
  const params = {
    Bucket: bucketName,
    Key: key,
    Body: manifestStr,
    ACL: "public-read",
    ContentType: "application/json",
  };

  s3.upload(params, (err, data) => {
    if (err) throw Error(err);
    console.log(`Manifest uploaded successfully to ${data.Location}`);
  });
};

await uploadManifest();
