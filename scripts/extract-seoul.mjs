import fs from 'node:fs';

// Usage: node scripts/extract-seoul.mjs districts.geojson overpass.json
// Sources/licensing: ASSETS.md. Keep runtime fully local.
const [districtPath, osmPath] = process.argv.slice(2);
if (!districtPath || !osmPath) throw new Error('Pass the district GeoJSON and Overpass JSON paths.');
const districts = JSON.parse(fs.readFileSync(districtPath, 'utf8'));
const osm = JSON.parse(fs.readFileSync(osmPath, 'utf8'));
const origin = { lon: 126.978, lat: 37.5665 };
const project = (lon, lat) => [
  Math.round((lon - origin.lon) * 1113.2 * Math.cos(origin.lat * Math.PI / 180) * 1000) / 1000,
  Math.round((origin.lat - lat) * 1113.2 * 1000) / 1000,
];
function simplify(points, tolerance = .12) {
  if (points.length < 3) return points;
  const [ax, az] = points[0], [bx, bz] = points.at(-1);
  const dx = bx - ax, dz = bz - az, denominator = dx * dx + dz * dz;
  let furthest = -1, distance = tolerance * tolerance;
  for (let i = 1; i < points.length - 1; i++) {
    const [x, z] = points[i];
    const t = denominator ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / denominator)) : 0;
    const squared = (x - ax - t * dx) ** 2 + (z - az - t * dz) ** 2;
    if (squared > distance) { distance = squared; furthest = i; }
  }
  if (furthest < 0) return [points[0], points.at(-1)];
  return [...simplify(points.slice(0, furthest + 1), tolerance).slice(0, -1), ...simplify(points.slice(furthest), tolerance)];
}
function paths(element) {
  const parts = [];
  let part = [];
  for (const { lon, lat } of element.geometry) {
    const point = project(lon, lat);
    if (Math.hypot(...point) < 228) part.push(point);
    else { if (part.length > 1) parts.push(simplify(part)); part = []; }
  }
  if (part.length > 1) parts.push(simplify(part));
  return parts;
}
const result = {
  origin,
  units: 'One horizontal unit is approximately 100 metres.',
  sources: {
    districts: 'southkorea/seoul-maps, KOSTAT 2013 census boundaries, Apache-2.0',
    roadsAndRiver: 'OpenStreetMap contributors, ODbL-1.0',
    osmTimestamp: osm.osm3s?.timestamp_osm_base ?? null,
  },
  districts: districts.features.map(feature => ({
    name: feature.properties.name,
    english: feature.properties.name_eng,
    code: feature.properties.code,
    rings: feature.geometry.coordinates.map(ring => ring.map(([lon, lat]) => project(lon, lat))),
  })),
  roads: osm.elements.filter(e => e.type === 'way' && e.tags?.highway && e.geometry?.length > 1).flatMap(e => paths(e).map(p => ({ kind: e.tags.highway, bridge: e.tags.bridge === 'yes', p }))),
  rivers: osm.elements.filter(e => e.type === 'way' && e.tags?.waterway === 'river' && e.geometry?.length > 1).flatMap(e => paths(e).map(p => ({ name: e.tags.name ?? '한강', p }))),
};
if (result.districts.length !== 25 || !result.roads.length || !result.rivers.length) throw new Error('Incomplete Seoul geography.');
fs.writeFileSync('public/data/seoul.json', JSON.stringify(result));
console.log(JSON.stringify({ districts: result.districts.length, roads: result.roads.length, rivers: result.rivers.length }));
