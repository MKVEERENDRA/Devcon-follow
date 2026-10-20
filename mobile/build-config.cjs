// Validate release wiring before Expo generates native projects. This checks
// configuration only; it does not grant release/security approval.
function nativeApiOrigin(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.origin !== value || url.username || url.password ||
        url.hostname === 'localhost' || url.hostname.endsWith('.localhost') ||
        url.hostname.endsWith('.local') || /^[\d.]+$/.test(url.hostname) || url.hostname.includes(':')) throw Error();
    return url.origin;
  } catch { throw new Error('A bare public HTTPS API origin is required; do not include credentials, paths or query parameters.'); }
}

function validateNativeBuildConfig(env) {
  if (env.EAS_BUILD_PROFILE !== 'production') return;
  const origin = nativeApiOrigin(env.EXPO_PUBLIC_API_BASE_URL);
  if (/staging|preview|sandbox/i.test(new URL(origin).hostname)) {
    throw new Error('The production APK must use the approved production API, not a staging, preview or sandbox endpoint.');
  }
}

module.exports = {nativeApiOrigin, validateNativeBuildConfig};
