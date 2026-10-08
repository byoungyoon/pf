import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import railway from "../../public/data/seoul-commute.json";

// The track follows the OSM Dangsan railway bridge. The train is an original,
// simplified illustration, not a replica of a particular rolling-stock series.
export function buildMetroJourney(project:(lon:number,lat:number)=>THREE.Vector3) {
  const points=railway.points.map(([lon,lat])=>project(lon,lat).setY(1.3));
  const route=new THREE.CatmullRomCurve3(points,false,"centripetal"),length=route.getLength();
  const group=new THREE.Group(),train=new THREE.Group();group.add(train);
  const trackMaterial=new THREE.MeshStandardMaterial({color:0x6d8588,metalness:.6,roughness:.6});
  const deckMaterial=new THREE.MeshStandardMaterial({color:0x34505a,roughness:.85});
  const samples=route.getSpacedPoints(100);
  for(const side of [-.007175,.007175,.034825,.049175]) {
    const rail=samples.map((p,i)=>{const t=route.getTangentAt(i/100);return p.clone().add(new THREE.Vector3(t.z,0,-t.x).multiplyScalar(side)).add(new THREE.Vector3(0,.008,0));});
    group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rail),100,.002,6,false),trackMaterial));
  }
  const deck=new THREE.InstancedMesh(new THREE.BoxGeometry(.15,.024,1),deckMaterial,100),dummy=new THREE.Object3D();
  for(let i=0;i<100;i++) {
    const a=samples[i],b=samples[i+1];dummy.position.copy(a).add(b).multiplyScalar(.5).add(new THREE.Vector3(0,-.02,0));dummy.rotation.y=Math.atan2(b.x-a.x,b.z-a.z);dummy.scale.set(1,1,a.distanceTo(b)*1.02);dummy.updateMatrix();deck.setMatrixAt(i,dummy.matrix);
  }
  deck.computeBoundingSphere();group.add(deck);
  const piers=new THREE.InstancedMesh(new THREE.CylinderGeometry(.009,.012,.6,8),deckMaterial,12);
  for(let i=0;i<12;i++){dummy.position.copy(route.getPointAt((i+.5)/12)).setY(1);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();piers.setMatrixAt(i,dummy.matrix);}piers.computeBoundingSphere();group.add(piers);
  const paints=[new THREE.MeshStandardMaterial({color:0xa6c0c5,metalness:.4,roughness:.5,transparent:true}),new THREE.MeshStandardMaterial({color:0x173b4b,metalness:.45,roughness:.22,transparent:true}),new THREE.MeshStandardMaterial({color:0x4d9388,metalness:.4,roughness:.4,transparent:true}),new THREE.MeshStandardMaterial({color:0x24333b,roughness:.8,transparent:true})];
  const parts:THREE.BufferGeometry[][]=[[],[],[],[]];
  function box(x:number,y:number,z:number,w:number,h:number,d:number,color:number){const geometry=new THREE.BoxGeometry(w,h,d);geometry.translate(x,y,z);parts[color].push(geometry);}
  box(0,1.65,0,3.14,2.7,19.2,0);box(0,.3,0,2.8,.3,18.4,3);
  for(const side of [-1,1]) {
    box(side*1.578,.95,0,.016,.22,19.25,2);
    for(let z=-8.3;z<9;z+=2.08)box(side*1.582,2.08,z,.018,1.02,1.58,1);
    for(const z of [-4.15,4.15]) {box(side*1.586,1.64,z,.025,2.45,1.5,0);box(side*1.601,2.12,z,.015,.84,1.26,1);}
    for(const z of [-6.8,6.8]) {const geometry=new THREE.CylinderGeometry(.33,.33,.16,12);geometry.rotateZ(Math.PI/2);geometry.translate(side*.718,.27,z);parts[3].push(geometry);}
  }
  for(const z of [-9.61,9.61])box(0,2.13,z,2.25,.85,.025,1);
  const roof=new THREE.CylinderGeometry(.3,.3,19.2,16,1,false,Math.PI/2,Math.PI);roof.rotateX(Math.PI/2);roof.scale(5.2,1,1);roof.translate(0,3,0);parts[0].push(roof);
  const geometries=parts.map(part=>{const merged=mergeGeometries(part,false)!;part.forEach(p=>p.dispose());return merged;});
  const cars=Array.from({length:8},()=>{const car=new THREE.Group();car.scale.setScalar(.01);geometries.forEach((geometry,i)=>car.add(new THREE.Mesh(geometry,paints[i])));train.add(car);return car;});
  const position=new THREE.Vector3();let heading=0;
  return {group,position,get heading(){return heading;},update(progress:number,time:number,reducedMotion:boolean){
    const u=.3+(reducedMotion?0:(time*.012)% .48);
    const opacity=THREE.MathUtils.smoothstep(progress,.06,.18);
    train.visible=opacity>.001;paints.forEach(p=>{p.opacity=opacity;p.depthWrite=opacity>.98;});
    cars.forEach((car,i)=>{const t=THREE.MathUtils.clamp(u-i*.2/length,0,1),point=route.getPointAt(t),tangent=route.getTangentAt(t);car.position.copy(point).add(new THREE.Vector3(0,.012,0));car.rotation.y=Math.atan2(tangent.x,tangent.z);});
    position.copy(cars[0].position);heading=cars[0].rotation.y;
  }};
}
