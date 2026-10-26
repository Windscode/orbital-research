/** Two-body, Earth-centred Kepler ellipse. km and seconds throughout. */
export const EARTH_RADIUS = 6378.137;
export const EARTH_MU = 398600.4418;
export function orbitElements(perigee: number, apogee: number) {
  if (!Number.isFinite(perigee) || !Number.isFinite(apogee) || perigee < 0 || apogee < perigee) throw new RangeError('Expected 0 ≤ perigee ≤ apogee');
  const rp = EARTH_RADIUS + perigee;
  const ra = EARTH_RADIUS + apogee;
  const a = (rp + ra) / 2;
  const e = (ra - rp) / (ra + rp);
  const period = 2 * Math.PI * Math.sqrt(a ** 3 / EARTH_MU);
  return { rp, ra, a, e, period, vp: Math.sqrt(EARTH_MU * (2 / rp - 1 / a)), va: Math.sqrt(EARTH_MU * (2 / ra - 1 / a)), energy: -EARTH_MU / (2 * a) };
}
export function keplerPosition(meanAnomaly: number, e: number) {
  if (!Number.isFinite(meanAnomaly) || !Number.isFinite(e) || e < 0 || e >= 1) throw new RangeError('Expected finite anomaly and 0 ≤ eccentricity < 1');
  const m = ((meanAnomaly + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
  let E = e < 0.8 ? m : (m < 0 ? -Math.PI : Math.PI);
  for (let i = 0; i < 40; i++) {
    const correction = (E - e * Math.sin(E) - m) / (1 - e * Math.cos(E));
    E -= correction;
    if (Math.abs(correction) < 1e-13) break;
  }
  return { x: Math.cos(E) - e, y: Math.sqrt(1 - e * e) * Math.sin(E) };
}
