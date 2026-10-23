// Filters only the already consented, venue-scoped server result. Never use the
// event directory to fill Nearby, infer positions or bypass an expired session.
export function matchesNearbyRole(profile, role = 'All') {
  return !!profile && typeof profile.userId === 'string' &&
    (role === 'All' || (Array.isArray(profile.roles) && profile.roles.includes(role)));
}
