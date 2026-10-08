import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { terrainHeight } from "./SeoulTerrain";

export type CityBlock={x:number;z:number;width:number;depth:number;height:number;angle:number;detail:boolean;variant:number};
const types=[..."abcdefghijklmn"].map(letter=>`building-${letter}`).concat(["building-skyscraper-a","building-skyscraper-b","building-skyscraper-c","building-skyscraper-d","building-skyscraper-e"]);

// Kenney CC0 silhouettes replace schematic boxes. Real landmark footprints are
// separate: these models describe neighbourhood density, not particular addresses.
export function loadCityAssets(parent:THREE.Group,blocks:CityBlock[],fallback:THREE.InstancedMesh) {
  const group=new THREE.Group();parent.add(group);
  const loader=new GLTFLoader();
  const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();
  let disposed=false;
  const buckets=new Map<string,CityBlock[]>();
  for(const block of blocks) {
    const index=block.variant%types.length;
    const name=block.detail?types[index]:`low-detail-building-${"abcdefghijklmn"[index%14]}`;
    const bucket=buckets.get(name)??[];bucket.push(block);buckets.set(name,bucket);
  }
  const ready=Promise.allSettled([...buckets].map(async([name,instances])=>{
    const gltf=await loader.loadAsync(`/atlas-assets/kenney/${name}.glb`);
    gltf.scene.updateMatrixWorld(true);
    const box=new THREE.Box3().setFromObject(gltf.scene),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
    const parts:THREE.BufferGeometry[]=[];
    let sourceMaterial:THREE.MeshStandardMaterial|undefined;
    gltf.scene.traverse(object=>{
      if(!(object instanceof THREE.Mesh))return;
      const geometry=object.geometry.clone().applyMatrix4(object.matrixWorld);
      geometry.translate(-center.x,-box.min.y,-center.z);geometry.scale(1/(size.x||1),1/(size.y||1),1/(size.z||1));parts.push(geometry);
      object.geometry.dispose();
      const originals=Array.isArray(object.material)?object.material:[object.material];
      originals.forEach(material=>{
        if(material instanceof THREE.MeshStandardMaterial){sourceMaterial??=material;for(const texture of [material.map,material.normalMap,material.metalnessMap,material.roughnessMap])if(texture)textures.add(texture);}
        materials.add(material);
      });
    });
    const geometry=mergeGeometries(parts,false);parts.forEach(part=>part.dispose());
    if(!geometry)return;
    geometries.add(geometry);
    const material=sourceMaterial?.clone()??new THREE.MeshStandardMaterial();
    material.color.setHex(0x789ba0);material.roughness=.75;material.metalness=.2;material.emissive.setHex(0x081b23);material.emissiveIntensity=.2;materials.add(material);
    const mesh=new THREE.InstancedMesh(geometry,material,instances.length),dummy=new THREE.Object3D();
    instances.forEach((block,i)=>{
      dummy.position.set(block.x,terrainHeight(block.x,block.z),block.z);dummy.scale.set(block.width,block.height,block.depth);dummy.rotation.y=block.angle;dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
      mesh.setColorAt(i,new THREE.Color().setHSL(.51,.08,.55+Math.sin(block.x*3+block.z)*.08));
    });
    mesh.computeBoundingSphere();
    if(disposed){mesh.dispose();geometry.dispose();material.dispose();return;}
    group.add(mesh);
  })).then(results=>{
    if(disposed){textures.forEach(texture=>texture.dispose());materials.forEach(material=>material.dispose());return;}
    // Hide only the successfully replaced block instances. Failed local models
    // retain their fallback rather than leaving holes in the city.
    const failed=new Set([...buckets.keys()].filter((_,i)=>results[i].status==="rejected"));
    const dummy=new THREE.Object3D();
    blocks.forEach((block,i)=>{
      const index=block.variant%types.length,name=block.detail?types[index]:`low-detail-building-${"abcdefghijklmn"[index%14]}`;
      if(!failed.has(name)){dummy.scale.setScalar(0);dummy.updateMatrix();fallback.setMatrixAt(i,dummy.matrix);}
    });
    fallback.instanceMatrix.needsUpdate=true;
    fallback.visible=failed.size>0;
    return {loaded:results.filter(r=>r.status==="fulfilled").length,failed:failed.size};
  });
  return {ready,dispose(){disposed=true;group.traverse(object=>{if(object instanceof THREE.InstancedMesh)object.dispose();});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());parent.remove(group);}};
}
