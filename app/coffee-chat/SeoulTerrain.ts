import * as THREE from "three";
import terrain from "../../public/data/seoul-terrain.json";

// Horizontal units are 100 m. A common 2x vertical exaggeration keeps terrain and
// known building heights in the same scale while making ridges visible at city extent.
export const metresToHeight = (metres: number) => metres / 50;
export function elevationMetres(x: number, z: number) {
  const { bounds, columns, rows, heights } = terrain;
  const u = THREE.MathUtils.clamp((x - bounds.minX) / (bounds.maxX - bounds.minX) * (columns - 1), 0, columns - 1);
  const v = THREE.MathUtils.clamp((z - bounds.minZ) / (bounds.maxZ - bounds.minZ) * (rows - 1), 0, rows - 1);
  const x0 = Math.floor(u), z0 = Math.floor(v), x1 = Math.min(columns - 1, x0 + 1), z1 = Math.min(rows - 1, z0 + 1);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(heights[z0 * columns + x0], heights[z0 * columns + x1], u - x0), THREE.MathUtils.lerp(heights[z1 * columns + x0], heights[z1 * columns + x1], u - x0), v - z0);
}
export const terrainHeight = (x: number, z: number) => .6 + metresToHeight(elevationMetres(x, z));

export function terrainGeometry(within: (x: number, z: number) => boolean, surface = terrainHeight) {
  const { bounds, columns, rows } = terrain;
  const geometry = new THREE.PlaneGeometry(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ, columns - 1, rows - 1);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.getAttribute("position"), colors: number[] = [];
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), z = positions.getZ(i), height = elevationMetres(x, z);
    positions.setY(i, surface(x, z));
    const color = new THREE.Color().setHSL(.47 + Math.min(height / 1600, .03), .23, .075 + Math.min(height / 2400, .14));
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  const original = geometry.index!, indices: number[] = [];
  for (let i = 0; i < original.count; i += 3) {
    const a = original.getX(i), b = original.getX(i + 1), c = original.getX(i + 2);
    const x = (positions.getX(a) + positions.getX(b) + positions.getX(c)) / 3;
    const z = (positions.getZ(a) + positions.getZ(b) + positions.getZ(c)) / 3;
    if (within(x, z)) indices.push(a, b, c);
  }
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}
