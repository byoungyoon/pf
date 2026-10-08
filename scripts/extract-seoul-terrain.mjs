import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

// Downloads public Terrarium DEM tiles; runtime uses only the compact sampled height field.
// The open elevation sources, decode formula, and modification notes are in ASSETS.md.
const cache = process.argv[2] ?? '/private/tmp/seoul-terrain-tiles';
await fs.mkdir(cache, { recursive: true });
const origin = { lon: 126.978, lat: 37.5665 };
const zoom = 11, n = 2 ** zoom;
const mercator = (lon, lat) => [(lon + 180) / 360 * n, (1 - Math.asinh(Math.tan(lat * Math.PI / 180)) / Math.PI) / 2 * n];
const min = mercator(126.73, 37.72), max = mercator(127.23, 37.40);
const tiles = new Map();
const jobs = [];
for (let x = Math.floor(min[0]); x <= Math.floor(max[0]); x++) for (let y = Math.floor(min[1]); y <= Math.floor(max[1]); y++) jobs.push([x, y]);
// Small batches avoid flooding the public tile service.
for (let i = 0; i < jobs.length; i += 4) {
  await Promise.all(jobs.slice(i, i + 4).map(async ([x, y]) => {
    const file = path.join(cache, `${zoom}-${x}-${y}.png`);
    let png;
    try { png = await fs.readFile(file); } catch {
      const url = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${zoom}/${x}/${y}.png`;
      const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`DEM ${x}/${y}: ${response.status}`);
      png = Buffer.from(await response.arrayBuffer()); await fs.writeFile(file, png);
    }
    const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    tiles.set(`${x},${y}`, { data, info });
  }));
}
function elevation(lon, lat) {
  const [tx, ty] = mercator(lon, lat), px = tx * 256 - .5, py = ty * 256 - .5;
  const x0 = Math.floor(px), y0 = Math.floor(py), u = px - x0, v = py - y0;
  function sample(x, y) {
    const tile = tiles.get(`${Math.floor(x / 256)},${Math.floor(y / 256)}`);
    if (!tile) throw Error(`Missing tile at pixel ${x}/${y}`);
    const i = ((y % 256) * tile.info.width + x % 256) * tile.info.channels;
    return tile.data[i] * 256 + tile.data[i + 1] + tile.data[i + 2] / 256 - 32768;
  }
  return (sample(x0,y0)*(1-u)+sample(x0+1,y0)*u)*(1-v)+(sample(x0,y0+1)*(1-u)+sample(x0+1,y0+1)*u)*v;
}
const bounds = { minX: -215, maxX: 215, minZ: -170, maxZ: 170 };
const columns = 431, rows = 341, heights = [];
for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
  const x = bounds.minX + col / (columns - 1) * (bounds.maxX - bounds.minX);
  const z = bounds.minZ + row / (rows - 1) * (bounds.maxZ - bounds.minZ);
  const lon = origin.lon + x / (1113.2 * Math.cos(origin.lat * Math.PI / 180)), lat = origin.lat - z / 1113.2;
  heights.push(Math.round(Math.max(0, elevation(lon, lat))));
}
await fs.writeFile('public/data/seoul-terrain.json', JSON.stringify({ source: 'Mapzen Terrain Tiles / USGS SRTM & GMTED2010', accessed: '2026-10-08', zoom, origin, bounds, columns, rows, heights }));
console.log(JSON.stringify({ tiles: jobs.length, samples: heights.length, min: heights.reduce((a,b)=>Math.min(a,b),Infinity), max: heights.reduce((a,b)=>Math.max(a,b),-Infinity) }));
