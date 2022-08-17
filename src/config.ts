// config.js
const env: "development" | "production" | "devprod" = process.env.FLAVOUR
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
  WEBBASE: "http://localhost:8080",
  LOGIN_PATH: "/app#/login",
};

const production = {
  WEBBASE: "https://bestcycling.com",
  LOGIN_PATH: "/app/#/login",
};

const devprod = {
  WEBBASE: "https://2.bestcycling.com",
  LOGIN_PATH: "/app/#/login",
};

const config = {
  development,
  production,
  devprod,
};

export default config[env];
