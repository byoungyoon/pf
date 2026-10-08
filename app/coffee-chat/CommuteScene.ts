import * as THREE from "three";

// An original illustrated carriage, authored in metres. No real service, route,
// passenger or employer is represented by the opening scene.
export function buildCommuteScene() {
  const group = new THREE.Group();
  group.scale.setScalar(.01);
  const materials: THREE.Material[] = [];
  const paint = (color: number, metalness = .05, roughness = .7) => {
    const material = new THREE.MeshStandardMaterial({ color, metalness, roughness, transparent: true });
    materials.push(material); return material;
  };
  const shell = paint(0xb8c5c2), trim = paint(0x6e8989, .65, .3);
  const floor = paint(0x334b51), seat = paint(0x738f87), cream = paint(0xe3e0d1);
  const clothes = [paint(0x485e68), paint(0x817e74), paint(0x637975), paint(0x4c5a63)];
  const skin = paint(0xab9788), hair = paint(0x273a40), bag = paint(0x34474c);
  function box(x:number,y:number,z:number,w:number,h:number,d:number,material:THREE.Material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
    mesh.position.set(x,y,z); group.add(mesh); return mesh;
  }
  function cylinder(x:number,y:number,z:number,r:number,height:number,material:THREE.Material) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r,r,height,16),material);
    mesh.position.set(x,y,z); group.add(mesh); return mesh;
  }
  box(0,-.08,0,3.2,.16,19.5,floor);
  box(0,3.05,0,3.2,.12,19.5,cream);
  // The window-facing wall is built around actual openings; the camera can
  // withdraw through the open opposite side without crossing a solid wall.
  box(-1.57,.48,0,.09,.96,19.5,shell);
  box(-1.57,2.74,0,.09,.62,19.5,shell);
  for (let z=-8.5;z<=8.5;z+=3.4) {
    box(-1.57,1.72,z,.09,1.48,.65,shell);
    box(-1.51,1.06,z+1.68,.08,.045,2.74,trim);
    box(-1.51,2.4,z+1.68,.08,.045,2.74,trim);
    box(-1.51,1.73,z+.32,.08,1.38,.045,trim);
    box(-1.51,1.73,z+3.05,.08,1.38,.045,trim);
  }
  for (const z of [-9.5,9.5]) box(0,1.5,z,3.2,3,.12,shell);
  box(-1.04,.52,0,.94,.18,18.4,seat);
  box(-1.38,.97,0,.15,.9,18.4,seat);
  for(let z=-8;z<=8;z+=.7) box(-1.03,.618,z,.88,.025,.025,trim);
  for(const z of [-5,1.9,7]) cylinder(.22,1.48,z,.035,2.96,trim);
  const rail = cylinder(.15,2.77,0,.024,18,trim); rail.rotation.x=Math.PI/2;
  for(let z=-8;z<9;z+=1.1) {
    cylinder(.15,2.56,z,.018,.42,cream);
    const handle=new THREE.Mesh(new THREE.TorusGeometry(.105,.02,8,24),cream);
    handle.position.set(.15,2.28,z);handle.rotation.y=Math.PI/2;group.add(handle);
  }
  const light = new THREE.MeshStandardMaterial({ color:0xe3ebda,emissive:0xe3ebda,emissiveIntensity:.7,transparent:true });materials.push(light);
  box(.55,2.97,0,.24,.03,18.5,light);
  box(-.55,2.97,0,.24,.03,18.5,light);
  // Quiet, anonymous silhouettes leave the window and the city as the subject.
  function passenger(x:number,z:number,color:number,seated=false) {
    const body=new THREE.Mesh(new THREE.CapsuleGeometry(.19,seated?.36:.58,6,12),clothes[color]);
    body.position.set(x,seated?1.02:1.1,z);group.add(body);
    const head=new THREE.Mesh(new THREE.SphereGeometry(.14,16,12),skin);head.scale.set(1,1.16,.93);head.position.set(x,seated?1.45:1.66,z);group.add(head);
    const cap=new THREE.Mesh(new THREE.SphereGeometry(.145,16,12,0,Math.PI*2,0,Math.PI*.52),hair);cap.position.copy(head.position).add(new THREE.Vector3(0,.045,0));group.add(cap);
    if(seated) {
      box(x+.24,.63,z,.55,.17,.33,clothes[color]);
      for(const dz of [-.09,.09]) cylinder(x+.46,.31,z+dz,.065,.58,clothes[color]);
    } else {
      for(const dz of [-.09,.09]) cylinder(x,.37,z+dz,.06,.7,clothes[color]);
      box(x+.21,1.14,z,.16,.42,.3,bag);
      const arm=cylinder(x-.23,1.63,z,.045,.68,clothes[color]);arm.rotation.z=-.24;
    }
  }
  passenger(-.94,-3.4,0,true);passenger(-.94,3.3,1,true);
  passenger(.12,-1.7,2);passenger(.35,4.9,3);passenger(-.22,-6.2,1);
  const morning = new THREE.PointLight(0xffe8c5, .0003, .12, 2); morning.position.set(-1,2.3,0);group.add(morning);
  return {
    group,
    update(progress:number,time:number,reducedMotion:boolean) {
      const opacity=1-THREE.MathUtils.smoothstep(progress,.1,.27);
      group.visible=opacity>.001;
      materials.forEach(material=>{material.opacity=opacity;material.depthWrite=opacity>.97;});
      group.rotation.x=reducedMotion?0:Math.sin(time*1.5)*.0015*opacity;
      group.rotation.z=reducedMotion?0:Math.sin(time*.9)*.001*opacity;
    },
  };
}
