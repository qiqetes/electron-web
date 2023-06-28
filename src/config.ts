import pack from "../package.json";

type EnvironmentType = "development" | "production" | "devprod";

// config.js
const env: EnvironmentType = process.env.FLAVOUR
  ? "devprod"
  : (process.env.NODE_ENV as "production" | "development");

if (!env) {
  throw new Error("No environment set");
}

console.log("Entorno de desarrollo:", env.toUpperCase());

if (process.env.FLAVOUR) {
  console.log("Flavour: 2.bestcycling.com");
}

const development = {
  WEBBASE: "https://bestcycling.com",
  LOGIN_PATH: "/app/#/login",
  APP_PATH: "/app/#",
  API: "https://apiv2.bestcycling.es/api/v2",
};

const production = {
  WEBBASE: "https://bestcycling.com",
  LOGIN_PATH: "/app/#/login",
  APP_PATH: "/app/#",
  API: "https://apiv2.bestcycling.es/api/v2",
};

const devprod = {
  WEBBASE: "https://2.bestcycling.com",
  LOGIN_PATH: "/app/#/login",
  APP_PATH: "/app/#",
  API: "https://apiv2.bestcycling.es/api/v2",
};

const config = {
  development,
  production,
  devprod,
};

console.log("====================================================");
console.log("Config:", config[env]);
console.log("====================================================");

export default { ...config[env], version: pack.version };
