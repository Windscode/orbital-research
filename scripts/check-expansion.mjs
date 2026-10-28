import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {loadTypeScript} from './load-typescript.mjs';
import * as THREE from 'three';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skipModelFiles = process.argv.includes('--skip-model-files');
const onlyCamera = process.argv.includes('--only-camera');
const cameraTestLabel = 'camera framing contains every model and isolated part across aspect ratios and explosion levels';
const allowedFlags = new Set(['--skip-model-files', '--only-camera']);
for (const flag of process.argv.slice(2)) assert(allowedFlags.has(flag), `Unknown option: ${flag}`);
const readJSON = async file => JSON.parse(await readFile(path.join(root, 'research', file), 'utf8'));
const [lessons, graph, vehicles, resources] = await Promise.all([
  readJSON('learning.json'), readJSON('knowledge-graph.json'),
  readJSON('vehicles.json'), readJSON('library.json'),
]);
let passes = 0, failures = 0, warnings = 0;
async function test(label, run) {
  if (onlyCamera && label !== cameraTestLabel) return;
  try { await run(); passes++; console.log(`PASS: ${label}`); }
  catch (error) { failures++; console.error(`FAIL: ${label}\n  ${error.message}`); }
}
const warning = text => { warnings++; console.warn(`WARN: ${text}`); };
const nonempty = (value, label) => assert(typeof value === 'string' && value.trim(), `${label}: expected nonempty string`);
const array = (value, label, min = 1) => assert(Array.isArray(value) && value.length >= min, `${label}: expected array with at least ${min} item(s)`);
const unique = (values, label) => assert.equal(new Set(values).size, values.length, `${label}: duplicate identifier`);
function https(value, label) {
  nonempty(value, label);
  assert.equal(new URL(value).protocol, 'https:', `${label}: expected HTTPS URL`);
}
const finite = (values, label) => assert(Array.from(values).every(Number.isFinite), `${label}: non-finite number`);
const lessonMap = new Map(lessons.map(item => [item.id, item]));
const nodeMap = new Map(graph.nodes.map(item => [item.id, item]));
const resourceIds = new Set(resources.map(item => item.id));

await test('knowledge nodes cover every lesson exactly once', () => {
  unique(lessons.map(l => l.id), 'lessons'); unique(graph.nodes.map(n => n.id), 'nodes');
  unique(graph.domains.map(d => d.id), 'domains');
  assert.deepEqual(new Set(nodeMap.keys()), new Set(lessonMap.keys()));
  assert(lessons.length >= 38, 'expected at least 38 deep notes');
  const domains = new Map(graph.domains.map(d => [d.id, d]));
  for (const d of graph.domains) {
    for (const key of ['id', 'label', 'color', 'description']) nonempty(d[key], `domain ${d.id}.${key}`);
  }
  for (const lesson of lessons) {
    const node = nodeMap.get(lesson.id);
    assert(domains.has(node.domain), `${lesson.id}: unknown domain`);
    assert.equal(domains.get(node.domain).label, lesson.category, `${lesson.id}: category mismatch`);
    assert([1, 2, 3].includes(node.level), `${lesson.id}: invalid level`);
    for (const field of ['prerequisites', 'related']) {
      array(lesson[field], `${lesson.id}.${field}`, 0); unique(lesson[field], `${lesson.id}.${field}`);
      for (const id of lesson[field]) {
        assert(lessonMap.has(id), `${lesson.id}.${field}: missing ${id}`);
        assert.notEqual(id, lesson.id, `${lesson.id}: self-reference`);
      }
    }
    array(lesson.body, `${lesson.id}.body`, 5);
    // Formulas and concise worked steps are valid prose; length is not a depth measure.
    lesson.body.forEach(p => nonempty(p, `${lesson.id}: body paragraph`));
    if(lesson.bodyHeadings) assert.equal(lesson.bodyHeadings.length,lesson.body.length,`${lesson.id}: headings must match paragraphs`);
    array(lesson.sources, `${lesson.id}.sources`, 2);
    for (const source of lesson.sources) { nonempty(source.title, `${lesson.id}: source title`); https(source.url, `${lesson.id}: source`); }
    for (const key of ['objectives', 'applications']) array(lesson[key], `${lesson.id}.${key}`, 2);
    array(lesson.steps, `${lesson.id}.steps`, 3);
    for (const step of lesson.steps) { nonempty(step.title, `${lesson.id}: step title`); nonempty(step.detail, `${lesson.id}: step detail`); }
  }
});

await test('graph references, exact prerequisite edges, and prerequisite DAG', () => {
  const expected = new Set(lessons.flatMap(l => l.prerequisites.map(pre => `${pre}>${l.id}`)));
  const actual = new Set(), keys = [];
  for (const edge of graph.edges) {
    assert(nodeMap.has(edge.from) && nodeMap.has(edge.to), `unknown edge ${edge.from} -> ${edge.to}`);
    assert.notEqual(edge.from, edge.to, 'self edge');
    assert(['prerequisite', 'coupling', 'validation'].includes(edge.type), 'unknown relationship type');
    nonempty(edge.reason, `${edge.from} -> ${edge.to}: reason`);
    keys.push(`${edge.from}>${edge.to}:${edge.type}`);
    if (edge.type === 'prerequisite') actual.add(`${edge.from}>${edge.to}`);
  }
  unique(keys, 'graph edges'); assert.deepEqual(actual, expected, 'graph prerequisite edges differ from lesson prerequisites');
  const visiting = new Set(), complete = new Set();
  function visit(id) {
    assert(!visiting.has(id), `prerequisite cycle at ${id}`);
    if (complete.has(id)) return;
    visiting.add(id); for (const pre of lessonMap.get(id).prerequisites) visit(pre);
    visiting.delete(id); complete.add(id);
  }
  for (const id of lessonMap.keys()) visit(id);
  const reachable = new Set([graph.paths[0]?.nodeIds[0] || graph.nodes[0]?.id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of graph.edges) if (reachable.has(edge.from) && !reachable.has(edge.to)) {
      reachable.add(edge.to); changed = true;
    }
  }
  assert.deepEqual(reachable, new Set(nodeMap.keys()), 'not every node is reachable from the introductory node');
});

await test('learning paths cover every lesson and respect included prerequisites', () => {
  array(graph.paths, 'learning paths', 4); unique(graph.paths.map(p => p.id), 'learning paths');
  const covered = new Set();
  for (const route of graph.paths) {
    nonempty(route.title, `${route.id}.title`); nonempty(route.description, `${route.id}.description`);
    assert(route.nodeIds.length >= 6 && route.nodeIds.length <= 10, `${route.id}: expected 6–10 concepts`);
    unique(route.nodeIds, `${route.id}.nodeIds`);
    const order = new Map(route.nodeIds.map((id, i) => [id, i]));
    for (const id of route.nodeIds) {
      assert(lessonMap.has(id), `${route.id}: unknown lesson ${id}`); covered.add(id);
      for (const pre of lessonMap.get(id).prerequisites) if (order.has(pre))
        assert(order.get(pre) < order.get(id), `${route.id}: ${pre} must precede ${id}`);
    }
  }
  assert.deepEqual(covered, new Set(lessonMap.keys()), 'some lessons are absent from every learning path');
});

await test('all engineering resources expose the expanded selection fields', () => {
  unique(resources.map(r => r.id), 'resources');
  for (const r of resources) {
    for (const key of ['id', 'title', 'inputs', 'outputs', 'limitations']) nonempty(r[key], `${r.id}.${key}`);
    array(r.workflow, `${r.id}.workflow`);
    for (const stage of r.workflow) nonempty(stage, `${r.id}: workflow stage`);
    array(r.alternatives, `${r.id}.alternatives`, 0); unique(r.alternatives, `${r.id}.alternatives`);
    for (const id of r.alternatives) {
      assert(resourceIds.has(id), `${r.id}: unresolved alternative ${id}`);
      assert.notEqual(id, r.id, `${r.id}: self alternative`);
    }
    array(r.usageEvidence, `${r.id}.usageEvidence`);
    for (const evidence of r.usageEvidence) {
      for (const key of ['organization', 'context', 'evidenceType']) nonempty(evidence[key], `${r.id}.usageEvidence.${key}`);
      https(evidence.sourceUrl, `${r.id}.usageEvidence.sourceUrl`);
    }
  }
});

const { buildVehicleModel, cameraFrame } = loadTypeScript(path.join(root,'src','modelGeometry.ts'));
let framedModels = 0, framedViews = 0, projectedCorners = 0, largestScreenCoordinate = 0;
await test(cameraTestLabel, () => {
  assert.equal(typeof cameraFrame, 'function', 'cameraFrame export is missing');
  const aspects = [.45, .7, 1, 2.5], explosionLevels = [0, 1.25, 2.5];
  const directions = [
    new THREE.Vector3(.95, .48, 2).normalize(),
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(-1, .8, -1).normalize(),
  ];
  for (const vehicle of vehicles) {
    assert(vehicle.model, `${vehicle.id}: model missing from camera coverage`);
    const built = buildVehicleModel(vehicle, new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0));
    try {
      // Include isolated parts: the original regression was especially visible
      // when focusing small box-shaped assemblies, not just the whole model.
      const targets = [{ id: 'whole-model', group: built.root }, ...built.parts];
      for (const explode of explosionLevels) {
        for (const part of built.parts) part.group.position.copy(part.base).addScaledVector(part.direction, explode);
        built.root.updateMatrixWorld(true);
        for (const target of targets) {
          const bounds = new THREE.Box3().setFromObject(target.group);
          assert(!bounds.isEmpty(), `${vehicle.id}/${target.id}: empty framing bounds`);
          for (const aspect of aspects) {
            const frame = cameraFrame(bounds, aspect, 35);
            finite([...frame.center.toArray(), frame.distance], `${vehicle.id}/${target.id}: camera frame`);
            assert(frame.distance > 0, `${vehicle.id}/${target.id}: nonpositive camera distance`);
            for (const direction of directions) {
              const camera = new THREE.PerspectiveCamera(35, aspect, .05, Math.max(200, frame.distance * 5));
              camera.position.copy(frame.center).addScaledVector(direction, frame.distance);
              camera.lookAt(frame.center); camera.updateMatrixWorld(true);
              // Check via the camera projection, independently of the fitting
              // formula. The eight world-space AABB corners bound all geometry.
              for (const x of [bounds.min.x, bounds.max.x])
                for (const y of [bounds.min.y, bounds.max.y])
                  for (const z of [bounds.min.z, bounds.max.z]) {
                    const ndc = new THREE.Vector3(x, y, z).project(camera);
                    finite(ndc.toArray(), `${vehicle.id}/${target.id}: projected corner`);
                    const context = `${vehicle.id}/${target.id}, explode=${explode}, aspect=${aspect}, direction=${direction.toArray()}`;
                    assert(Math.abs(ndc.x) <= 1 + 1e-9 && Math.abs(ndc.y) <= 1 + 1e-9,
                      `${context}: screen clipping at NDC (${ndc.x}, ${ndc.y})`);
                    assert(ndc.z >= -1 - 1e-9 && ndc.z <= 1 + 1e-9, `${context}: near/far clipping at ${ndc.z}`);
                    largestScreenCoordinate = Math.max(largestScreenCoordinate, Math.abs(ndc.x), Math.abs(ndc.y));
                    projectedCorners++;
                  }
              framedViews++;
            }
          }
        }
      }
      framedModels++;
    } finally {
      built.meshes.forEach(mesh => mesh.geometry.dispose()); built.materials.forEach(material => material.dispose());
    }
  }
});
const modelKinds = new Set(['sphere-satellite', 'cylinder-satellite', 'capsule', 'apollo', 'lander', 'shuttle', 'station', 'probe', 'telescope', 'rover', 'rocket']);
let modelsChecked = 0, meshCount = 0, vertices = 0;
await test('all vehicle dossiers provide a model, public references, and complete parts', () => {
  unique(vehicles.map(v => v.id), 'vehicles');
  for (const v of vehicles) {
    assert(v.model, `${v.id}: model metadata has not been supplied`);
    const model = v.model;
    assert(modelKinds.has(model.kind), `${v.id}: unknown model kind ${model.kind}`);
    for (const key of ['height', 'diameter']) assert(Number.isFinite(model[key]) && model[key] > 0, `${v.id}: invalid ${key}`);
    for (const key of ['boosters', 'stages', 'solarPanels', 'antennas', 'engineCount'])
      if (model[key] !== undefined) assert(Number.isInteger(model[key]) && model[key] >= 0, `${v.id}: invalid ${key}`);
    nonempty(model.color, `${v.id}.model.color`); nonempty(model.disclaimer, `${v.id}.model.disclaimer`);
    array(v.sources, `${v.id}.sources`); array(v.publicData, `${v.id}.publicData`);
    for (const source of v.sources) { nonempty(source.title, `${v.id}: source title`); https(source.url, `${v.id}: public source`); }
    for (const datum of v.publicData) {
      nonempty(datum.parameter, `${v.id}: public parameter`); nonempty(datum.value, `${v.id}: public value`);
      https(datum.sourceUrl, `${v.id}: public parameter source`);
    }
    array(model.parts, `${v.id}.model.parts`); unique(model.parts.map(p => p.id), `${v.id}.model.parts`);
    for (const part of model.parts) {
      for (const key of ['id', 'name', 'description']) nonempty(part[key], `${v.id}.part.${key}`);
      assert(['公开结构', '工程示意', '未知'].includes(part.evidence), `${v.id}/${part.id}: invalid evidence label`);
      https(part.sourceUrl, `${v.id}/${part.id}: part source`);
    }
  }
});
for (const v of vehicles.filter(v => v.model)) await test(`finite geometry, transforms and part selection: ${v.id}`, () => {
  const built = buildVehicleModel(v, new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0));
  try {
    array(built.parts, `${v.id}: generated parts`); array(built.meshes, `${v.id}: meshes`);
    unique(built.parts.map(p => p.id), `${v.id}: generated groups`);
    const partIds = new Set(built.parts.map(p => p.id));
    for (const mesh of built.meshes) {
      assert(partIds.has(mesh.userData.partId), `${v.id}: mesh has unresolved part id`);
      const positions = mesh.geometry.getAttribute('position');
      assert(positions?.count > 0, `${v.id}: empty vertex buffer`); vertices += positions.count;
      for (const [name, attribute] of Object.entries(mesh.geometry.attributes))
        finite(attribute.array, `${v.id}: ${name} buffer`);
      if (mesh.geometry.index) {
        for (const index of mesh.geometry.index.array) assert(Number.isInteger(index) && index >= 0 && index < positions.count, `${v.id}: invalid vertex index`);
      }
      meshCount++;
    }
    for (const explode of [0, 1.25, 2.5]) {
      for (const p of built.parts) {
        finite(p.base.toArray(), `${v.id}/${p.id}: base`);
        finite(p.direction.toArray(), `${v.id}/${p.id}: explosion direction`);
        p.group.position.copy(p.base).addScaledVector(p.direction, explode);
      }
      built.root.updateMatrixWorld(true);
      built.root.traverse(object => {
        finite(object.matrix.elements, `${v.id}/${object.name}: local matrix`);
        finite(object.matrixWorld.elements, `${v.id}/${object.name}: world matrix`);
      });
      const bounds = new THREE.Box3().setFromObject(built.root), size = bounds.getSize(new THREE.Vector3());
      finite([...bounds.min.toArray(), ...bounds.max.toArray()], `${v.id}: bounds`);
      assert(size.length() > 0, `${v.id}: degenerate bounds`);
    }
    for (const part of v.model.parts) if (!partIds.has(part.id))
      warning(`${v.id}/${part.id}: documented part is absent from the viewer's generated part list`);
    for (const part of built.parts) {
      let descendants = 0; part.group.traverse(object => { if (object.isMesh) descendants++; });
      if (!descendants) warning(`${v.id}/${part.id}: listed model part has no visible geometry to isolate`);
    }
    modelsChecked++;
  } finally {
    built.meshes.forEach(m => m.geometry.dispose()); built.materials.forEach(m => m.dispose());
  }
});

if (skipModelFiles && !onlyCamera) console.log('SKIP: GLB existence and file validation (--skip-model-files).');
else if (!onlyCamera) await test('every vehicle has a valid GLB download carrying provenance', async () => {
  for (const v of vehicles) {
    const file = path.join(root, 'public', 'models', `${v.id}.glb`);
    assert((await stat(file)).isFile(), `${v.id}: GLB missing`);
    const bytes = await readFile(file);
    assert(bytes.length >= 20, `${v.id}: incomplete GLB`);
    assert.equal(bytes.readUInt32LE(0), 0x46546c67, `${v.id}: invalid GLB magic`);
    assert.equal(bytes.readUInt32LE(4), 2, `${v.id}: expected glTF 2`);
    assert.equal(bytes.readUInt32LE(8), bytes.length, `${v.id}: GLB length mismatch`);
    assert.equal(bytes.readUInt32LE(16), 0x4e4f534a, `${v.id}: first chunk is not JSON`);
    const jsonLength = bytes.readUInt32LE(12);
    assert(jsonLength <= bytes.length - 20, `${v.id}: invalid JSON chunk length`);
    const document = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString('utf8').trim());
    assert.equal(document.asset?.version, '2.0', `${v.id}: invalid asset version`);
    assert(document.meshes?.length > 0, `${v.id}: GLB contains no meshes`);
    const metadata = document.nodes?.map(n => n.extras).find(e => e?.vehicleId === v.id);
    assert(metadata, `${v.id}: missing model identity metadata`);
    nonempty(metadata.disclaimer, `${v.id}: missing exported disclaimer`);
    array(metadata.provenance, `${v.id}: missing exported public references`);
  }
});

console.log(`Camera coverage: ${framedModels}/${vehicles.length} models, ${framedViews.toLocaleString('en-US')} fitted views, ${projectedCorners.toLocaleString('en-US')} AABB corner projections; largest absolute screen coordinate ${largestScreenCoordinate.toFixed(6)} (limit 1).`);
if (onlyCamera) console.log(`Camera-only summary: ${passes} passed, ${failures} failed; unrelated expansion checks were not run.`);
else console.log(`Expansion summary: ${passes} passed, ${failures} failed, ${warnings} warning(s); ${lessons.length} lessons, ${graph.nodes.length} graph nodes, ${resources.length} resources, ${modelsChecked}/${vehicles.length} models, ${meshCount} meshes, ${vertices.toLocaleString('en-US')} vertices.`);
console.log('These checks validate content structure and finite geometry; they do not certify physical dimensions, historical accuracy, or live URL availability.');
if (failures) process.exitCode = 1;
