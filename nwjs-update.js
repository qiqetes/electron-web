// Simula instalador desde nw.js
const spawn = require("child_process").spawn;

function run(appPath, args, options) {
  const opts = {
    detached: true,
  };

  for (let key in options) {
    opts[key] = options[key];
  }

  let sp = spawn(appPath, args, opts);
  sp.unref();

  return sp;
}

run(".\\update-win.exe", ["/silent"], { detached: true, stdio: "ignore" });
