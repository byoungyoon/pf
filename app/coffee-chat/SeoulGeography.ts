import * as THREE from "three";
import details from "../../public/data/seoul-details.json";
import { elevationMetres, metresToHeight, terrainHeight } from "./SeoulTerrain";

export type Point = number[];
export function inside(x: number, z: number, ring: Point[]) {
  let result = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) result = !result;
  }
  return result;
}
function bounds(p: Point[]) {
  return { minX: Math.min(...p.map(v => v[0])), maxX: Math.max(...p.map(v => v[0])), minZ: Math.min(...p.map(v => v[1])), maxZ: Math.max(...p.map(v => v[1])) };
}
function contains(x: number, z: number, polygon: { p: Point[]; holes?: Point[][]; bounds: ReturnType<typeof bounds> }) {
  const b = polygon.bounds;
  return x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ && inside(x, z, polygon.p) && !polygon.holes?.some(h => inside(x, z, h));
}
export const waters = details.waters.map(w => {
  const elevations = w.p.filter((_, i) => i % Math.max(1, Math.floor(w.p.length / 60)) === 0).map(([x, z]) => elevationMetres(x, z)).sort((a, b) => a - b);
  // Flatten each water body; SRTM occasionally includes bank/tree heights.
  const level = w.name === "한강" ? .6 + metresToHeight(6.25) : .6 + metresToHeight(elevations[Math.floor(elevations.length * .25)]);
  return { ...w, bounds: bounds(w.p), level };
});
export const parks = details.parks.map(p => ({ ...p, bounds: bounds(p.p) }));
export const waterAt = (x: number, z: number) => waters.find(w => contains(x, z, w));
export const parkAt = (x: number, z: number) => parks.some(p => contains(x, z, p));
export const surfaceHeight = (x: number, z: number) => waterAt(x, z)?.level ?? terrainHeight(x, z);
export const footprints = details.buildings;
// Extents of the complete small OSM API map requests. Use their real footprints
// exclusively, so schematic blocks cannot fill plazas or palace courtyards.
const origin = { lon: 126.978, lat: 37.5665 };
const detailBounds = [
  [127.097, 37.508, 127.106, 37.515], [126.972, 37.563, 126.983, 37.583],
  [126.975, 37.545, 126.997, 37.558], [126.914, 37.551, 126.933, 37.565],
  [126.915, 37.516, 126.943, 37.541], [127.024, 37.495, 127.032, 37.501],
  [127.054, 37.508, 127.064, 37.515], [127.087, 37.502, 127.115, 37.509],
].map(([west, south, east, north]) => ({
  minX: (west - origin.lon) * 1113.2 * Math.cos(origin.lat * Math.PI / 180),
  maxX: (east - origin.lon) * 1113.2 * Math.cos(origin.lat * Math.PI / 180),
  minZ: (origin.lat - north) * 1113.2, maxZ: (origin.lat - south) * 1113.2,
}));
export const withinDetail = (x: number, z: number) => detailBounds.some(b => x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ);

// Clip the full river extract to the atlas extent rather than showing water beyond its base.
function clip(polygon: Point[]) {
  let points = polygon.slice();
  for (const [axis, edge, sign] of [[0, -215, 1], [0, 215, -1], [1, -170, 1], [1, 170, -1]]) {
    const output: Point[] = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length];
      const inA = (a[axis] - edge) * sign >= 0, inB = (b[axis] - edge) * sign >= 0;
      if (inA) output.push(a);
      if (inA !== inB) {
        const t = (edge - a[axis]) / (b[axis] - a[axis]);
        output.push([THREE.MathUtils.lerp(a[0], b[0], t), THREE.MathUtils.lerp(a[1], b[1], t)]);
      }
    }
    points = output;
  }
  for (let side = 0; side < 64; side++) {
    const nx = Math.cos(side / 64 * Math.PI * 2), nz = Math.sin(side / 64 * Math.PI * 2), output: Point[] = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length];
      const da = a[0] * nx + a[1] * nz - 232, db = b[0] * nx + b[1] * nz - 232;
      if (da <= 0) output.push(a);
      if ((da <= 0) !== (db <= 0)) { const t = da / (da - db); output.push([THREE.MathUtils.lerp(a[0], b[0], t), THREE.MathUtils.lerp(a[1], b[1], t)]); }
    }
    points = output;
  }
  return points;
}
export function polygonGeometry(p: Point[], holes: Point[][] = []) {
  const outer = clip(p);
  const shape = new THREE.Shape(outer.map(([x, z]) => new THREE.Vector2(x, -z)));
  holes.forEach(h => { const points = clip(h); if (points.length > 2) shape.holes.push(new THREE.Path(points.map(([x, z]) => new THREE.Vector2(x, -z)))); });
  const geometry = new THREE.ShapeGeometry(shape);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}
export function drapedOutline(p: Point[], lift = .1) {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length], steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 1.5));
    for (let j = 0; j < steps; j++) {
      const x = THREE.MathUtils.lerp(a[0], b[0], j / steps), z = THREE.MathUtils.lerp(a[1], b[1], j / steps);
      points.push(new THREE.Vector3(x, surfaceHeight(x, z) + lift, z));
    }
  }
  return new THREE.BufferGeometry().setFromPoints(points);
}
export function drapedPolygon(p: Point[]) {
  const original = polygonGeometry(p), positions = original.getAttribute("position"), index = original.index!;
  const vertices: number[] = [];
  function triangle(a: number[], b: number[], c: number[], depth: number) {
    const distance = (u: number[], v: number[]) => Math.hypot(u[0] - v[0], u[1] - v[1]);
    const abLength = distance(a, b), bcLength = distance(b, c), caLength = distance(c, a);
    if (depth < 16 && Math.max(abLength, bcLength, caLength) > 2) {
      const mid = (u: number[], v: number[]) => [(u[0] + v[0]) / 2, (u[1] + v[1]) / 2];
      if (abLength >= bcLength && abLength >= caLength) { const m = mid(a, b); triangle(a, m, c, depth + 1); triangle(m, b, c, depth + 1); }
      else if (bcLength >= caLength) { const m = mid(b, c); triangle(a, b, m, depth + 1); triangle(a, m, c, depth + 1); }
      else { const m = mid(c, a); triangle(a, b, m, depth + 1); triangle(m, b, c, depth + 1); }
    } else for (const [x, z] of [a, b, c]) vertices.push(x, surfaceHeight(x, z) + .12, z);
  }
  for (let i = 0; i < index.count; i += 3) triangle(...[0, 1, 2].map(j => { const k = index.getX(i + j); return [positions.getX(k), positions.getZ(k)]; }) as [number[], number[], number[]], 0);
  original.dispose();
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3)); geometry.computeVertexNormals(); return geometry;
}
