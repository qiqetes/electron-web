// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const logWarn = (...args: any[]) => {
  console.log("\x1b[43m%s\x1b[0m", "WARN:", ...args);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const logError = (...args: any[]) => {
  console.log("\x1b[41m%s\x1b[0m", "ERROR:", ...args);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const log = (...args: any[]) => {
  console.log(`\x1b[32m${args.map(() => "%s").join(" ")}\x1b[0m`, ...args);
};
