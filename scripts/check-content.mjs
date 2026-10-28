import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// This checks the published content contract. It does not claim live-link or
// scientific peer review: the primary sources and numerical checks are separate.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const snapshot = process.env.CONTENT_AS_OF || '2026-10-28';
const data = Object.fromEntries(await Promise.all(['library', 'learning', 'vehicles', 'briefings', 'project-audit'].map(async name => [name, JSON.parse(await readFile(path.join(root, 'research', `${name}.json`), 'utf8'))])));
const ids = new Set();
const urls = new Set();
let checkedEntries = 0;

function text(value, label) {
  assert.equal(typeof value, 'string', `${label}: expected a string`);
  assert.ok(value.trim().length > 0, `${label}: empty text`);
  assert.ok(!/\b(?:TODO|TBD|lorem ipsum)\b/i.test(value), `${label}: unfinished placeholder`);
  return value;
}
function fields(item, keys, label) {
  for (const key of keys) text(item[key], `${label}.${key}`);
}
function array(value, label, minimum = 1) {
  assert.ok(Array.isArray(value) && value.length >= minimum, `${label}: expected at least ${minimum} entries`);
  return value;
}
function https(value, label) {
  const url = new URL(text(value, label));
  assert.equal(url.protocol, 'https:', `${label}: only HTTPS primary-source links are permitted`);
  assert.ok(url.hostname.includes('.') && !/^(?:example\.(?:com|org)|localhost)$/.test(url.hostname), `${label}: placeholder host`);
  assert.equal(url.username + url.password, '', `${label}: credentials must not appear in URLs`);
  urls.add(value);
}
function date(value, label) {
  text(value, label);
  assert.match(value, /^\d{4}-\d{2}-\d{2}$/, `${label}: expected ISO date`);
  assert.equal(new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10), value, `${label}: invalid calendar date`);
  assert.ok(value <= snapshot, `${label}: ${value} is after the declared content snapshot ${snapshot}`);
}
function source(value, label) {
  text(value.title, `${label}.title`);
  https(value.url, `${label}.url`);
}
function entry(item, label) {
  assert.ok(item && typeof item === 'object' && !Array.isArray(item), `${label}: expected object`);
  text(item.id, `${label}.id`);
  assert.match(item.id, /^[a-z][a-z0-9-]*$/, `${label}: IDs must be stable slugs`);
  assert.ok(!ids.has(item.id), `${label}: duplicate ID ${item.id} would collide in global search and saved items`);
  ids.add(item.id);
  checkedEntries++;
}
function stringArray(value, label) {
  array(value, label).forEach((item, i) => text(item, `${label}[${i}]`));
}

date(snapshot, 'snapshot');
const categories = new Set(['轨道与任务', '飞行动力学', '多物理场', '设计与优化', '数据与环境']);
for (const r of array(data.library, 'library')) {
  entry(r, 'resource');
  fields(r, ['title', 'category', 'kind', 'summary', 'details', 'language', 'license', 'sourceTitle'], r.id);
  assert.ok(categories.has(r.category), `${r.id}: category would be inaccessible from the resource filter`);
  stringArray(r.tags, `${r.id}.tags`);
  https(r.url, `${r.id}.url`);
  https(r.docsUrl, `${r.id}.docsUrl`);
  date(r.verifiedOn, `${r.id}.verifiedOn`);
}
for (const l of array(data.learning, 'learning')) {
  entry(l, 'lesson');
  fields(l, ['title', 'category', 'level', 'summary', 'formula', 'pitfall', 'exercise'], l.id);
  assert.ok((typeof l.readTime === 'number' && l.readTime > 0) || (typeof l.readTime === 'string' && l.readTime.trim()), `${l.id}: missing reading-time label`);
  stringArray(l.body, `${l.id}.body`);
  array(l.sources, `${l.id}.sources`).forEach((s, i) => source(s, `${l.id}.sources[${i}]`));
  assert.ok(l.body.join('').length > l.summary.length, `${l.id}: detailed article must expand its summary`);
}
for (const v of array(data.vehicles, 'vehicles')) {
  entry(v, 'vehicle');
  fields(v, ['name', 'organization', 'type', 'status', 'summary'], v.id);
  date(v.verifiedOn, `${v.id}.verifiedOn`);
  array(v.dimensions, `${v.id}.dimensions`).forEach((d, i) => { fields(d, ['label', 'value'], `${v.id}.dimensions[${i}]`); https(d.sourceUrl, `${v.id}.dimensions[${i}].sourceUrl`); });
  array(v.publicData, `${v.id}.publicData`).forEach((d, i) => { fields(d, ['parameter', 'value'], `${v.id}.publicData[${i}]`); https(d.sourceUrl, `${v.id}.publicData[${i}].sourceUrl`); });
  array(v.inference, `${v.id}.inference`).forEach((i, n) => fields(i, ['parameter', 'method', 'assumptions', 'uncertainty'], `${v.id}.inference[${n}]`));
  stringArray(v.limitations, `${v.id}.limitations`);
  array(v.sources, `${v.id}.sources`).forEach((s, i) => source(s, `${v.id}.sources[${i}]`));
  if (v.studyQuestions) stringArray(v.studyQuestions, `${v.id}.studyQuestions`);
  if (v.dataProducts) array(v.dataProducts, `${v.id}.dataProducts`).forEach((d, i) => { fields(d, ['name', 'description'], `${v.id}.dataProducts[${i}]`); https(d.url, `${v.id}.dataProducts[${i}].url`); });
}
for (const b of array(data.briefings, 'briefings')) {
  entry(b, 'briefing');
  fields(b, ['title', 'category', 'summary', 'analysis', 'implication'], b.id);
  date(b.date, `${b.id}.date`);
  if (b.verifiedOn) { date(b.verifiedOn, `${b.id}.verifiedOn`); assert.ok(b.date <= b.verifiedOn, `${b.id}: source date is after verification date`); }
  stringArray(b.tags, `${b.id}.tags`);
  source(b.source, `${b.id}.source`);
}
const project = data['project-audit'];
fields(project, ['name', 'subtitle', 'summary', 'engine', 'sourceScope'], 'project');
assert.equal(project.sourceScope, 'implementation-and-historical-records');
assert.ok(!('localPath' in project), 'Private workspace identity must not appear in public project data');
for (const section of ['architecture', 'capabilities', 'evidence', 'researchDirections']) {
  const titles = new Set();
  array(project[section], `project.${section}`).forEach((item, i) => {
    fields(item, ['title', 'body'], `project.${section}[${i}]`);
    assert.ok(!titles.has(item.title), `project.${section}: duplicate title`);
    titles.add(item.title);
    if (section === 'capabilities') text(item.status, `project.${section}[${i}].status`);
    if (section === 'evidence') assert.ok(!('path' in item), 'No private source locations in public records');
  });
}
stringArray(project.limitations, 'project.limitations');
assert.ok(/未|仍|进行|研究中/.test(project.summary), 'Project introduction must disclose its research status');
console.log(`PASS: ${checkedEntries} searchable entries, ${urls.size} distinct HTTPS source URLs, and the project audit satisfy the content contract.`);
console.log(`Snapshot: ${snapshot}. This is structural validation; it does not assert live availability or source accuracy.`);
