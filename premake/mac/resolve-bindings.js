const { assert } = require('console');
const os = require('os');

module.exports = function (options) {
  const platform = os.platform();

  if (process.env.NOBLE_WEBSOCKET) {
    return new (require('./websocket/bindings'))(options);
  } else if (process.env.NOBLE_DISTRIBUTED) {
    return new (require('./distributed/bindings'))(options);
  } else if (platform === 'darwin') {
    const events = require('events');
    const util = require('util');
    const NobleMac = require(`/bin/mac/binding`).NobleMac;

    util.inherits(NobleMac, events.EventEmitter);

    return new(module.exports = NobleMac)(options);
  } else if (platform === 'linux' || platform === 'freebsd' || platform === 'win32') {
//    return new (require('./hci-socket/bindings'))(options);
  } else {
    throw new Error('Unsupported platform');
  }
};
