import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import seoul from "../../public/data/seoul.json";
import { elevationMetres, metresToHeight, terrainGeometry, terrainHeight } from "./SeoulTerrain";
import { inside, waters, parks, footprints, waterAt, parkAt, surfaceHeight, polygonGeometry, drapedPolygon, drapedOutline, withinDetail } from "./SeoulGeography";
import { buildCommuteScene } from "./CommuteScene";
import { buildMetroJourney } from "./MetroJourney";
import { loadCityAssets, type CityBlock } from "./CityAssets";

function project(lon: number, lat: number) {
  return new THREE.Vector3((lon - seoul.origin.lon) * 1113.2 * Math.cos(seoul.origin.lat * Math.PI / 180), 0, (seoul.origin.lat - lat) * 1113.2);
}

export const ATLAS_PLACES = [
  { name: "시청 · 광화문", label: "CITY CENTER", district: "중구", lon: 126.978, lat: 37.5665, description: "오래된 거리와 새로운 일상이 만나는 서울의 중심." },
  { name: "남산", label: "NAMSAN", district: "용산구", lon: 126.9882, lat: 37.5512, description: "도시를 조금 떨어져 바라보는, 한가운데의 쉼표." },
  { name: "홍대 · 연남", label: "HONGDAE", district: "마포구", lon: 126.9237, lat: 37.5567, description: "작은 가게와 다양한 취향이 이어지는 동네." },
  { name: "여의도", label: "YEOUIDO", district: "영등포구", lon: 126.9368, lat: 37.5256, description: "한강을 따라 펼쳐지는 또 다른 서울의 풍경." },
  { name: "강남", label: "GANGNAM", district: "강남구", lon: 127.0276, lat: 37.4979, description: "많은 사람과 아이디어가 교차하는 곳." },
  { name: "잠실", label: "JAMSIL", district: "송파구", lon: 127.1025, lat: 37.5125, description: "높은 타워 아래, 호수와 도시가 나란히." },
].map(place => ({ ...place, position: project(place.lon, place.lat) }));

const withinSeoul = (x: number, z: number) => seoul.districts.some(d => inside(x, z, d.rings[0]) && !d.rings.slice(1).some(r => inside(x, z, r)));

// Actual boundaries, terrain, water and central footprints; schematic filler outside detail extracts.
export function buildSeoulAtlas(renderer: THREE.WebGLRenderer) {
  const scene = new THREE.Scene();
  // The transparent canvas reveals a layered sky that fades in with the story.
  scene.fog = new THREE.FogExp2("#142c40", .0008);
  const camera = new THREE.PerspectiveCamera(48, 1, .001, 1800);
  scene.add(new THREE.HemisphereLight(0xb3d6e5, 0x071319, 1.6));
  const key = new THREE.DirectionalLight(0xb8d8e4, 2);
  key.position.set(-160, 240, 80); scene.add(key);
  const rim = new THREE.DirectionalLight(0x61c9b2, 1.4);
  rim.position.set(160, 90, -200); scene.add(rim);
  const city = new THREE.Group(); scene.add(city);
  const borderMaterial = new THREE.LineBasicMaterial({ color: 0x78c5bd, transparent: true, opacity: .4 });
  const orbitMaterial = new THREE.LineBasicMaterial({ color: 0x567d86, transparent: true, opacity: .25 });
  const ground = new THREE.Mesh(new THREE.CylinderGeometry(235, 235, 3, 160), new THREE.MeshStandardMaterial({ color: 0x122431, roughness: .8, metalness: .2, transparent:true, depthWrite:false }));
  ground.position.y = -2; city.add(ground);
  function ring(x: number, y: number, z: number, radius: number, material: THREE.LineBasicMaterial) {
    const points = Array.from({ length: 144 }, (_, i) => new THREE.Vector3(x + Math.cos(i / 144 * Math.PI * 2) * radius, y, z + Math.sin(i / 144 * Math.PI * 2) * radius));
    const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), material);
    city.add(line); return line;
  }
  ring(0, -.45, 0, 236, borderMaterial);
  ring(0, -.7, 0, 250, orbitMaterial);
  const boundaries = new THREE.Group(); city.add(boundaries);
  city.add(new THREE.Mesh(terrainGeometry(withinSeoul, (x, z) => { const water = waterAt(x, z); return water ? water.level - .12 : terrainHeight(x, z); }), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9, metalness: .1 })));
  const districtMaterials = seoul.districts.map(district => {
    const material = new THREE.LineBasicMaterial({ color: 0x78c5bd, transparent: true, opacity: .24 });
    for (const outline of district.rings) boundaries.add(new THREE.LineLoop(drapedOutline(outline), material));
    return material;
  });
  const riverMaterial = new THREE.MeshPhysicalMaterial({ color: 0x164e5a, emissive: 0x0a333b, emissiveIntensity: .28, metalness: .45, roughness: .32, clearcoat: 1, side: THREE.DoubleSide });
  const bankMaterial = new THREE.LineBasicMaterial({ color: 0x6cdbc4, transparent: true, opacity: .4 });
  for (const water of waters) {
    const geometry = polygonGeometry(water.p, water.holes); geometry.translate(0, water.level, 0);
    city.add(new THREE.Mesh(geometry, riverMaterial));
    for (const outline of [water.p, ...water.holes]) {
      const points = outline.filter(([x, z]) => Math.abs(x) < 215 && Math.abs(z) < 170 && Math.hypot(x, z) < 232).map(([x, z]) => new THREE.Vector3(x, water.level + .04, z));
      city.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), bankMaterial));
    }
  }
  const parkMaterial = new THREE.MeshStandardMaterial({ color: 0x204d43, roughness: .95, side: THREE.DoubleSide });
  const parkVertices: number[] = [];
  for (const park of parks) {
    const geometry = drapedPolygon(park.p), positions = geometry.getAttribute("position");
    for (let i = 0; i < positions.count; i++) parkVertices.push(positions.getX(i), positions.getY(i), positions.getZ(i));
    geometry.dispose();
  }
  const parkGeometry = new THREE.BufferGeometry(); parkGeometry.setAttribute("position", new THREE.Float32BufferAttribute(parkVertices, 3)); parkGeometry.computeVertexNormals();
  city.add(new THREE.Mesh(parkGeometry, parkMaterial));
  const roadPoints: THREE.Vector3[] = [], bridgePoints: THREE.Vector3[] = [];
  const roadCells = new Set<string>();
  const roadAngles = new Map<string,number>();
  const cellKey = (x: number, z: number) => `${Math.round(x)},${Math.round(z)}`;
  for (const road of seoul.roads) {
    for (let i = 1; i < road.p.length; i++) {
      const a = road.p[i - 1], b = road.p[i];
      if (!withinSeoul((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)) continue;
      const bridgeY = Math.max(terrainHeight(a[0], a[1]), terrainHeight(b[0], b[1]), 1.8);
      const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2));
      for (let j = 0; j < steps; j++) for (const t of [j / steps, (j + 1) / steps]) {
        const x = THREE.MathUtils.lerp(a[0], b[0], t), z = THREE.MathUtils.lerp(a[1], b[1], t);
        (road.bridge ? bridgePoints : roadPoints).push(new THREE.Vector3(x, road.bridge ? bridgeY + .1 : surfaceHeight(x, z) + .15, z));
      }
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      for (let step = 0; step <= Math.ceil(length); step++) {
        const t = step / (Math.ceil(length) || 1);
        const x = THREE.MathUtils.lerp(a[0], b[0], t), z = THREE.MathUtils.lerp(a[1], b[1], t);
        roadCells.add(cellKey(x, z));
        roadAngles.set(cellKey(x,z),Math.atan2(b[0]-a[0],b[1]-a[1]));
      }
    }
  }
  city.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(roadPoints), new THREE.LineBasicMaterial({ color: 0x5d9298, transparent: true, opacity: .34 })));
  city.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(bridgePoints), new THREE.LineBasicMaterial({ color: 0xb2e5d1, transparent: true, opacity: .65 })));

  const noise = (x: number, z: number) => { const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return n - Math.floor(n); };
  const occupied = new Set<string>();
  const detailedVertices: number[][] = [[], []];
  for (const building of footprints) {
    const p = building.p.slice(0, -1); if (p.length < 3) continue;
    const x = p.reduce((sum, v) => sum + v[0], 0) / p.length, z = p.reduce((sum, v) => sum + v[1], 0) / p.length;
    if (!withinSeoul(x, z) || waterAt(x, z)) continue;
    const minX = Math.min(...p.map(v => v[0])), maxX = Math.max(...p.map(v => v[0])), minZ = Math.min(...p.map(v => v[1])), maxZ = Math.max(...p.map(v => v[1]));
    for (let cx = Math.floor(minX) - 1; cx <= Math.ceil(maxX) + 1; cx++) for (let cz = Math.floor(minZ) - 1; cz <= Math.ceil(maxZ) + 1; cz++) occupied.add(cellKey(cx, cz));
    if (Math.hypot(x - ATLAS_PLACES[5].position.x, z - ATLAS_PLACES[5].position.z) < 1.5 && (building.height ?? 0) > 300) continue;
    if (Math.hypot(x - ATLAS_PLACES[1].position.x, z - ATLAS_PLACES[1].position.z) < .5) continue;
    const height = metresToHeight(building.height ?? (building.kind === 'roof' ? 4 : 7 + noise(x, z) * 8));
    const groundHeight = terrainHeight(x, z), base = groundHeight + metresToHeight(building.minHeight), top = groundHeight + height;
    const vertices = detailedVertices[(building.height ?? 0) >= 100 ? 1 : 0];
    const contour = p.map(([px, pz]) => new THREE.Vector2(px, -pz));
    for (const face of THREE.ShapeUtils.triangulateShape(contour, [])) for (const k of face) vertices.push(p[k][0], top, p[k][1]);
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length];
      vertices.push(a[0], base, a[1], b[0], base, b[1], b[0], top, b[1], a[0], base, a[1], b[0], top, b[1], a[0], top, a[1]);
    }
  }
  const landmarkMaterial = new THREE.MeshPhysicalMaterial({ color: 0x588a91, metalness: .55, roughness: .3, clearcoat: 1, emissive: 0x195147, emissiveIntensity: .15, side: THREE.DoubleSide });
  detailedVertices.forEach((vertices, i) => {
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3)); geometry.computeVertexNormals();
    city.add(new THREE.Mesh(geometry, i ? landmarkMaterial : new THREE.MeshStandardMaterial({ color: 0x416571, roughness: .75, metalness: .25, side: THREE.DoubleSide })));
  });
  const blocks: CityBlock[] = [];
  for (let x = -190; x <= 188; x += 2.7 + noise(x,0)*1.4) for (let z = -150 + noise(x,1)*2; z <= 160; z += 2.7 + noise(x,z)*1.4) {
    if (!withinSeoul(x, z) || withinDetail(x, z) || occupied.has(cellKey(x, z)) || roadCells.has(cellKey(x, z)) || waterAt(x, z) || parkAt(x, z) || noise(x, z) < .2) continue;
    const elevation = elevationMetres(x, z), slope = Math.max(Math.abs(elevationMetres(x + 2, z) - elevation), Math.abs(elevationMetres(x, z + 2) - elevation));
    if (elevation > 85 || slope > 10) continue;
    const jitterX = x + (noise(x + 5, z) - .5) * 2.2, jitterZ = z + (noise(x, z + 5) - .5) * 2.2;
    if (waterAt(jitterX, jitterZ) || parkAt(jitterX, jitterZ) || withinDetail(jitterX, jitterZ)) continue;
    const density=Math.max(...ATLAS_PLACES.map(p=>Math.exp(-Math.hypot(x-p.position.x,z-p.position.z)/30)));
    const angle=roadAngles.get(cellKey(x,z))??roadAngles.get(cellKey(x+2,z))??roadAngles.get(cellKey(x,z+2))??Math.floor(noise(Math.floor(x/14),Math.floor(z/14))*4)*Math.PI/6;
    blocks.push({x:jitterX,z:jitterZ,height:metresToHeight(12+noise(x+1,z)**2*(55+density*80)),width:.5+noise(x+2,z)*.8,depth:.5+noise(x,z+2)*.8,angle,detail:noise(x+6,z)>.8,variant:Math.floor(noise(x+7,z)*19)});
  }
  const buildings = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: .3, roughness: .75 }), blocks.length);
  const dummy = new THREE.Object3D();
  blocks.forEach((b, i) => {
    dummy.position.set(b.x, terrainHeight(b.x, b.z) + b.height / 2, b.z); dummy.scale.set(b.width, b.height, b.depth); dummy.rotation.y = b.angle; dummy.updateMatrix(); buildings.setMatrixAt(i, dummy.matrix);
    buildings.setColorAt(i, new THREE.Color().setHSL(.52, .2, .06 + noise(b.x, b.z) * .025));
  });
  buildings.computeBoundingSphere(); city.add(buildings);
  const cityAssets=loadCityAssets(city,blocks,buildings);
  const namsan = ATLAS_PLACES[1].position, namsanBase = terrainHeight(namsan.x, namsan.z);
  function towerPart(geometry: THREE.BufferGeometry, position: THREE.Vector3, y: number) {
    const mesh = new THREE.Mesh(geometry, landmarkMaterial); mesh.position.copy(position).setY(terrainHeight(position.x, position.z) + y); city.add(mesh);
  }
  towerPart(new THREE.CylinderGeometry(.12, .3, metresToHeight(135), 20), namsan, metresToHeight(67.5));
  towerPart(new THREE.CylinderGeometry(.6, .55, metresToHeight(32), 24), namsan, metresToHeight(151));
  towerPart(new THREE.CylinderGeometry(.04, .09, metresToHeight(69.7), 12), namsan, metresToHeight(201.85));
  const lotte = ATLAS_PLACES[5].position, lotteBase = terrainHeight(lotte.x, lotte.z);
  const profile = [[.55, 0], [.53, 70], [.44, 265], [.27, 440], [.09, 530], [.015, 555]].map(([r, y]) => new THREE.Vector2(r, metresToHeight(y)));
  const towerGeometry = new THREE.LatheGeometry(profile, 36); towerGeometry.scale(1, 1, .85);
  towerPart(towerGeometry, lotte, 0);
  const fins: THREE.Vector3[] = [];
  for (let i = 0; i < 18; i++) for (let j = 1; j < profile.length; j++) for (const p of [profile[j - 1], profile[j]]) {
    const angle = i / 18 * Math.PI * 2; fins.push(new THREE.Vector3(lotte.x + Math.cos(angle) * p.x, lotteBase + p.y, lotte.z + Math.sin(angle) * p.x * .85));
  }
  city.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(fins), bankMaterial));
  const markerHeights = ATLAS_PLACES.map(p => terrainHeight(p.position.x, p.position.z) + 3);
  markerHeights[1] = namsanBase + metresToHeight(236.7) + 1.2;
  markerHeights[3] += metresToHeight(252);
  markerHeights[5] = lotteBase + metresToHeight(555) + 1.2;
  const markers = ATLAS_PLACES.map((place, i) => {
    const position = place.position.clone().setY(markerHeights[i]);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(.6, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xb7ffda).multiplyScalar(1.5) })); beacon.position.copy(position); city.add(beacon);
    return { position, beacon, halo: ring(place.position.x, terrainHeight(place.position.x, place.position.z) + .4, place.position.z, 4, bankMaterial) };
  });
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 9, 8); controls.enableDamping = true; controls.dampingFactor = .06;
  controls.enablePan = false; controls.minDistance = 130; controls.maxDistance = 900;
  controls.minPolarAngle = .3; controls.maxPolarAngle = 1.22;
  controls.rotateSpeed = .45; controls.autoRotateSpeed = .2;
  const composer = new EffectComposer(renderer);
  composer.renderTarget1.samples = 4; composer.renderTarget2.samples = 4;
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .35, .65, .85); composer.addPass(bloom);
  const output = new OutputPass(); composer.addPass(output);
  let currentPlace = -2;
  let destination: { target: THREE.Vector3; distance: number } | null = null;
  const screen = new THREE.Vector3();
  let userInteracted = false;
  let initializedCamera = false;
  const onStart = () => { destination = null; userInteracted = true; };
  controls.addEventListener("start", onStart);
  const commute = buildCommuteScene();
  const journey=buildMetroJourney(project);scene.add(journey.group);scene.add(commute.group);
  const openingTarget=new THREE.Vector3();
  const overviewTarget = new THREE.Vector3(0,9,8);
  let width = 1, height = 1;
  let storyProgress = 0;
  let isExploring=false;
  let viewOffsetY=0;
  let orbitArrival=0;
  return {
    resize(nextWidth: number, nextHeight: number) {
      width = nextWidth; height = nextHeight;
      camera.aspect = width / height; camera.fov = width < 700 ? 56 : 48;
      if (!initializedCamera) {
        camera.position.set(width < 700 ? 330 : 355, width < 700 ? 435 : 410, width < 700 ? 490 : 450);
        initializedCamera = true;
      }
      camera.setViewOffset(width,height,0,height*viewOffsetY,width,height);
      camera.updateProjectionMatrix(); controls.update(); composer.setSize(width, height);
    },
    story(progress:number,time:number,reducedMotion:boolean,exploring:boolean,delta:number) {
      const wasInStory=storyProgress<1;
      storyProgress=progress;isExploring=exploring;
      journey.update(progress,time,reducedMotion);
      commute.group.position.copy(journey.position);commute.group.rotation.y=journey.heading;
      openingTarget.copy(journey.position).add(new THREE.Vector3(-.02,.018,0).applyAxisAngle(new THREE.Vector3(0,1,0),journey.heading));
      commute.update(progress,time,reducedMotion);
      if(progress>=1) {
        if(wasInStory) {
          controls.target.copy(overviewTarget);
          camera.position.copy(overviewTarget).addScaledVector(new THREE.Vector3(.51,.58,.64).normalize(),width<700?590:450);
        }
        camera.near=1;
        const nextOffset=exploring?0:-.16;
        viewOffsetY=reducedMotion?nextOffset:THREE.MathUtils.lerp(viewOffsetY,nextOffset,1-Math.exp(-delta*2.5));
        camera.setViewOffset(width,height,0,height*viewOffsetY,width,height);
        camera.updateProjectionMatrix();
        return;
      }
      destination=null;
      orbitArrival=0;
      camera.near=.001;
      // Compose the chat backdrop during the pullback; changing the projection
      // only at arrival made the whole city jump upwards in a single frame.
      viewOffsetY=-.16*THREE.MathUtils.smoothstep(progress,.65,1);
      camera.setViewOffset(width,height,0,height*viewOffsetY,width,height);
      camera.fov=THREE.MathUtils.lerp(width<700?66:58,width<700?56:48,progress);
      camera.updateProjectionMatrix();
      const ease=progress*progress*(3-2*progress);
      const target=openingTarget.clone().lerp(overviewTarget,THREE.MathUtils.smoothstep(progress,.35,1));
      const direction=new THREE.Vector3(1,.018,0).applyAxisAngle(new THREE.Vector3(0,1,0),journey.heading).lerp(new THREE.Vector3(.51,.58,.64),ease).normalize();
      const distance=.026*Math.pow((width<700?590:450)/.026,ease);
      controls.target.copy(target);camera.position.copy(target).addScaledVector(direction,distance);
      camera.lookAt(target);
    },
    focus(index: number,force=false) {
      if (index === currentPlace&&!force) return;
      currentPlace = index;
      const place = ATLAS_PLACES[index];
      destination = { target: place ? place.position.clone().setY(terrainHeight(place.position.x, place.position.z) + 3) : overviewTarget.clone(), distance: place ? 190 : isExploring?700:width<700?590:450 };
      if (!place) userInteracted = false;
      districtMaterials.forEach((material, i) => { material.opacity = place?.district === seoul.districts[i].name ? .8 : .24; });
    },
    render(delta: number, reducedMotion: boolean, labels: (HTMLButtonElement | null)[], showBoundaries: boolean, paused: boolean) {
      // The circular plinth belongs to exploration. In conversation, the terrain
      // meets the sky softly instead of competing with the central typography.
      const backdropBlend=THREE.MathUtils.clamp(viewOffsetY/-.16,0,1);
      ground.material.opacity=THREE.MathUtils.lerp(1,.06,backdropBlend);
      borderMaterial.opacity=THREE.MathUtils.lerp(.4,.035,backdropBlend);
      orbitMaterial.opacity=THREE.MathUtils.lerp(.25,.018,backdropBlend);
      controls.enabled = !paused && storyProgress >= 1; boundaries.visible = showBoundaries && storyProgress > .8;
      orbitArrival=storyProgress>=1?Math.min(1,orbitArrival+delta/2):0;
      controls.autoRotateSpeed=(paused ? .08 : .2)*THREE.MathUtils.smoothstep(orbitArrival,0,1);
      controls.autoRotate = storyProgress>=1 && !reducedMotion && currentPlace < 0 && !userInteracted && !destination;
      if (destination) {
        const alpha = reducedMotion ? 1 : 1 - Math.exp(-delta * 3.5);
        const offset = camera.position.clone().sub(controls.target);
        controls.target.lerp(destination.target, alpha);
        offset.setLength(THREE.MathUtils.lerp(offset.length(), destination.distance, alpha));
        camera.position.copy(controls.target).add(offset);
        if (controls.target.distanceTo(destination.target) < .1 && Math.abs(offset.length() - destination.distance) < .1) destination = null;
      }
      if(storyProgress>=1) controls.update(delta);
      const occupied: { x: number; y: number; width: number; height: number }[] = [];
      for (const i of [5, 1, 3, 4, 0, 2]) {
        const { position, beacon, halo } = markers[i];
        halo.visible = i === currentPlace; beacon.scale.setScalar(i === currentPlace ? 1.5 : 1);
        const label = labels[i]; if (!label) continue;
        screen.copy(position).project(camera);
        const x = (screen.x * .5 + .5) * renderer.domElement.clientWidth;
        const y = (-screen.y * .5 + .5) * renderer.domElement.clientHeight;
        const bounds = { x: x - 4, y: y - 16, width: 30 + ATLAS_PLACES[i].name.length * 9, height: 32 };
        const collision = occupied.some(b => bounds.x < b.x + b.width + 6 && bounds.x + bounds.width + 6 > b.x && bounds.y < b.y + b.height + 4 && bounds.y + bounds.height + 4 > b.y);
        const visible = screen.z <= 1 && screen.z >= -1 && Math.abs(screen.x) <= .93 && Math.abs(screen.y) <= .9 && (currentPlace < 0 || i === currentPlace) && !collision;
        label.style.left = `${(screen.x * .5 + .5) * 100}%`; label.style.top = `${(-screen.y * .5 + .5) * 100}%`;
        label.style.visibility = visible ? "visible" : "hidden";
        if (visible) occupied.push(bounds);
      }
      composer.render(delta);
    },
    dispose() {
      cityAssets.dispose();
      controls.removeEventListener("start", onStart); controls.dispose(); bloom.dispose(); output.dispose(); composer.dispose();
      const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
      scene.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points) {
          geometries.add(object.geometry);
          (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => materials.add(material));
          if (object instanceof THREE.InstancedMesh) object.dispose();
        }
      });
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
    },
  };
}
