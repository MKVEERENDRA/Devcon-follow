const {validateNativeBuildConfig} = require('./build-config.cjs');

module.exports = ({config}) => {
  validateNativeBuildConfig(process.env);
  return config;
};
