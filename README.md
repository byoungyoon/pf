# Jamsil coffee chat portfolio

Next.js, Tailwind CSS, and Three.js portfolio with a walkable Seokchon Lake scene and a fictional cafe inside Lotte World Tower. The exterior geography is based on OpenStreetMap data; the cafe and its window skyline are artistic interpretations.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3020](http://localhost:3020). The coffee chat scene is at `/coffee-chat`.

Set `NEXT_PUBLIC_COFFEE_CHAT_URL` to an `https://` or `mailto:` URL to enable the coffee chat contact link. Without it, the invitation remains a preview.

## Checks

```bash
npm run lint
npm run build
```

Asset sources and licenses are documented in [ASSETS.md](ASSETS.md). `scripts/download-lobby-assets.mjs` downloads the Poly Haven cafe models again when needed.
