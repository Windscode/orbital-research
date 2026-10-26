import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = await readFile(path.join(root, 'src', 'orbit.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const { EARTH_RADIUS: R, EARTH_MU: mu, orbitElements, keplerPosition } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputText).toString('base64')}`);
let pass = 0;
let fail = 0;
function test(label, action) {
  try { action(); pass++; console.log(`PASS: ${label}`); }
  catch (error) { fail++; console.error(`FAIL: ${label}\n  ${error.message}`); }
}
function close(actual, expected, tolerance, label) {
  assert.ok(Number.isFinite(actual), `${label}: non-finite value ${actual}`);
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: got ${actual}, expected ${expected}, tolerance ${tolerance}`);
}
// A bracketed monotone solve is independent of the application's Newton method.
function referenceE(M, e) {
  const turns = Math.floor(M / (2 * Math.PI));
  const normalized = M - turns * 2 * Math.PI;
  let lo = 0, hi = 2 * Math.PI;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (mid - e * Math.sin(mid) < normalized) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

test('400 km circular orbit: endpoints, speed, period, energy', () => {
  const o = orbitElements(400, 400), r = R + 400;
  close(o.e, 0, 0, 'eccentricity');
  close(o.rp, r, 1e-9, 'radius');
  close(o.ra, r, 1e-9, 'radius');
  close(o.vp, Math.sqrt(mu / r), 1e-12, 'circular speed');
  close(o.va, o.vp, 1e-12, 'speed equality');
  close(o.period, 2 * Math.PI * r / o.vp, 1e-9, 'period from circumference / speed');
  close(o.energy, o.vp ** 2 / 2 - mu / r, 1e-12, 'specific orbital energy');
  for (const M of [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2, 2 * Math.PI]) {
    const p = keplerPosition(M, 0);
    close(Math.hypot(p.x, p.y), 1, 1e-12, 'unit circle');
  }
});

test('elliptical apsides and equal angular momentum at each apsis', () => {
  for (const [perigee, apogee] of [[400, 2000], [400, 35786], [200, 36000], [2000, 36000]]) {
    const o = orbitElements(perigee, apogee);
    const pe = keplerPosition(0, o.e), ap = keplerPosition(Math.PI, o.e);
    close(Math.hypot(pe.x, pe.y) * o.a, o.rp, 1e-8, 'perigee');
    close(Math.hypot(ap.x, ap.y) * o.a, o.ra, 1e-8, 'apogee');
    close(o.rp * o.vp, o.ra * o.va, 1e-7, 'angular momentum at apsides');
    assert.ok(o.vp >= o.va, 'perigee speed must not be below apogee speed');
  }
});

test('position derivatives preserve energy and angular momentum across the UI domain', () => {
  // Derive velocities by finite differencing the returned position, rather than
  // repeating the implementation's vis-viva expression.
  for (const [perigee, apogee] of [[400, 400], [400, 2000], [200, 36000]]) {
    const o = orbitElements(perigee, apogee), n = 2 * Math.PI / o.period, dM = 1e-5;
    for (const M of [0.05, 0.2, 0.8, 1.4, 2.2, Math.PI, 4.7, 6.0]) {
      const p = keplerPosition(M, o.e), before = keplerPosition(M - dM, o.e), after = keplerPosition(M + dM, o.e);
      const x = p.x * o.a, y = p.y * o.a;
      const vx = (after.x - before.x) * o.a * n / (2 * dM), vy = (after.y - before.y) * o.a * n / (2 * dM);
      const energy = (vx * vx + vy * vy) / 2 - mu / Math.hypot(x, y);
      const h = x * vy - y * vx;
      close(energy, o.energy, 2e-6, `energy at M=${M}`);
      close(h, Math.sqrt(mu * o.a * (1 - o.e ** 2)), 0.005, `angular momentum at M=${M}`);
    }
  }
});

test('Kepler equation agrees with a bracketed reference for high eccentricities', () => {
  const defects = [];
  for (const e of [0, 0.7, 0.9, 0.99, 0.999, 0.999999]) {
    for (const M of [0, 1e-8, 1e-6, 1e-4, 0.01, 0.1, 0.3, 1, Math.PI, 2 * Math.PI - 0.01, -0.1, 8 * Math.PI + 0.01]) {
      const E = referenceE(M, e), p = keplerPosition(M, e);
      const expectedX = Math.cos(E) - e, expectedY = Math.sqrt(1 - e * e) * Math.sin(E);
      const error = Math.hypot(p.x - expectedX, p.y - expectedY);
      if (!Number.isFinite(error) || error > 1e-9) defects.push(`e=${e}, M=${M}: position error ${error}`);
    }
  }
  assert.equal(defects.length, 0, `${defects.length} failures; first cases: ${defects.slice(0, 5).join('; ')}`);
});

test('orbit elements reject non-finite, negative, and reversed apsides', () => {
  for (const pair of [[-1, 1000], [1000, 999], [NaN, 1000], [400, NaN], [Infinity, Infinity], [400, Infinity]]) assert.throws(() => orbitElements(...pair), RangeError, `invalid apsides ${pair}`);
});

test('Kepler position rejects invalid eccentricity and mean anomaly', () => {
  for (const pair of [[0, -0.1], [0, 1], [0, 1.1], [0, NaN], [0, Infinity], [NaN, 0.5], [Infinity, 0.5]]) assert.throws(() => keplerPosition(...pair), RangeError, `invalid [M, e] ${pair}`);
});

console.log(`Orbit checks: ${pass} passed, ${fail} failed.`);
if (fail) process.exitCode = 1;
