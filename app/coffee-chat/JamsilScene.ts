import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import jamsil from "../../public/data/jamsil.json";

type Point = [number, number];
type Outline = { p: number[][]; h: number; n: string; k: string; id: string };
type Path = { p: number[][]; k: string; n: string };

const buildings = jamsil.buildings as Outline[];
const waters = jamsil.waters as { p: number[][]; n: string }[];
const roadData = jamsil.roads as Path[];
const DISTRICT = { minX: 10, maxX: 75, minZ: 16, maxZ: 67 };
const VISIBLE = { minX: -15, maxX: 180, minZ: -35, maxZ: 90 };
const inVisibleArea = (x: number, z: number) => x >= VISIBLE.minX && x <= VISIBLE.maxX && z >= VISIBLE.minZ && z <= VISIBLE.maxZ;
const LAKE_WALK_LEVEL = -2.15;
const LAKE_WATER_LEVEL = -2.83;
// The OSM water outline fixes the shore. These land levels are a visual reconstruction,
// since the source data does not include a surveyed elevation profile.
const WEST_SHORE: Point[] = [[68, 39], [63, 44], [59, 50], [58, 56], [58.4, 61], [60, 66], [63, 72]];

function shoreX(z: number) {
  for (let i = 1; i < WEST_SHORE.length; i++) {
    const a = WEST_SHORE[i - 1], b = WEST_SHORE[i];
    if (z <= b[1]) return THREE.MathUtils.lerp(a[0], b[0], THREE.MathUtils.clamp((z - a[1]) / (b[1] - a[1]), 0, 1));
  }
  return WEST_SHORE[WEST_SHORE.length - 1][0];
}

function lakeCutout(): Point[] {
  return waters[0].p.map(([x, z], index): Point =>
    index >= 24 && index <= 33 ? [shoreX(z) - 7.7, z] : [x, z]);
}

function smoothstep(start: number, end: number, value: number) {
  const t = THREE.MathUtils.clamp((value - start) / (end - start), 0, 1);
  return t * t * (3 - 2 * t);
}

export function getGroundHeight(x: number, z: number) {
  if (waters.some((water) => insidePolygon(x, z, water.p))) return LAKE_WATER_LEVEL - .42;
  if (x > 85 || z < 38 || z > 75) return 0;
  const distance = shoreX(z) - x;
  const stairBlend = smoothstep(57.4, 58.7, z) * (1 - smoothstep(63.3, 64.6, z));
  const upperEdge = 7.7;
  const lowerEdge = THREE.MathUtils.lerp(6.9, 2.8, stairBlend);
  return LAKE_WALK_LEVEL * (1 - smoothstep(lowerEdge, upperEdge, distance));
}

const VEHICLE_BLOCKS = [[43, 55, 3.3, 5.4], [36, 62, 1.7, 2.7], [31, 53, 1.7, 2.7]];
const PARK_TREES: [number, number, number, number][] = [
  [42, 70, 1.03, 0], [48, 54, 1.05, 2], [48, 47, .94, 3],
  [53, 42, 1.05, 4], [77, 38, .78, 5], [78, 31, .76, 6], [42, 67, .8, 7],
  [50.8, 50.5, .76, 13], [52.5, 66.8, .85, 14], [54.4, 44.7, .8, 15],
];

export function insidePolygon(x: number, z: number, points: number[][]) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i], b = points[j];
    if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}

export function canWalk(x: number, z: number) {
  if (x < DISTRICT.minX || x > DISTRICT.maxX || z < DISTRICT.minZ || z > DISTRICT.maxZ) return false;
  if (waters.some((water) => insidePolygon(x, z, water.p))) return false;
  if (buildings.some((building) => building.h > 2 && insidePolygon(x, z, building.p))) return false;
  if (VEHICLE_BLOCKS.some(([cx, cz, hx, hz]) => Math.abs(x - cx) < hx + .4 && Math.abs(z - cz) < hz + .4)) return false;
  if (PARK_TREES.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < .85)) return false;
  return true;
}

export function canWalkStep(fromX: number, fromZ: number, x: number, z: number) {
  if (!canWalk(x, z)) return false;
  const stride = Math.hypot(x - fromX, z - fromZ);
  return Math.abs(getGroundHeight(x, z) - getGroundHeight(fromX, fromZ)) < Math.max(.18, stride * .7);
}

function canvasTexture(paint: (ctx: CanvasRenderingContext2D) => void, width = 512, height = 512) {
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  paint(canvas.getContext("2d")!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function lakeRippleNormals() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const context = canvas.getContext("2d")!;
  const image = context.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const u = x / 256 * Math.PI * 2, v = y / 256 * Math.PI * 2;
    const dx = Math.cos(u * 7 + v * 2) * .2 + Math.cos(u * 13 - v * 3) * .08;
    const dy = Math.cos(v * 9 - u * 2) * .16 + Math.cos(v * 17 + u * 4) * .055;
    const index = (y * 256 + x) * 4;
    image.data[index] = 128 + dx * 127;
    image.data[index + 1] = 128 + dy * 127;
    image.data[index + 2] = 250;
    image.data[index + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(.45, .45);
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
}

function facadeTexture(kind: "glass" | "apartment" | "stone") {
  const texture = canvasTexture((ctx) => {
    ctx.fillStyle = kind === "glass" ? "#415867" : kind === "apartment" ? "#b4b2b1" : "#a49e9b";
    ctx.fillRect(0, 0, 512, 512);
    for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) {
      const x = col * 128, y = row * 128;
      const lit = ((row * 13 + col * 7 + (kind === "glass" ? 3 : 1)) % 11) < 4;
      ctx.fillStyle = kind === "glass" ? "#243d4d" : kind === "apartment" ? "#8c9397" : "#7b8185";
      ctx.fillRect(x + 5, y + 5, 118, 116);
      const gradient = ctx.createLinearGradient(x + 12, y + 12, x + 109, y + 110);
      gradient.addColorStop(0, lit ? "#b1b4ac" : "#426b7d");
      gradient.addColorStop(.42, lit ? "#9f8c82" : "#253e50");
      gradient.addColorStop(1, lit ? "#d9bd9f" : "#132a37");
      ctx.fillStyle = gradient;
      ctx.fillRect(x + 15, y + 16, 98, 88);
      ctx.fillStyle = lit ? "rgba(255,235,199,.28)" : "rgba(126,203,223,.21)";
      ctx.fillRect(x + 17, y + 18, 26, 82);
      ctx.fillStyle = "rgba(5,18,30,.65)";
      ctx.fillRect(x + 60, y + 15, 5, 91);
      if (kind === "apartment") {
        ctx.fillStyle = "#b4b8b7";
        ctx.fillRect(x + 6, y + 103, 115, 9);
        ctx.fillStyle = "#667782";
        ctx.fillRect(x + 13, y + 108, 101, 12);
      }
      if (kind === "glass") {
        ctx.fillStyle = "rgba(209,235,239,.34)";
        ctx.fillRect(x + 20, y + 18, 2, 78);
        ctx.fillRect(x + 93, y + 18, 1, 79);
      }
      ctx.fillStyle = kind === "glass" ? "#748f9e" : "#c2c0bf";
      ctx.fillRect(x, y + 120, 128, 8);
      ctx.fillRect(x + 119, y, 9, 128);
    }
  }, 512, 512);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

function addRibbon(scene: THREE.Scene, paths: Path[], material: THREE.Material, width: (path: Path) => number, elevation: number, worldUvScale = 0) {
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  for (const path of paths) {
    const half = width(path) / 2;
    for (let i = 1; i < path.p.length; i++) {
      const a = path.p[i - 1], b = path.p[i];
      const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
      if (length < .02 || !inVisibleArea((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)) continue;
      const nx = -dz / length * half, nz = dx / length * half;
      const start = positions.length / 3;
      positions.push(a[0] - nx, elevation, a[1] - nz, a[0] + nx, elevation, a[1] + nz,
        b[0] - nx, elevation, b[1] - nz, b[0] + nx, elevation, b[1] + nz);
      if (worldUvScale) {
        uvs.push((a[0] - nx) * worldUvScale, (a[1] - nz) * worldUvScale,
          (a[0] + nx) * worldUvScale, (a[1] + nz) * worldUvScale,
          (b[0] - nx) * worldUvScale, (b[1] - nz) * worldUvScale,
          (b[0] + nx) * worldUvScale, (b[1] + nz) * worldUvScale);
      } else uvs.push(0, 0, 1, 0, 0, length / 4, 1, length / 4);
      indices.push(start, start + 2, start + 1, start + 1, start + 2, start + 3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
  return mesh;
}

function addRoadSides(scene: THREE.Scene, paths: Path[], width: (path: Path) => number, paving: THREE.Texture, normal: THREE.Texture) {
  const sidewalk = new THREE.MeshStandardMaterial({ map: paving, normalMap: normal, normalScale: new THREE.Vector2(.42, .42), color: 0xc5ced0, roughness: .85, metalness: .02, side: THREE.DoubleSide, depthWrite: false });
  const curbTop = new THREE.MeshStandardMaterial({ map: paving, color: 0xe3e0d7, roughness: .76, side: THREE.DoubleSide, depthWrite: false });
  const curbFace = new THREE.MeshStandardMaterial({ color: 0x8e8c89, roughness: .82, side: THREE.DoubleSide });
  const batches = [sidewalk, curbTop, curbFace].map((material) => ({ material, positions: [] as number[], uvs: [] as number[], indices: [] as number[] }));
  const quad = (batch: (typeof batches)[number], vertices: number[]) => {
    const start = batch.positions.length / 3;
    batch.positions.push(...vertices);
    for (let i = 0; i < vertices.length; i += 3) batch.uvs.push(vertices[i], -vertices[i + 2]);
    batch.indices.push(start, start + 1, start + 2, start + 1, start + 3, start + 2);
  };
  for (const path of paths) for (let i = 1; i < path.p.length; i++) {
    const a = path.p[i - 1], b = path.p[i];
    const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
    if (length < .2 || !inVisibleArea((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)) continue;
    const nx = -dz / length, nz = dx / length, half = width(path) / 2;
    for (const side of [-1, 1]) {
      for (const [batch, inner, outer, y] of [[batches[0], half + .04, half + 2.65, .075], [batches[1], half + .03, half + .39, .123]] as const) {
        quad(batch, [
          a[0] + nx * inner * side, y, a[1] + nz * inner * side,
          a[0] + nx * outer * side, y, a[1] + nz * outer * side,
          b[0] + nx * inner * side, y, b[1] + nz * inner * side,
          b[0] + nx * outer * side, y, b[1] + nz * outer * side,
        ]);
      }
      quad(batches[2], [
        a[0] + nx * half * side, .012, a[1] + nz * half * side,
        a[0] + nx * half * side, .123, a[1] + nz * half * side,
        b[0] + nx * half * side, .012, b[1] + nz * half * side,
        b[0] + nx * half * side, .123, b[1] + nz * half * side,
      ]);
    }
  }
  for (const batch of batches) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(batch.positions, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(batch.uvs, 2));
    geometry.setIndex(batch.indices); geometry.computeVertexNormals();
    scene.add(new THREE.Mesh(geometry, batch.material));
  }
}

function makeLabel(text: string, accent: string, subtitle?: string) {
  const map = canvasTexture((ctx) => {
    ctx.fillStyle = "rgba(9,19,31,.96)";
    ctx.fillRect(0, 0, 1024, 256);
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, 15, 256);
    ctx.fillRect(0, 0, 1024, 8);
    ctx.fillStyle = "#f2f6f5";
    ctx.font = `700 ${text.length > 11 ? 62 : 82}px Apple SD Gothic Neo, Noto Sans KR, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(text, 512, subtitle ? 123 : 151, 970);
    if (subtitle) {
      ctx.fillStyle = accent;
      ctx.font = "600 32px Arial, sans-serif";
      ctx.fillText(subtitle, 512, 198, 970);
    }
  }, 1024, 256);
  return { map, material: new THREE.MeshBasicMaterial({ map, transparent: true, toneMapped: false, side: THREE.DoubleSide }) };
}

function addBoard(scene: THREE.Scene, text: string, accent: string, x: number, y: number, z: number, width: number, rotation = 0, subtitle?: string) {
  const { material } = makeLabel(text, accent, subtitle);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(width, width / 4), material);
  board.position.set(x, y, z); board.rotation.y = rotation;
  scene.add(board);
  return board;
}

function addBox(scene: THREE.Scene, x: number, y: number, z: number, sx: number, sy: number, sz: number, color: number, metalness = .08, roughness = .8) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), new THREE.MeshStandardMaterial({ color, metalness, roughness }));
  mesh.position.set(x, y, z); scene.add(mesh);
  return mesh;
}

function addParkTree(scene: THREE.Scene, x: number, z: number, scale: number, seed: number, foliageMap: THREE.Texture) {
  const base = getGroundHeight(x, z);
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x4b403c, roughness: .98 });
  const foliage = new THREE.MeshStandardMaterial({ color: 0xffffff, map: foliageMap, alphaTest: .25, roughness: .91, side: THREE.DoubleSide });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.16 * scale, .27 * scale, 4.2 * scale, 12), trunkMaterial);
  trunk.position.set(x, base + 2.1 * scale, z); scene.add(trunk);
  for (let i = 0; i < 14; i++) {
    const angle = i * 2.399 + seed;
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(.022 * scale, .078 * scale, (1.6 + i % 4 * .29) * scale, 7), trunkMaterial);
    const end = new THREE.Vector3(Math.cos(angle) * (1.48 + i % 3 * .24), 4.55 + (i % 5) * .24, Math.sin(angle) * (1.2 + i % 4 * .22)).multiplyScalar(scale);
    const start = new THREE.Vector3(0, (2.6 + i % 4 * .2) * scale, 0);
    branch.position.set(x + (start.x + end.x) / 2, base + (start.y + end.y) / 2, z + (start.z + end.z) / 2);
    branch.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize());
    scene.add(branch);
  }
  const canopy = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), foliage, 108);
  const dummy = new THREE.Object3D();
  const leafColors = [0xffffff, 0xdbe8dd, 0xc4d5cb, 0xe4d6d9];
  for (let i = 0; i < 108; i++) {
    const a = i * 2.399 + seed * .6;
    const r = Math.sqrt((i + .5) / 108) * 2.48;
    const size = (.9 + i % 7 * .09) * scale;
    dummy.position.set(x + Math.cos(a) * r * scale, base + (5.12 + Math.sin(i * 1.37) * .57 + (1 - r / 2.48) * .56) * scale, z + Math.sin(a) * r * .75 * scale);
    dummy.scale.set(size * 1.15, size, 1);
    dummy.rotation.set(i * .71, a * .84, i * .37);
    dummy.updateMatrix(); canopy.setMatrixAt(i, dummy.matrix);
    canopy.setColorAt(i, new THREE.Color(leafColors[(i + seed) % leafColors.length]));
  }
  canopy.computeBoundingSphere(); scene.add(canopy);
  const grate = new THREE.Mesh(new THREE.RingGeometry(.52 * scale, .78 * scale, 24), new THREE.MeshStandardMaterial({ color: 0x7a7166, metalness: .35, roughness: .8, side: THREE.DoubleSide }));
  grate.rotation.x = -Math.PI / 2; grate.position.set(x, base + .075, z); scene.add(grate);
}

function addParkBench(scene: THREE.Scene, x: number, z: number, rotation = 0) {
  const group = new THREE.Group(); group.position.set(x, getGroundHeight(x, z), z); group.rotation.y = rotation; scene.add(group);
  const wood = new THREE.MeshStandardMaterial({ color: 0x6d5147, roughness: .62, metalness: .12 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x293f47, roughness: .36, metalness: .7 });
  for (const dz of [-.19, 0, .19]) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(2.25, .09, .14), wood);
    plank.position.set(0, .62, dz); group.add(plank);
  }
  for (const y of [.91, 1.09]) {
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.25, .1, .1), wood);
    back.position.set(0, y, -.28); group.add(back);
  }
  for (const dx of [-.91, .91]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(.09, .65, .49), metal);
    leg.position.set(dx, .33, 0); group.add(leg);
  }
}

function addParkSign(scene: THREE.Scene) {
  const map = canvasTexture((ctx) => {
    ctx.fillStyle = "#d8d2c5"; ctx.fillRect(0, 0, 1024, 512);
    ctx.fillStyle = "#334c50"; ctx.fillRect(0, 0, 26, 512);
    ctx.fillStyle = "#245a61"; ctx.beginPath(); ctx.arc(134, 132, 69, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#e7ece6"; ctx.lineWidth = 10;
    for (const r of [21, 39]) { ctx.beginPath(); ctx.arc(134, 132, r, .2, Math.PI - .2); ctx.stroke(); }
    ctx.fillStyle = "#263e42"; ctx.font = "700 76px Apple SD Gothic Neo, Noto Sans KR, sans-serif";
    ctx.fillText("송파나루공원", 248, 150);
    ctx.fillStyle = "#386b70"; ctx.font = "600 52px Apple SD Gothic Neo, Noto Sans KR, sans-serif";
    ctx.fillText("석촌호수 동호", 247, 246);
    ctx.fillStyle = "#536a6c"; ctx.font = "500 31px Arial, sans-serif";
    ctx.fillText("SONGPA NARU PARK  ·  EAST LAKE", 250, 316);
    ctx.fillStyle = "#456b70"; ctx.fillRect(76, 386, 872, 3);
    ctx.font = "500 28px Arial, sans-serif"; ctx.fillText("LAKE WALK  /  STAIRS DOWN  →", 76, 445);
  }, 1024, 512);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.45, 1.73), new THREE.MeshBasicMaterial({ map, toneMapped: false, side: THREE.DoubleSide }));
  sign.position.set(49.1, 1.95, 65.2); sign.rotation.y = -.24; scene.add(sign);
  const backing = addBox(scene, 49.1, 1.95, 65, 3.62, 1.9, .17, 0x5b6765, .36, .62);
  backing.rotation.y = -.24;
  for (const x of [47.7, 50.5]) addBox(scene, x, .51, 65, .13, 1.02, .16, 0x45565a, .55, .48);
}

function addLakeDescent(scene: THREE.Scene, stoneMap: THREE.Texture, stoneNormal: THREE.Texture) {
  const wall = new THREE.MeshStandardMaterial({ color: 0x4d5b5b, roughness: .91, side: THREE.DoubleSide });
  const coping = new THREE.MeshStandardMaterial({ color: 0xb2aea4, roughness: .76 });
  const handrail = new THREE.MeshStandardMaterial({ color: 0x7e9fa4, metalness: .78, roughness: .3 });
  const outline = lakeCutout();
  for (let i = 24; i <= 34; i++) {
    const a = outline[i - 1], b = outline[i];
    for (const [startZ, endZ] of [[a[1], Math.min(b[1], 58.55)], [Math.max(a[1], 63.45), b[1]]]) {
      if (endZ - startZ < .05) continue;
      const x1 = THREE.MathUtils.lerp(a[0], b[0], (startZ - a[1]) / (b[1] - a[1]));
      const x2 = THREE.MathUtils.lerp(a[0], b[0], (endZ - a[1]) / (b[1] - a[1]));
      const length = Math.hypot(x2 - x1, endZ - startZ);
      const angle = Math.atan2(x2 - x1, endZ - startZ);
      for (const [y, height, material, depth] of [[-1.09, 2.25, wall, .5], [.08, .19, coping, .62]] as const) {
        const section = new THREE.Mesh(new THREE.BoxGeometry(depth, height, length + .08), material);
        section.position.set((x1 + x2) / 2, y, (startZ + endZ) / 2);
        section.rotation.y = angle; scene.add(section);
      }
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, length + .08, 6), handrail);
      rail.position.set((x1 + x2) / 2, 1.02, (startZ + endZ) / 2);
      rail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(x2 - x1, 0, endZ - startZ).normalize());
      scene.add(rail);
    }
  }

  for (const z of [58.55, 63.45]) {
    const sidePositions: number[] = [], sideIndices: number[] = [];
    for (let i = 0; i < 12; i++) {
      const x1 = 50.65 + i * .45, x2 = x1 + .45;
      const start = sidePositions.length / 3;
      sidePositions.push(x1, getGroundHeight(x1, 61) - .08, z, x1, LAKE_WALK_LEVEL - .08, z,
        x2, getGroundHeight(x2, 61) - .08, z, x2, LAKE_WALK_LEVEL - .08, z);
      sideIndices.push(start, start + 1, start + 2, start + 1, start + 3, start + 2);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(sidePositions, 3));
    geometry.setIndex(sideIndices); geometry.computeVertexNormals();
    scene.add(new THREE.Mesh(geometry, wall));
  }

  const stepStone = new THREE.MeshStandardMaterial({ color: 0xb4c4c6, map: stoneMap, normalMap: stoneNormal, normalScale: new THREE.Vector2(.45, .45), roughness: .78, metalness: .04 });
  const stepFace = new THREE.MeshStandardMaterial({ color: 0x465255, roughness: .88 });
  for (let i = 0; i < 10; i++) {
    const x = 50.65 + i * .53;
    const y = getGroundHeight(x + .27, 61);
    const tread = new THREE.Mesh(new THREE.BoxGeometry(.54, .11, 4.55), stepStone);
    tread.position.set(x + .27, y, 61); scene.add(tread);
    const riser = new THREE.Mesh(new THREE.BoxGeometry(.08, .29, 4.55), stepFace);
    riser.position.set(x + .53, y - .13, 61); scene.add(riser);
    if (i % 3 === 0) {
      const nosing = new THREE.Mesh(new THREE.BoxGeometry(.035, .013, 4.45), new THREE.MeshBasicMaterial({ color: 0x9fbfc3, transparent: true, opacity: .62, toneMapped: false }));
      nosing.position.set(x + .51, y + .065, 61); scene.add(nosing);
    }
  }
  for (const z of [58.52, 63.48]) {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(.026, .026, 5.7, 6), handrail);
    rail.position.set(53.4, -.06, z);
    rail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(5.4, -2.12, 0).normalize());
    scene.add(rail);
    for (const x of [50.8, 53.3, 55.7]) {
      const y = getGroundHeight(x, 61);
      addBox(scene, x, y + .44, z, .055, .88, .055, 0x617e82, .7, .32);
    }
  }
  const landingGeometry = new THREE.BoxGeometry(2.4, .14, 5.2);
  const landingUvs = landingGeometry.getAttribute("uv");
  for (let i = 0; i < landingUvs.count; i++) landingUvs.setX(i, landingUvs.getX(i) * 4.4);
  const landing = new THREE.Mesh(landingGeometry, stepStone);
  landing.position.set(56.8, LAKE_WALK_LEVEL - .04, 61); scene.add(landing);
}

function addParkGround(scene: THREE.Scene, paving: THREE.Texture, normal: THREE.Texture, pathPavers: THREE.Texture, pathNormal: THREE.Texture) {
  const land = new THREE.Shape();
  land.moveTo(-115, 125);
  land.lineTo(195, 125);
  land.lineTo(195, -185);
  land.lineTo(-115, -185);
  land.closePath();

  const lake = waters[0].p;
  const cutout = lakeCutout();
  land.holes.push(new THREE.Path(cutout.map(([x, z]) => new THREE.Vector2(x, -z))));
  paving.repeat.set(1 / 7, 1 / 7);
  normal.repeat.set(1 / 7, 1 / 7);
  const upper = new THREE.Mesh(
    new THREE.ShapeGeometry(land),
    new THREE.MeshStandardMaterial({ map: paving, normalMap: normal, normalScale: new THREE.Vector2(.48, .48), color: 0xbec8ca, roughness: .82, metalness: .03, side: THREE.DoubleSide }),
  );
  upper.rotation.x = -Math.PI / 2;
  upper.position.y = -.09;
  scene.add(upper);

  const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  for (let i = 24; i <= 34; i++) {
    const a = lake[i - 1], b = lake[i], outerA = cutout[i - 1], outerB = cutout[i];
    const start = positions.length / 3;
    for (const [x, z] of [outerA, a, outerB, b]) {
      positions.push(x, LAKE_WALK_LEVEL - .06, z);
      uvs.push(x * .23, -z * .23);
    }
    indices.push(start, start + 1, start + 2, start + 1, start + 3, start + 2);
  }
  const lowerGeometry = new THREE.BufferGeometry();
  lowerGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  lowerGeometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  lowerGeometry.setIndex(indices);
  lowerGeometry.computeVertexNormals();
  const lower = new THREE.Mesh(lowerGeometry, new THREE.MeshStandardMaterial({ color: 0x9a918e, map: pathPavers, normalMap: pathNormal, normalScale: new THREE.Vector2(.5, .5), roughness: .9, side: THREE.DoubleSide }));
  scene.add(lower);
}

function addLakeEdgeWalls(scene: THREE.Scene) {
  const stone = new THREE.MeshStandardMaterial({ color: 0x424e53, roughness: .94, side: THREE.DoubleSide });
  const cap = new THREE.MeshStandardMaterial({ color: 0x46585a, roughness: .86, side: THREE.DoubleSide });
  for (const water of waters) for (let i = 1; i < water.p.length; i++) {
    const a = water.p[i - 1], b = water.p[i];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const x = (a[0] + b[0]) / 2, z = (a[1] + b[1]) / 2;
    if (length < .2 || !inVisibleArea(x, z)) continue;
    const nearShore = x < 85 && z > 38 && z < 75;
    const top = nearShore ? LAKE_WALK_LEVEL - .04 : .02;
    const bottom = LAKE_WATER_LEVEL - .2;
    const inward = new THREE.Vector2(112 - x, 59 - z).normalize();
    const angle = Math.atan2(b[0] - a[0], b[1] - a[1]);
    const offset = nearShore ? .28 : 1.08;
    const section = new THREE.Mesh(new THREE.BoxGeometry(nearShore ? .88 : 2.6, top - bottom, length + .16), stone);
    section.position.set(x + inward.x * offset, (top + bottom) / 2, z + inward.y * offset);
    section.rotation.y = angle; scene.add(section);
    const rim = new THREE.Mesh(new THREE.BoxGeometry(nearShore ? .92 : 2.65, .13, length + .16), cap);
    rim.position.set(x + inward.x * offset, top + .04, z + inward.y * offset);
    rim.rotation.y = angle; scene.add(rim);
  }
}

function addPromenadeLights(scene: THREE.Scene) {
  const housing = new THREE.MeshStandardMaterial({ color: 0x35484d, metalness: .65, roughness: .38 });
  const diffuser = new THREE.MeshBasicMaterial({ color: 0xffd6ac, toneMapped: false });
  for (const z of [44, 49, 54, 67, 71]) {
    const x = shoreX(z) - 4.6;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.085, .13, 1.05, 10), housing);
    pole.position.set(x, LAKE_WALK_LEVEL + .54, z); scene.add(pole);
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(.15, .15, .14, 12), diffuser);
    lamp.position.set(x, LAKE_WALK_LEVEL + 1.1, z); scene.add(lamp);
    const light = new THREE.PointLight(0xffc99e, 1.55, 7.8, 2);
    light.position.set(x, LAKE_WALK_LEVEL + 1.12, z); scene.add(light);
  }
}

function addFarShore(scene: THREE.Scene, foliageMap: THREE.Texture) {
  const farPath: Path = { k: "pedestrian", n: "석촌호수 반대편 산책로", p: [[174, 28], [163, 37], [153, 48], [143, 59], [133, 70], [122, 81]] };
  const garden: Path = { ...farPath, p: farPath.p.map(([x, z]) => [x + 4, z]) };
  addRibbon(scene, [garden], new THREE.MeshStandardMaterial({ color: 0x334b3f, roughness: .98, side: THREE.DoubleSide }), () => 8.5, .07);
  addRibbon(scene, [farPath], new THREE.MeshStandardMaterial({ color: 0x77847e, roughness: .89, side: THREE.DoubleSide }), () => 5.2, .061);
  // The far bank reads as one tree-lined park edge, matching the lake's real outline.
  // The photographed skyline is placed much farther back in the panorama.
  for (let i = 0; i < 18; i++) {
    const t = i / 17;
    const x = THREE.MathUtils.lerp(172, 123, t) + Math.sin(i * 2.6) * 1.1;
    const z = THREE.MathUtils.lerp(30, 79, t) + Math.cos(i * 1.8) * 1.2;
    addParkTree(scene, x, z, .69 + (i % 6) * .075, i + 20, foliageMap);
  }
}

function addLakeCafeStreet(scene: THREE.Scene) {
  const shops = [
    { z: 13.5, name: "호숫가 카페", english: "LAKE CAFE", wall: 0x59636a, trim: 0x82cbd1, height: 8.8 },
    { z: 22, name: "송파 책방", english: "BOOKS & STORIES", wall: 0x635750, trim: 0xe2aa86, height: 10.4 },
    { z: 30.5, name: "밤의 식탁", english: "NIGHT DINING", wall: 0x515e5c, trim: 0xd0a4bc, height: 8.1 },
  ] as const;
  const upperGlass = new THREE.MeshStandardMaterial({ color: 0x77919a, metalness: .22, roughness: .28, emissive: 0x9d987e, emissiveIntensity: .18 });
  const warmWindow = new THREE.MeshBasicMaterial({ color: 0xcba88a, toneMapped: false, side: THREE.DoubleSide });
  shops.forEach((shop, index) => {
    const x = 87.5;
    addBox(scene, x, shop.height / 2, shop.z, 7.2, shop.height, 7.3, shop.wall, .12, .76);
    addBox(scene, x, shop.height + .18, shop.z, 7.6, .36, 7.7, 0x313b40, .32, .55);
    addBox(scene, 83.79, 1.58, shop.z, .08, 2.65, 6.15, 0x344753, .62, .22);
    for (let i = -1; i <= 1; i++) {
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.54, 2.15), warmWindow);
      pane.rotation.y = -Math.PI / 2; pane.position.set(83.73, 1.72, shop.z + i * 1.83); scene.add(pane);
      for (const floor of [5.35, 7.38]) {
        if (floor + 1 > shop.height) continue;
        const upper = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.35), upperGlass);
        upper.rotation.y = -Math.PI / 2; upper.position.set(83.72, floor, shop.z + i * 1.83); scene.add(upper);
      }
    }
    const awning = addBox(scene, 82.95, 3.2, shop.z, 1.9, .18, 7.3, shop.trim, .2, .7);
    awning.rotation.z = -.07;
    addBoard(scene, shop.name, `#${shop.trim.toString(16).padStart(6, "0")}`, 83.66, 3.92, shop.z, 5.6, -Math.PI / 2, shop.english);
    const shopLight = new THREE.PointLight(shop.trim, 3.2, 13, 2);
    shopLight.position.set(81.8, 3.05, shop.z); scene.add(shopLight);
    if (index !== 1) {
      addBox(scene, 81.45, .43, shop.z + 2.5, .9, .86, .85, 0x656b62, .12, .88);
      const shrub = new THREE.Mesh(new THREE.IcosahedronGeometry(.54, 1), new THREE.MeshStandardMaterial({ color: 0x3b574b, roughness: .96 }));
      shrub.position.set(81.45, 1.07, shop.z + 2.5); scene.add(shrub);
    }
  });
  addBoard(scene, "송리단길 방면", "#e6b998", 78.5, 3.6, 39, 5.6, -.4, "LAKE CAFE STREET");
}

function buildTower(scene: THREE.Scene) {
  // The tower sits on its OSM footprint. Its stepped, tapering volume and split crown
  // are bespoke geometry so it remains recognisable at pedestrian eye level.
  const x = 51.5, z = 3.1;
  const levels = [{ y: 0, rx: 7.8, rz: 6.5 }, { y: 16, rx: 7.4, rz: 6.1 }, { y: 75, rx: 5.9, rz: 5.3 },
    { y: 125, rx: 3.7, rz: 3.5 }, { y: 155, rx: 1.7, rz: 1.65 }, { y: 166, rx: .55, rz: .65 }];
  const segments = 28, positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  for (const ring of levels) for (let i = 0; i < segments; i++) {
    const a = i / segments * Math.PI * 2;
    positions.push(x + Math.cos(a) * ring.rx, ring.y, z + Math.sin(a) * ring.rz);
    uvs.push(i / segments * 3, ring.y / 12.8);
  }
  for (let row = 0; row < levels.length - 1; row++) for (let i = 0; i < segments; i++) {
    const a = row * segments + i, b = row * segments + (i + 1) % segments;
    indices.push(a, b, a + segments, b, b + segments, a + segments);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  const towerMap = facadeTexture("glass");
  const tower = new THREE.Mesh(geometry, new THREE.MeshPhysicalMaterial({ map: towerMap, color: 0xc2dce1, metalness: .48, roughness: .22, emissive: 0x236072, emissiveIntensity: .42, side: THREE.DoubleSide, clearcoat: .9 }));
  scene.add(tower);
  const finMaterial = new THREE.MeshBasicMaterial({ color: 0x92ecf2, transparent: true, opacity: .75, toneMapped: false });
  for (let i = 0; i < 24; i++) {
    const angle = i / 24 * Math.PI * 2;
    for (let j = 0; j < levels.length - 1; j++) {
      const a = levels[j], b = levels[j + 1];
      const p = [x + Math.cos(angle) * a.rx, a.y, z + Math.sin(angle) * a.rz];
      const q = [x + Math.cos(angle) * b.rx, b.y, z + Math.sin(angle) * b.rz];
      const dir = new THREE.Vector3(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
      const fin = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, dir.length(), 4), finMaterial);
      fin.position.set((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2);
      fin.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
      scene.add(fin);
    }
  }
  const crown = new THREE.Mesh(new THREE.SphereGeometry(.58, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffa7d4, toneMapped: false }));
  crown.position.set(x, 166.5, z); scene.add(crown);
  return towerMap;
}

export function buildJamsilScene(scene: THREE.Scene, renderer: THREE.WebGLRenderer, onReady: () => void, onError: () => void) {
  const textures: THREE.Texture[] = [];
  const animations: ((time: number) => void)[] = [];
  const loader = new THREE.TextureLoader();
  let disposed = false;

  scene.background = new THREE.Color(0x0c1727);
  scene.fog = new THREE.FogExp2(0x172235, .0065);
  const skyGeometry = new THREE.SphereGeometry(370, 32, 16);
  const skyPositions = skyGeometry.getAttribute("position");
  const skyColors: number[] = [];
  const horizon = new THREE.Color(0x3b2945), mid = new THREE.Color(0x13283d), zenith = new THREE.Color(0x071020);
  for (let i = 0; i < skyPositions.count; i++) {
    const rise = THREE.MathUtils.clamp(skyPositions.getY(i) / 370, 0, 1);
    const color = rise < .16 ? horizon.clone().lerp(mid, rise / .16) : mid.clone().lerp(zenith, (rise - .16) / .84);
    skyColors.push(color.r, color.g, color.b);
  }
  skyGeometry.setAttribute("color", new THREE.Float32BufferAttribute(skyColors, 3));
  const sky = new THREE.Mesh(skyGeometry, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false }));
  sky.renderOrder = -101;
  scene.add(sky);
  const panorama = loader.load("/textures/seokchon-blue-hour-panorama.png");
  panorama.colorSpace = THREE.SRGBColorSpace;
  panorama.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  textures.push(panorama);
  const foliageMap = loader.load("/textures/foliage-cluster-v2.png");
  foliageMap.colorSpace = THREE.SRGBColorSpace;
  foliageMap.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  textures.push(foliageMap);
  const panoramaGeometry = new THREE.SphereGeometry(340, 80, 40);
  const panoramaUvs = panoramaGeometry.getAttribute("uv");
  for (let i = 0; i < panoramaUvs.count; i++) {
    // Keep the photographed water below the rendered lake; only the sky,
    // Jamsil skyline, and far-bank tree line should meet the 3D world.
    panoramaUvs.setY(i, THREE.MathUtils.clamp(panoramaUvs.getY(i) * 2.2 - .74, 0, 1));
  }
  const background = new THREE.Mesh(
    panoramaGeometry,
    new THREE.MeshBasicMaterial({ map: panorama, side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false }),
  );
  background.position.set(40, 1.7, 30);
  background.rotation.y = 0;
  background.renderOrder = -100;
  scene.add(background);
  scene.add(new THREE.HemisphereLight(0xc0dbe7, 0x2a2c38, 2.15));
  const moon = new THREE.DirectionalLight(0xb4cddd, 2.45); moon.position.set(-60, 120, 80); scene.add(moon);
  const cityGlow = new THREE.DirectionalLight(0xff9cac, .3); cityGlow.position.set(65, 35, -55); scene.add(cityGlow);

  const tileTexture = (file: string, color: boolean) => {
    const map = loader.load(`/textures/${file}`);
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
    if (color) map.colorSpace = THREE.SRGBColorSpace;
    textures.push(map);
    return map;
  };
  const paving = tileTexture("pavement-05-diff.jpg", true);
  const pavingNormal = tileTexture("pavement-05-normal.jpg", false);
  const pathPavers = tileTexture("pavement-06-diff.jpg", true);
  const pathNormal = tileTexture("pavement-06-normal.jpg", false);
  addParkGround(scene, paving, pavingNormal, pathPavers, pathNormal);

  const roadTex = loader.load("/textures/asphalt-diff.jpg");
  roadTex.colorSpace = THREE.SRGBColorSpace;
  roadTex.wrapS = roadTex.wrapT = THREE.RepeatWrapping;
  roadTex.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  textures.push(roadTex);
  const streetWidth = (p: Path) => p.k === "primary" ? 12 : p.k === "tertiary" ? 7 : p.k === "busway" ? 5 : p.k.includes("link") ? 5 : p.k === "residential" ? 4.6 : 3.3;
  const visibleRoads = roadData.filter((path) => ["primary", "tertiary", "primary_link", "tertiary_link", "busway"].includes(path.k));
  addRibbon(scene, visibleRoads, new THREE.MeshStandardMaterial({ color: 0x252d35, roughness: .92, side: THREE.DoubleSide }), (path) => streetWidth(path) + .24, -.003);
  addRibbon(scene, visibleRoads, new THREE.MeshStandardMaterial({ color: 0x4d545c, map: roadTex, roughness: .91, metalness: .03, side: THREE.DoubleSide }), streetWidth, .008);
  addRoadSides(scene, visibleRoads, streetWidth, paving, pavingNormal);
  const lanePositions: number[] = [], laneIndices: number[] = [];
  for (const path of visibleRoads.filter((item) => item.k === "primary" || item.k === "tertiary")) {
    for (let i = 1; i < path.p.length; i++) {
      const a = path.p[i - 1], b = path.p[i], dx = b[0] - a[0], dz = b[1] - a[1];
      const length = Math.hypot(dx, dz);
      if (length < 1 || !inVisibleArea((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)) continue;
      const ux = dx / length, uz = dz / length, nx = -uz * .055, nz = ux * .055;
      for (let position = 1; position + 1.9 < length; position += 5.3) {
        const sx = a[0] + ux * position, sz = a[1] + uz * position;
        const ex = sx + ux * 1.9, ez = sz + uz * 1.9;
        const start = lanePositions.length / 3;
        lanePositions.push(sx - nx, .047, sz - nz, sx + nx, .047, sz + nz,
          ex - nx, .047, ez - nz, ex + nx, .047, ez + nz);
        laneIndices.push(start, start + 1, start + 2, start + 1, start + 3, start + 2);
      }
    }
  }
  const laneGeometry = new THREE.BufferGeometry();
  laneGeometry.setAttribute("position", new THREE.Float32BufferAttribute(lanePositions, 3));
  laneGeometry.setIndex(laneIndices); laneGeometry.computeVertexNormals();
  scene.add(new THREE.Mesh(laneGeometry, new THREE.MeshBasicMaterial({ color: 0xcfc9a7, transparent: true, opacity: .65, side: THREE.DoubleSide })));
  // The walk follows the East Lake shore instead of reading as another traffic lane.
  const promenade: Path = { k: "pedestrian", n: "석촌호수 동호 산책로", p: [[61.6, 72], [57.6, 66], [55.6, 60], [55.6, 55], [56.6, 50], [59.6, 45], [65.6, 40]] };
  addRibbon(scene, [promenade], new THREE.MeshStandardMaterial({ color: 0x555d5a, roughness: .93, side: THREE.DoubleSide }), () => 6.2, LAKE_WALK_LEVEL + .005);
  addRibbon(scene, [promenade], new THREE.MeshStandardMaterial({ color: 0xd8cbc9, map: pathPavers, normalMap: pathNormal, normalScale: new THREE.Vector2(.58, .58), roughness: .82, side: THREE.DoubleSide }), () => 5.95, LAKE_WALK_LEVEL + .025, .23);
  const garden: Path = { k: "pedestrian", n: "산책로 상부 식재대", p: promenade.p.map(([x, z]) => [x - 5.7, z]) };
  addRibbon(scene, [garden], new THREE.MeshStandardMaterial({ color: 0x344941, roughness: .98, side: THREE.DoubleSide }), () => 1.4, .028);
  const stairPaving = tileTexture("pavement-05-diff.jpg", true);
  const stairNormal = tileTexture("pavement-05-normal.jpg", false);
  stairPaving.repeat.set(.22, 1.3);
  stairNormal.repeat.set(.22, 1.3);
  addLakeDescent(scene, stairPaving, stairNormal);

  const rippleNormals = lakeRippleNormals();
  textures.push(rippleNormals);
  const waterMat = new THREE.MeshPhysicalMaterial({ color: 0x346579, emissive: 0x234657, emissiveIntensity: .78, metalness: .18, roughness: .34, clearcoat: .85, normalMap: rippleNormals, normalScale: new THREE.Vector2(.28, .28), side: THREE.DoubleSide });
  for (const water of waters) {
    const shape = new THREE.Shape(water.p.map(([x, z]) => new THREE.Vector2(x, -z)));
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), waterMat);
    mesh.rotation.x = -Math.PI / 2; mesh.position.y = LAKE_WATER_LEVEL; scene.add(mesh);
    const edgePoints = water.p.map(([x, z]) => new THREE.Vector3(x, LAKE_WATER_LEVEL + .04, z));
    const edge = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(edgePoints), new THREE.LineBasicMaterial({ color: 0x7bd6d7, transparent: true, opacity: .31 }));
    scene.add(edge);
  }
  addLakeEdgeWalls(scene);
  addPromenadeLights(scene);
  const waterfrontMetal = new THREE.MeshStandardMaterial({ color: 0x86a8ac, metalness: .82, roughness: .28 });
  const waterfrontGlow = new THREE.MeshBasicMaterial({ color: 0x56cbd4, transparent: true, opacity: .56, toneMapped: false });
  for (const water of waters) for (let i = 1; i < water.p.length; i++) {
    const a = water.p[i - 1], b = water.p[i];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const cx = (a[0] + b[0]) / 2, cz = (a[1] + b[1]) / 2;
    if (length < 1 || length > 14 || cx < 20 || cx > 75 || cz < 30 || cz > 72) continue;
    for (const [height, material, radius] of [[.78, waterfrontMetal, .035], [1.19, waterfrontMetal, .04], [1.23, waterfrontGlow, .012]] as const) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 6), material);
      bar.position.set(cx, LAKE_WALK_LEVEL + height, cz);
      bar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(b[0] - a[0], 0, b[1] - a[1]).normalize());
      scene.add(bar);
    }
    for (const point of [a, b]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, 1.2, 6), waterfrontMetal);
      post.position.set(point[0], LAKE_WALK_LEVEL + .6, point[1]); scene.add(post);
    }
  }
  const glints = new THREE.Group(); scene.add(glints);
  const glintMaterials = [0x9adce0, 0xe8b7ae, 0x8aabca].map((color) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .34, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
  for (let i = 0; i < 390; i++) {
    const x = 57 + (i * 17.47) % 53, z = 36 + (i * 11.91) % 48;
    if (!waters.some((w) => insidePolygon(x, z, w.p))) continue;
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(.34 + (i % 9) * .26, .018 + (i % 3) * .009), glintMaterials[i % glintMaterials.length]);
    strip.rotation.x = -Math.PI / 2; strip.position.set(x, LAKE_WATER_LEVEL + .025, z); glints.add(strip);
  }
  animations.push((time) => {
    glints.position.z = Math.sin(time * .65) * .18;
    rippleNormals.offset.set(time * .006, time * .003);
  });

  const facadeMaps = [facadeTexture("glass"), facadeTexture("apartment"), facadeTexture("stone")];
  textures.push(...facadeMaps);
  const wallMaterials = facadeMaps.map((map, index) => new THREE.MeshStandardMaterial({ map, color: index === 0 ? 0xb9dae3 : index === 1 ? 0xc6c7ce : 0xc8c4c7, metalness: index === 0 ? .4 : .08, roughness: index === 0 ? .34 : .72, emissive: 0x24323f, emissiveIntensity: .25, side: THREE.DoubleSide }));
  const roofMaterials = [0x374954, 0x55545b, 0x5e6469].map((color) => new THREE.MeshStandardMaterial({ color, metalness: .23, roughness: .68, side: THREE.DoubleSide }));
  for (let index = 0; index < buildings.length; index++) {
    const building = buildings[index];
    if (building.p.length < 4) continue;
    const centerX = building.p.reduce((sum, point) => sum + point[0], 0) / building.p.length;
    const centerZ = building.p.reduce((sum, point) => sum + point[1], 0) / building.p.length;
    if (!inVisibleArea(centerX, centerZ)) continue;
    if (centerX > 85 && centerX < 100 && centerZ > 15 && centerZ < 36 && building.h < 8) continue;
    if (building.h > 90 && centerX > 35 && centerX < 70 && centerZ > -14 && centerZ < 20) continue;
    const variant = building.k === "apartments" || /아파트|동$/.test(building.n) ? 1 : building.h > 14 || building.k === "retail" ? 0 : 2;
    const height = Math.max(2.8, building.h);
    const positions: number[] = [], uvs: number[] = [], faces: number[] = [];
    for (let i = 1; i < building.p.length; i++) {
      const a = building.p[i - 1], b = building.p[i];
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (length < .1) continue;
      const start = positions.length / 3;
      positions.push(a[0], 0, a[1], b[0], 0, b[1], a[0], height, a[1], b[0], height, b[1]);
      uvs.push(0, 0, length / 8.8, 0, 0, height / 11.6, length / 8.8, height / 11.6);
      faces.push(start, start + 1, start + 2, start + 1, start + 3, start + 2);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(faces); geometry.computeVertexNormals();
    scene.add(new THREE.Mesh(geometry, wallMaterials[variant]));
    const shape = new THREE.Shape(building.p.map(([x, z]) => new THREE.Vector2(x, -z)));
    const roof = new THREE.Mesh(new THREE.ShapeGeometry(shape), roofMaterials[variant]);
    roof.rotation.x = -Math.PI / 2; roof.position.y = height + .02; scene.add(roof);
  }
  textures.push(buildTower(scene));

  // Keep the walk focused on one dense lakeside block, with familiar Seoul wayfinding.
  addBoard(scene, "롯데월드몰", "#f9a9cb", 25, 6.8, 4, 14, 0, "LOTTE WORLD MALL / OLYMPIC-RO");
  addBoard(scene, "올림픽로", "#88c9e7", 25, 4.3, 18, 5.2, .1, "OLYMPIC-RO");
  addBoard(scene, "잠실역 방면", "#73b9f4", 34, 3.15, 52, 4.2, -.25, "SUBWAY 2 · 8");
  addBoard(scene, "송파대로", "#d9e4db", 25, 4.2, 45, 4.5, Math.PI / 2, "SONGPA-DAERO");
  addParkSign(scene);
  addFarShore(scene, foliageMap);
  addLakeCafeStreet(scene);
  PARK_TREES.forEach(([x, z, scale, seed]) => addParkTree(scene, x, z, scale, seed, foliageMap));
  for (const [x, z, rotation] of [[56.8, 67, -.18], [54, 50, -.32], [62, 42, -.6]] as const) addParkBench(scene, x, z, rotation);

  const laneMat = new THREE.MeshBasicMaterial({ color: 0xe0e1db, transparent: true, opacity: .75, side: THREE.DoubleSide });
  for (const [cx, cz, rotation] of [[32, 43, .12], [49, 36, 1.55]] as const) {
    for (let i = -4; i <= 4; i++) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(.72, 5.1), laneMat);
      stripe.rotation.set(-Math.PI / 2, 0, rotation);
      stripe.position.set(cx + i * 1.55, .041, cz); scene.add(stripe);
    }
  }
  for (let i = 0; i < 18; i++) {
    const x = 22 + i * 1.6;
    const tactile = new THREE.Mesh(new THREE.PlaneGeometry(.95, .45), new THREE.MeshBasicMaterial({ color: 0xd4b46e, side: THREE.DoubleSide }));
    tactile.rotation.x = -Math.PI / 2; tactile.position.set(x, .135, 39); scene.add(tactile);
  }

  const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x788d94, metalness: .8, roughness: .3 });
  const lightMaterial = new THREE.MeshBasicMaterial({ color: 0xffe4b9, toneMapped: false });
  const lampPositions: Point[] = [[24, 60], [46, 59], [18, 45], [37, 42], [22, 22], [43, 19], [62, 26], [57, 48], [70, 45], [13, 53]];
  for (const [x, z] of lampPositions) {
    const base = getGroundHeight(x, z);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.08, .12, 7, 8), poleMaterial); pole.position.set(x, base + 3.5, z); scene.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.65, .08, .08), poleMaterial); arm.position.set(x + .75, base + 6.9, z); scene.add(arm);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(.6, .09, .3), lightMaterial); lamp.position.set(x + 1.4, base + 6.85, z); scene.add(lamp);
    if ([0, 2, 5, 7].includes(lampPositions.findIndex((p) => p[0] === x && p[1] === z))) {
      const glow = new THREE.PointLight(0xffc8a2, 4.2, 19, 2); glow.position.set(x + 1.4, base + 6.7, z); scene.add(glow);
    }
  }
  const rainCount = 220, rainPositions = new Float32Array(rainCount * 6);
  for (let i = 0; i < rainCount; i++) {
    const x = 10 + (i * 31.27) % 65, y = (i * 7.23) % 19, z = 16 + (i * 17.91) % 51;
    rainPositions.set([x, y, z, x - .12, y - .68, z + .04], i * 6);
  }
  const rainGeometry = new THREE.BufferGeometry(); rainGeometry.setAttribute("position", new THREE.BufferAttribute(rainPositions, 3));
  const rain = new THREE.LineSegments(rainGeometry, new THREE.LineBasicMaterial({ color: 0xaacddb, transparent: true, opacity: .18, depthWrite: false })); scene.add(rain);
  animations.push((time) => {
    const position = rain.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < rainCount; i++) {
      const y = 19 - ((time * 11 + i * 7.23) % 19);
      position.setY(i * 2, y); position.setY(i * 2 + 1, y - .68);
    }
    position.needsUpdate = true;
  });

  // Local, licensed GLBs are used as actual 3D objects in the streetscape.
  const modelLoader = new GLTFLoader();
  const props: { file: string; placements: [number, number, number, number?][] }[] = [
    { file: "34226", placements: [[47, 0, 53, -1.55]] },
    { file: "34221", placements: [[43, 0, 55, .54]] },
    { file: "34220", placements: [[48, 0, 54, .54]] },
    { file: "34224", placements: [[17, 0, 60, .54], [64, 0, 27, -1.4]] },
    { file: "34225", placements: [[51.5, 0, 66, 1.5], [74, 0, 30, -1.4], [20, 0, 57, .3]] },
    { file: "34227", placements: [[20, 0, 57, .4]] },
    { file: "34229", placements: [[34, 0, 46, .2]] },
    { file: "34230", placements: [[51, 0, 65], [42, 0, 62], [78, 0, 35], [73, 0, 20]] },
    { file: "32486", placements: [[36, .015, 62, .61]] },
    { file: "32492", placements: [[31, .015, 53, .61]] },
    { file: "32522", placements: [] },
    { file: "34292", placements: [[69, 0, 22, 1.57]] },
    { file: "34293", placements: [[71, 0, 22, 1.57]] },
    { file: "34300", placements: [[68, 0, 21], [71, 0, 20]] },
    { file: "34301", placements: [[67, 0, 21], [70, 0, 20], [72, 0, 21]] },
  ];
  Promise.allSettled(props.map(async ({ file, placements }) => {
    const gltf = await modelLoader.loadAsync(`/seoul-assets/${file}.glb`);
    if (disposed) return;
    const group = gltf.scene;
    for (const [x, y, z, rotation = 0] of placements) {
      const model = group.clone(true);
      model.position.set(x, getGroundHeight(x, z) + y, z); model.rotation.y = rotation;
      scene.add(model);
    }
    if (file === "32522") {
      const taxi = group.clone(true);
      const roadCurve = new THREE.CatmullRomCurve3([
        [70.8, 23.4], [58, 31.6], [43.2, 40.9], [40, 42.7], [33, 47.3], [25.7, 51.7], [21.8, 53.9],
      ].map(([x, z]) => new THREE.Vector3(x, .02, z)), false, "centripetal");
      const routeLength = roadCurve.getLength();
      const wheels: THREE.Object3D[] = [];
      taxi.traverse((part) => { if (/^wheel-(front|rear)-(left|right)$/.test(part.name)) wheels.push(part); });
      const headlights = new THREE.PointLight(0xffe1b4, .9, 7, 2);
      headlights.position.set(0, .8, 2.1); taxi.add(headlights);
      scene.add(taxi);
      animations.push((time) => {
        const trip = (time / routeLength + .54) % 2;
        const forward = trip <= 1;
        const progress = forward ? trip : 2 - trip;
        const point = roadCurve.getPointAt(progress);
        const tangent = roadCurve.getTangentAt(progress).multiplyScalar(forward ? 1 : -1);
        taxi.position.copy(point);
        taxi.rotation.y = Math.atan2(tangent.x, tangent.z);
        wheels.forEach((wheel) => { wheel.rotation.x = -time * 3; });
      });
    }
  })).then((results) => {
    if (disposed) return;
    const failed = results.filter((result) => result.status === "rejected");
    if (failed.length) { console.error("Jamsil assets could not load", failed); onError(); }
    else onReady();
  });

  return {
    animate(time: number) { animations.forEach((animate) => animate(time)); },
    dispose() { disposed = true; textures.forEach((texture) => texture.dispose()); },
  };
}
