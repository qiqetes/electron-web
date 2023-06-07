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

run(
  ".\\out\\make\\squirrel.windows\\x64\\Bestcycling TV-4.0.17 Setup.exe",
  [],
  { detached: true, stdio: "ignore" }
);
