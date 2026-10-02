import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.join(process.cwd(), "public", "lobby-assets");
const models = ["modern_arm_chair_01", "coffee_table_round_01", "potted_plant_02", "bar_chair_round_01", "croissant", "standing_chalkboard_01"];

async function save(url, destination) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, Buffer.from(await response.arrayBuffer()));
  console.log(destination);
}

for (const id of models) {
  const response = await fetch(`https://api.polyhaven.com/files/${id}`);
  if (!response.ok) throw new Error(`${response.status} ${id}`);
  const manifest = await response.json();
  const model = manifest.gltf["1k"].gltf;
  const directory = path.join(root, id);
  await Promise.all([
    save(model.url, path.join(directory, `${id}_1k.gltf`)),
    ...Object.entries(model.include).map(([filename, file]) => save(file.url, path.join(directory, filename))),
  ]);
}

for (const filename of ["marble_01_diff_2k.jpg", "marble_01_nor_gl_2k.jpg", "marble_01_rough_2k.jpg"]) {
  await save(`https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/marble_01/${filename}`, path.join(root, filename));
}
