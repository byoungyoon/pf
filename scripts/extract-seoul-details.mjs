import fs from 'node:fs';

// Usage: node scripts/extract-seoul-details.mjs geometry.json
const file = process.argv[2];
if (!file) throw Error('Pass the converted OSM or Overpass geometry response.');
const source = JSON.parse(fs.readFileSync(file, 'utf8'));
const origin = { lon: 126.978, lat: 37.5665 };
const project = ({ lon, lat }) => [Math.round((lon - origin.lon) * 1113.2 * Math.cos(origin.lat * Math.PI / 180) * 1000) / 1000, Math.round((origin.lat - lat) * 1113.2 * 1000) / 1000];
const closed = p => p.length > 3 && p[0][0] === p.at(-1)[0] && p[0][1] === p.at(-1)[1];
const within = p => p.some(([x, z]) => Math.abs(x) < 215 && Math.abs(z) < 170);
function inside(point, ring) {
  let result = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) result = !result;
  }
  return result;
}
const rings = geometry => geometry.map(project);
function join(members, role) {
  const parts = members.filter(m => m.type === 'way' && m.role === role && m.geometry?.length).map(m => rings(m.geometry));
  const result = [];
  const same = (a, b) => a[0] === b[0] && a[1] === b[1];
  while (parts.length) {
    let chain = parts.pop();
    while (!closed(chain)) {
      const last = chain.at(-1);
      const i = parts.findIndex(p => same(p[0], last) || same(p.at(-1), last));
      if (i < 0) break;
      let next = parts.splice(i, 1)[0];
      if (!same(next[0], last)) next = next.reverse();
      chain = chain.concat(next.slice(1));
    }
    if (closed(chain)) result.push(chain);
  }
  return result;
}
const waters = [], parks = [], buildings = [];
const usedWaterWays = new Set(source.elements.filter(e => e.type === 'relation' && e.tags?.natural === 'water').flatMap(e => e.members.filter(m => m.type === 'way').map(m => m.ref)));
for (const element of source.elements) {
  if (element.type === 'relation' && element.tags?.natural === 'water') {
    const outer = join(element.members ?? [], 'outer'), holes = join(element.members ?? [], 'inner');
    for (const p of outer) if (within(p)) waters.push({ name: element.tags.name ?? '', p, holes: holes.filter(hole => inside(hole[0], p)) });
    continue;
  }
  if (element.type === 'relation' && element.tags?.leisure === 'park') {
    for (const p of join(element.members ?? [], 'outer')) if (within(p)) parks.push({ name: element.tags.name ?? '', p });
    continue;
  }
  if (element.type !== 'way' || !element.geometry?.length) continue;
  const p = rings(element.geometry), tags = element.tags ?? {};
  if (!closed(p) || !within(p)) continue;
  if (tags.natural === 'water' && !usedWaterWays.has(element.id)) waters.push({ name: tags.name ?? '', p, holes: [] });
  else if (['park', 'garden', 'pitch'].includes(tags.leisure) || ['grass', 'forest'].includes(tags.landuse) || tags.natural === 'wood' || (tags.highway === 'pedestrian' && tags.area === 'yes')) parks.push({ name: tags.name ?? '', p });
  else if (tags.building || tags['building:part']) {
    const height = Number.parseFloat(tags.height ?? '');
    const levels = Number.parseFloat(tags['building:levels'] ?? '');
    const minHeight = Number.parseFloat(tags.min_height ?? '');
    buildings.push({ id: element.id, name: tags.name ?? '', p, height: Number.isFinite(height) ? height : Number.isFinite(levels) ? levels * 3.4 : null, heightSource: Number.isFinite(height) ? 'height' : Number.isFinite(levels) ? 'levels' : 'unknown', minHeight: Number.isFinite(minHeight) ? minHeight : 0, kind: tags.building, part: !!tags['building:part'], roof: tags['roof:shape'] ?? '' });
  }
}
if (!waters.length || !buildings.length) throw Error('Incomplete river or landmark data.');
fs.writeFileSync('public/data/seoul-details.json', JSON.stringify({ source: 'OpenStreetMap contributors / ODbL-1.0', osmTimestamp: source.osm3s?.timestamp_osm_base, waters, parks, buildings }));
console.log(JSON.stringify({ waters: waters.length, parks: parks.length, buildings: buildings.length, namedBuildings: buildings.filter(b=>b.name).length }));
