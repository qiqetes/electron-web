// config.js
const env = process.env.NODE_ENV;
console.log("Entorno de desarrollo:", env.toUpperCase());

const development = {
  WEBBASE: "http://localhost:8080",
  LOGIN_PATH: "",
};

const production = {
  WEBBASE: "https://bestcycling.com",
  WEBBASE2: "http://localhost:8080",
  LOGIN_PATH: "/app/#/login",
};

const config = {
  development,
  production,
};

module.exports = config[env];
