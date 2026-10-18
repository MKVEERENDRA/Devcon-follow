const {withAndroidManifest} = require('expo/config-plugins');

module.exports = function withBluetoothPermissions(config) {
  return withAndroidManifest(config, config => {
    const permissions = config.modResults.manifest['uses-permission'] || [];
    const scanPermission = permissions.find(permission => permission.$?.['android:name'] === 'android.permission.BLUETOOTH_SCAN');
    if (scanPermission) {
      scanPermission.$['android:usesPermissionFlags'] = 'neverForLocation';
    }
    return config;
  });
};
