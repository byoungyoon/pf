import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { buildLobbySkyline } from "./LobbySkyline";

export const COFFEE_STOP = { x: 0, z: -5.6 } as const;

function box(scene: THREE.Scene, material: THREE.Material, x: number, y: number, z: number, width: number, height: number, depth: number) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  scene.add(mesh);
  return mesh;
}

function roundedBox(group: THREE.Group, material: THREE.Material, x: number, y: number, z: number, width: number, height: number, depth: number, radius = .14) {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(width, height, depth, 4, radius), material);
  mesh.position.set(x, y, z); group.add(mesh);
  return mesh;
}

function wallLettering(title: string, subtitle: string, accent: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024; canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 1024, 256);
  ctx.fillStyle = accent;
  ctx.font = "600 27px Arial, sans-serif";
  ctx.letterSpacing = "5px";
  ctx.fillText(subtitle, 28, 58);
  ctx.fillStyle = "#f3ebdd";
  ctx.font = "700 80px Apple SD Gothic Neo, Noto Sans KR, sans-serif";
  ctx.letterSpacing = "-3px";
  ctx.fillText(title, 25, 164, 950);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function cafeMenuTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 640; canvas.height = 880;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#282b29";
  ctx.fillRect(0, 0, 640, 880);
  ctx.fillStyle = "#d7bc92";
  ctx.font = "600 24px Arial, sans-serif";
  ctx.letterSpacing = "9px";
  ctx.fillText("JAMSIL CAFE", 56, 94);
  ctx.fillStyle = "#f4eadb";
  ctx.font = "700 67px Georgia, serif";
  ctx.letterSpacing = "0px";
  ctx.fillText("Coffee &", 56, 180);
  ctx.fillText("Conversation", 56, 251);
  ctx.strokeStyle = "#a78c6a";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(56, 305); ctx.lineTo(584, 305); ctx.stroke();
  const drinks = ["ESPRESSO", "FLAT WHITE", "CAFE LATTE", "FILTER COFFEE", "HOT CHOCOLATE"];
  ctx.font = "500 31px Arial, sans-serif";
  ctx.letterSpacing = "4px";
  drinks.forEach((drink, i) => { ctx.fillText(drink, 58, 388 + i * 77); });
  ctx.fillStyle = "#c5ae8a";
  ctx.font = "italic 29px Georgia, serif";
  ctx.letterSpacing = "0px";
  ctx.fillText("Stay a little longer.", 58, 813);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

export function buildTowerLobby(scene: THREE.Scene) {
  scene.background = new THREE.Color(0x1b252b);
  scene.fog = new THREE.FogExp2(0x1b252b, .007);
  scene.add(new THREE.HemisphereLight(0xffe7cf, 0x35434a, 2.35));
  const daylight = new THREE.DirectionalLight(0xffe1bf, 1.8);
  daylight.position.set(-7, 12, 4);
  scene.add(daylight);

  const textureLoader = new THREE.TextureLoader();
  const maps: THREE.Texture[] = [];
  const marbleMap = textureLoader.load("/lobby-assets/marble_01_diff_2k.jpg");
  const marbleNormal = textureLoader.load("/lobby-assets/marble_01_nor_gl_2k.jpg");
  const marbleRough = textureLoader.load("/lobby-assets/marble_01_rough_2k.jpg");
  marbleMap.colorSpace = THREE.SRGBColorSpace;
  for (const map of [marbleMap, marbleNormal, marbleRough]) {
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(3.5, 4.5);
    map.anisotropy = 8;
    maps.push(map);
  }
  const marble = new THREE.MeshPhysicalMaterial({ map: marbleMap, normalMap: marbleNormal, normalScale: new THREE.Vector2(.25, .25), roughnessMap: marbleRough, color: 0xe1d8c7, roughness: .55, metalness: .03, clearcoat: .22 });
  const walnut = new THREE.MeshStandardMaterial({ color: 0x5a4538, roughness: .67, metalness: .03 });
  const walnutDark = new THREE.MeshStandardMaterial({ color: 0x352f2b, roughness: .76, metalness: .04 });
  const charcoal = new THREE.MeshStandardMaterial({ color: 0x293138, roughness: .72, metalness: .12 });
  const bronze = new THREE.MeshStandardMaterial({ color: 0xa78c6a, roughness: .32, metalness: .72 });
  const smokedGlass = new THREE.MeshPhysicalMaterial({ color: 0x74919a, transparent: true, opacity: .25, metalness: .18, roughness: .15, depthWrite: false, side: THREE.DoubleSide });
  const warmGlass = new THREE.MeshBasicMaterial({ color: 0xffdfae, toneMapped: false });
  const rug = new THREE.MeshStandardMaterial({ color: 0x67594b, roughness: 1, metalness: 0 });

  box(scene, charcoal, 0, -.25, 1, 22, .48, 29);
  const tiledFloor = new THREE.Mesh(new THREE.PlaneGeometry(21.65, 28.7), marble);
  tiledFloor.rotation.x = -Math.PI / 2;
  tiledFloor.position.set(0, .01, 1);
  scene.add(tiledFloor);
  for (const x of [-10.35, 10.35]) box(scene, walnutDark, x, .025, 1, .36, .035, 28.2);
  for (const z of [-12.9, 14.9]) box(scene, walnutDark, 0, .025, z, 20.7, .035, .26);
  for (const x of [-2.2, 4.2]) box(scene, rug, x, .038, .05, 3.7, .02, 6.4);

  box(scene, charcoal, 0, 8.43, 1, 22, .36, 29);
  box(scene, walnutDark, 0, 8.14, 1, 15.8, .09, 24.8);
  box(scene, walnutDark, 0, 6.94, 4.05, 20.4, .16, 20.6);
  for (let x = -9.4; x <= 9.4; x += 1.88) box(scene, walnut, x, 6.8, 4.05, .085, .11, 20.45);
  for (const x of [-6.65, 0, 6.65]) {
    for (const z of [8.5, 2.6, -3.3]) box(scene, warmGlass, x, 6.70, z, 1.55, .018, .13);
    const glow = new THREE.PointLight(0xffd7aa, 1.7, 11, 2);
    glow.position.set(x, 6.3, 2.6);
    scene.add(glow);
  }
  for (const x of [-8.45, 8.45]) box(scene, bronze, x, 8.13, 1, .045, .04, 25.1);
  for (const z of [-10.25, 12.25]) box(scene, bronze, 0, 8.13, z, 16.7, .04, .045);
  for (const z of [-7.5, -.5, 6.5]) {
    box(scene, warmGlass, 0, 8.065, z, 2.3, .012, .42);
    const light = new THREE.PointLight(0xffe1bc, 2.8, 16, 2);
    light.position.set(0, 7.65, z); scene.add(light);
  }

  for (const side of [-1, 1]) {
    const x = side * 10.8;
    box(scene, walnutDark, x, 4.15, 1, .42, 8.3, 29);
    for (const z of [-10.7, -6.1, -1.5, 3.1, 7.7, 12.3]) {
      box(scene, walnut, x - side * .27, 4.28, z, .12, 6.9, 4.14);
      box(scene, bronze, x - side * .35, 4.3, z + 2.13, .02, 6.75, .028);
    }
    for (const centerZ of [-6.2, 5.9]) for (let i = -6; i <= 6; i++) {
      box(scene, walnutDark, x - side * .35, 4.27, centerZ + i * .27, .055, 5.65, .095);
    }
    box(scene, charcoal, x - side * .31, .72, 1, .15, 1.4, 28.1);
    box(scene, bronze, x - side * .34, 1.41, 1, .025, .025, 28.1);
    for (const z of [-5.9, 1.1, 8.1]) {
      box(scene, bronze, x - side * .42, 3.95, z, .13, 1.26, .2);
      box(scene, warmGlass, x - side * .51, 3.95, z, .035, .86, .115);
      const wash = new THREE.PointLight(0xffd1a2, 1.5, 7, 2);
      wash.position.set(x - side * 1.1, 3.95, z);
      scene.add(wash);
    }
  }

  const skyline = buildLobbySkyline(scene);
  box(scene, walnutDark, 0, .8, -13.35, 22, 1.6, .4);
  box(scene, walnutDark, 0, 8.02, -13.35, 22, .6, .4);
  for (const x of [-10.45, 10.45]) box(scene, walnutDark, x, 4.6, -13.35, 1.1, 6.9, .4);
  box(scene, walnutDark, 0, 1.5, -12.99, 20.1, .35, .24);
  box(scene, bronze, 0, 7.76, -12.96, 20.1, .09, .12);
  for (const x of [-9.8, -4.9, 0, 4.9, 9.8]) box(scene, bronze, x, 4.64, -12.95, .075, 6.3, .13);
  const cityLight = new THREE.PointLight(0x7d9cad, 1.45, 19, 2);
  cityLight.position.set(0, 5.5, -10.9); scene.add(cityLight);

  const hostMap = textureLoader.load("/lobby-assets/fictional-host-seated.png");
  hostMap.colorSpace = THREE.SRGBColorSpace;
  hostMap.anisotropy = 8;
  maps.push(hostMap);
  const host = new THREE.Group();
  host.position.set(-2.2, 0, -2.35);
  const hostPortrait = new THREE.Mesh(
    new THREE.PlaneGeometry(1.42, 2.13),
    new THREE.MeshBasicMaterial({ map: hostMap, transparent: true, alphaTest: .08, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }),
  );
  hostPortrait.position.y = 1.065;
  host.add(hostPortrait);
  scene.add(host);
  const hostShadow = new THREE.Mesh(new THREE.CircleGeometry(.65, 32), new THREE.MeshBasicMaterial({ color: 0x161a1c, transparent: true, opacity: .26, depthWrite: false }));
  hostShadow.rotation.x = -Math.PI / 2;
  hostShadow.scale.set(1, .54, 1);
  hostShadow.position.set(host.position.x, .047, host.position.z);
  scene.add(hostShadow);

  box(scene, walnutDark, 0, 7.12, 10.06, 7.5, .37, .4);
  for (const x of [-3.72, 3.72]) box(scene, bronze, x, 3.55, 10.06, .15, 7.05, .2);
  const leftDoor = box(scene, smokedGlass, -1.57, 3.55, 10.07, 3.14, 6.56, .075);
  const rightDoor = box(scene, smokedGlass, 1.57, 3.55, 10.07, 3.14, 6.56, .075);
  for (const door of [leftDoor, rightDoor]) {
    const edge = new THREE.Mesh(new THREE.BoxGeometry(.045, 6.45, .09), bronze);
    edge.position.set(door === leftDoor ? 1.52 : -1.52, 0, .005);
    door.add(edge);
  }

  const counter = new THREE.Group();
  counter.position.set(0, 0, -8.35);
  counter.scale.y = .7;
  scene.add(counter);
  roundedBox(counter, walnutDark, 0, .88, 0, 7.4, 1.73, 2.2, .16);
  for (let i = -12; i <= 12; i++) roundedBox(counter, walnut, i * .284, .87, 1.12, .16, 1.39, .075, .024);
  roundedBox(counter, marble, 0, 1.79, -.03, 8.05, .18, 2.57, .065);
  roundedBox(counter, bronze, 0, .13, 1.13, 7.08, .14, .05, .02);
  const sign = wallLettering("커피 한 잔", "COFFEE CHAT  /  JAMSIL", "#d1ad80");
  maps.push(sign);
  const lettering = new THREE.Mesh(new THREE.PlaneGeometry(2.9, .58), new THREE.MeshBasicMaterial({ map: sign, transparent: true, toneMapped: false, depthWrite: false }));
  lettering.position.set(0, .63, -7.183);
  scene.add(lettering);

  const steel = new THREE.MeshStandardMaterial({ color: 0x929797, metalness: .8, roughness: .24 });
  const ceramic = new THREE.MeshStandardMaterial({ color: 0xf0e7d8, roughness: .32 });
  const coffee = new THREE.MeshStandardMaterial({ color: 0x41261b, roughness: .42 });
  const displayGlass = new THREE.MeshPhysicalMaterial({ color: 0xe0edf0, transparent: true, opacity: .13, metalness: .08, roughness: .08, depthWrite: false, side: THREE.DoubleSide });
  // Espresso machine, grinder, and cups turn the counter into a working cafe bar.
  roundedBox(counter, steel, -2.28, 2.23, -.45, 1.27, .9, .78, .1);
  roundedBox(counter, charcoal, -2.28, 2.68, -.44, 1.36, .09, .82, .025);
  for (const x of [-2.6, -1.97]) {
    const dial = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, .04, 24), bronze);
    dial.rotation.x = Math.PI / 2; dial.position.set(x, 1.64, -7.86); scene.add(dial);
    box(scene, charcoal, x, 1.38, -7.84, .21, .06, .26);
  }
  box(scene, steel, -.86, 1.57, -8.87, .42, .58, .43);
  const hopper = new THREE.Mesh(new THREE.CylinderGeometry(.18, .14, .32, 20), smokedGlass);
  hopper.position.set(-.86, 1.99, -8.87); scene.add(hopper);
  function cupAt(x: number, y: number, z: number, size = 1) {
    const saucer = new THREE.Mesh(new THREE.CylinderGeometry(.18 * size, .18 * size, .018, 32), ceramic);
    saucer.position.set(x, y, z); scene.add(saucer);
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(.12 * size, .095 * size, .16 * size, 24, 1, true), ceramic);
    cup.position.set(x, y + .09 * size, z); scene.add(cup);
    const surface = new THREE.Mesh(new THREE.CircleGeometry(.113 * size, 24), coffee);
    surface.rotation.x = -Math.PI / 2; surface.position.set(x, y + .17 * size, z); scene.add(surface);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(.052 * size, .017 * size, 8, 16, Math.PI * 1.45), ceramic);
    handle.rotation.y = Math.PI / 2; handle.position.set(x + .13 * size, y + .1 * size, z); scene.add(handle);
  }
  for (const x of [-.1, .25]) cupAt(x, 1.28, -8.33, .8);
  for (const x of [-2.2, 4.2]) {
    cupAt(x - .34, .79, -.06, .86);
    const napkin = new THREE.Mesh(new THREE.BoxGeometry(.2, .014, .2), ceramic);
    napkin.rotation.y = .38; napkin.position.set(x + .38, .79, -.1); scene.add(napkin);
  }

  box(scene, bronze, 2.07, 1.27, -8.52, 2.15, .045, .97);
  box(scene, bronze, 2.07, 1.63, -8.52, 2.15, .035, .97);
  box(scene, displayGlass, 2.07, 1.62, -8.52, 2.14, .69, .97);
  for (const x of [1.05, 2.07, 3.09]) for (const z of [-8.98, -8.06]) box(scene, bronze, x, 1.62, z, .03, .69, .03);

  const menuMap = cafeMenuTexture();
  maps.push(menuMap);
  box(scene, walnutDark, 10.3, 3.68, -3.8, .2, 3.78, 2.78);
  const menu = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 3.5), new THREE.MeshBasicMaterial({ map: menuMap, side: THREE.DoubleSide, toneMapped: false }));
  menu.rotation.y = -Math.PI / 2;
  menu.position.set(10.18, 3.68, -3.8);
  scene.add(menu);
  for (const side of [-1, 1]) {
    const x = side * 10.18;
    for (const y of [2.2, 3.3]) {
      box(scene, walnut, x, y, 3.25, .46, .11, 5.6);
      for (const z of [1.35, 2.2, 3.05, 3.9, 4.75]) {
        const jar = new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, .32, 16), ceramic);
        jar.position.set(x - side * .1, y + .2, z); scene.add(jar);
        const lid = new THREE.Mesh(new THREE.CylinderGeometry(.135, .135, .04, 16), bronze);
        lid.position.set(x - side * .1, y + .38, z); scene.add(lid);
      }
    }
  }

  const pendantShade = new THREE.MeshStandardMaterial({ color: 0xbca17c, metalness: .65, roughness: .38, side: THREE.DoubleSide });
  for (const x of [-2.2, 4.2]) {
    box(scene, bronze, x, 5.87, .05, .026, 1.72, .026);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(.54, .64, .15, 48), pendantShade);
    shade.position.set(x, 5.08, .05); scene.add(shade);
    const diffuser = new THREE.Mesh(new THREE.CircleGeometry(.48, 32), warmGlass);
    diffuser.rotation.x = Math.PI / 2; diffuser.position.set(x, 4.995, .05); scene.add(diffuser);
    const pool = new THREE.PointLight(0xffd4a7, 3.6, 10, 2);
    pool.position.set(x, 4.85, .05); scene.add(pool);
  }

  let disposed = false;
  const modelLoader = new GLTFLoader();
  function placeModel(id: string, placements: [number, number, number, number, number?][]) {
    modelLoader.load(`/lobby-assets/${id}/${id}_1k.gltf`, (gltf) => {
      if (disposed) return;
      const bounds = new THREE.Box3().setFromObject(gltf.scene);
      const offset = new THREE.Vector3((bounds.min.x + bounds.max.x) / 2, bounds.min.y, (bounds.min.z + bounds.max.z) / 2);
      for (const [x, z, rotation, scale, y = .05] of placements) {
        const furniture = gltf.scene.clone(true);
        furniture.position.sub(offset);
        const holder = new THREE.Group();
        holder.position.set(x, y, z);
        holder.rotation.y = rotation;
        holder.scale.setScalar(scale);
        holder.add(furniture);
        scene.add(holder);
      }
    }, undefined, (error) => console.error(`Lobby asset ${id} failed to load`, error));
  }
  placeModel("modern_arm_chair_01", [
    [-2.2, 2.55, Math.PI, 1.48], [-2.2, -2.35, 0, 1.48],
    [4.2, 2.55, Math.PI, 1.48], [4.2, -2.35, 0, 1.48],
  ]);
  placeModel("coffee_table_round_01", [[-2.2, .05, 0, 1.45], [4.2, .05, 0, 1.45]]);
  placeModel("bar_chair_round_01", [[-1.22, -6.18, Math.PI, 1.38], [1.22, -6.18, Math.PI, 1.38]]);
  placeModel("croissant", [[1.62, -8.48, .18, 1.45, 1.31], [2.18, -8.48, -.1, 1.45, 1.31], [2.72, -8.48, .26, 1.45, 1.31], [1.9, -8.52, -.2, 1.4, 1.68], [2.48, -8.52, .1, 1.4, 1.68]]);
  placeModel("standing_chalkboard_01", [[-7.15, -5.7, .1, 1.1]]);
  placeModel("potted_plant_02", [[-8.55, -7.35, 0, 2.2], [8.55, -7.35, 1.8, 2.2]]);

  return {
    animate(time: number, doorProgress = 1, camera?: THREE.Camera) {
      leftDoor.position.x = THREE.MathUtils.lerp(-1.57, -4.7, doorProgress);
      rightDoor.position.x = THREE.MathUtils.lerp(1.57, 4.7, doorProgress);
      hostPortrait.scale.y = 1 + Math.sin(time * 1.35) * .004;
      if (camera) host.rotation.y = Math.atan2(camera.position.x - host.position.x, camera.position.z - host.position.z);
    },
    dispose() { disposed = true; maps.forEach((map) => map.dispose()); skyline.dispose(); },
  };
}
