import * as THREE from "three";

function facadeTexture(base: string, lit: string, seed: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 768;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  let state = seed;
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  for (let x = 0; x < 12; x++) {
    const px = x * 32;
    ctx.fillStyle = x % 4 === 0 ? "#536273" : "#263542";
    ctx.fillRect(px, 0, 3, 768);
    for (let y = 0; y < 32; y++) {
      const py = y * 24 + 4;
      ctx.fillStyle = random() > .91 ? lit : random() > .74 ? "#34495d" : "#172331";
      ctx.fillRect(px + 7, py, 19, 14);
      ctx.fillStyle = "rgba(183,206,224,.09)";
      ctx.fillRect(px + 7, py, 2, 14);
    }
  }
  for (let y = 0; y < 32; y++) {
    ctx.fillStyle = "rgba(10,19,29,.3)";
    ctx.fillRect(0, y * 24 + 20, 384, 3);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

export function buildLobbySkyline(scene: THREE.Scene) {
  const group = new THREE.Group();
  scene.add(group);

  const sky = new THREE.Mesh(
    new THREE.PlaneGeometry(220, 100),
    new THREE.ShaderMaterial({
      depthWrite: false,
      fog: false,
      uniforms: { topColor: { value: new THREE.Color("#091a32") }, horizonColor: { value: new THREE.Color("#8f5367") }, lowColor: { value: new THREE.Color("#283c55") } },
      vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: "varying vec2 vUv; uniform vec3 topColor; uniform vec3 horizonColor; uniform vec3 lowColor; void main() { float t = smoothstep(.35, .85, vUv.y); vec3 color = mix(horizonColor, topColor, t); color = mix(lowColor, color, smoothstep(.26, .47, vUv.y)); gl_FragColor = vec4(color, 1.0); }",
    }),
  );
  sky.position.set(0, 9, -118);
  group.add(sky);

  const facadeMaps = [
    facadeTexture("#283849", "#bbaa94", 361),
    facadeTexture("#354352", "#d9b895", 712),
    facadeTexture("#253b49", "#9fb3c5", 192),
    facadeTexture("#414550", "#e3c5a6", 508),
  ];
  const facades = facadeMaps.map((map) => new THREE.MeshBasicMaterial({ map, toneMapped: false, fog: true }));
  const roofs = ["#27313a", "#313b43", "#36434d", "#252f3a"].map((color) => new THREE.MeshStandardMaterial({ color, roughness: .78 }));
  const glass = new THREE.MeshBasicMaterial({ color: 0xbad2dc, transparent: true, opacity: .17, depthWrite: false, side: THREE.DoubleSide });
  const bronze = new THREE.MeshStandardMaterial({ color: 0x8f806e, metalness: .68, roughness: .4 });

  // Distances and silhouettes vary so the skyline shifts as the viewer walks across the lounge.
  const buildings = [
    [-53, -89, 13, 9, 10], [-38, -79, 13, 12, 12], [-25, -88, 11, 10, 9], [-14, -74, 10, 9, 9],
    [-4, -92, 14, 13, 12], [11, -81, 13, 10, 12], [26, -91, 14, 11, 11], [42, -77, 12, 9, 11], [58, -96, 13, 9, 12],
    [-43, -56, 8, 6, 8], [-31, -58, 7, 8, 8], [-22, -52, 7, 5.5, 7], [-11, -59, 8, 7, 9],
    [0, -61, 9, 6, 8], [12, -55, 9, 8, 9], [23, -62, 8, 6, 8], [34, -54, 8, 7, 8], [46, -60, 10, 5, 8],
    [-33, -35, 5, 4.5, 7], [-24, -38, 5, 6, 7], [-17, -33, 4, 5, 6],
    [18, -37, 5, 5.5, 7], [27, -33, 6, 5, 7], [35, -40, 6, 6, 8],
  ] as const;
  buildings.forEach(([x, z, width, height, depth], i) => {
    const baseY = -2.3;
    const index = i % facades.length;
    const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), [facades[index], facades[index], roofs[index], roofs[index], facades[index], facades[index]]);
    body.position.set(x, baseY + height / 2, z);
    group.add(body);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(width + .5, .28, depth + .5), roofs[index]);
    roof.position.set(x, baseY + height + .1, z);
    group.add(roof);
    if (i % 4 === 1) {
      const crown = new THREE.Mesh(new THREE.BoxGeometry(width * .57, 1.7, depth * .42), roofs[index]);
      crown.position.set(x, baseY + height + 1.05, z);
      group.add(crown);
    }
    if (i % 7 === 0) {
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(.045, .06, 2.5, 8), bronze);
      mast.position.set(x + width * .2, baseY + height + 1.4, z);
      group.add(mast);
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(.12, 8, 8), new THREE.MeshBasicMaterial({ color: 0xe38d83, toneMapped: false }));
      beacon.position.set(x + width * .2, baseY + height + 2.75, z);
      group.add(beacon);
    }
  });

  // Neighbouring towers sit close to the glass. Their side faces reveal depth in motion.
  for (const side of [-1, 1]) {
    const x = side * 20.5;
    const near = new THREE.Mesh(new THREE.BoxGeometry(8, 7, 10), [facades[side < 0 ? 1 : 2], facades[side < 0 ? 1 : 2], roofs[1], roofs[1], facades[side < 0 ? 1 : 2], facades[side < 0 ? 1 : 2]]);
    near.position.set(x, 2.2, -26);
    group.add(near);
    const railing = new THREE.Mesh(new THREE.BoxGeometry(8.4, .12, .11), bronze);
    railing.position.set(x, 5.8, -20.9);
    group.add(railing);
  }

  const podium = new THREE.Mesh(new THREE.BoxGeometry(75, 1.8, 28), roofs[0]);
  podium.position.set(0, -.95, -31);
  group.add(podium);
  const reflectedGlass = new THREE.Mesh(new THREE.PlaneGeometry(19.65, 6.15), glass);
  reflectedGlass.position.set(0, 4.68, -13.015);
  group.add(reflectedGlass);

  return {
    dispose() {
      scene.remove(group);
      facadeMaps.forEach((map) => map.dispose());
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((material) => material.dispose());
        }
      });
    },
  };
}
