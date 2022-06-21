// config.js
const env = process.env.NODE_EN; // 'dev' or 'prod'

const dev = {
  WEBBASE: "http://localhost:8080",
  LOGIN_PATH: "",
};
const prod = {
  WEBBASE: "https://bestcycling.com",
  LOGIN_PATH: "/app/#/login",
};

const config = {
  dev,
  prod,
};

module.exports = config[env];
