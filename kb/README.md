# Agent memory — portfolio

Read this first; use `LOG.md` for history. Source code and `ASSETS.md` remain authoritative. Keep this file short; append work to `LOG.md` after meaningful changes.

## Current state

- Stack: Next.js 16 App Router, React 19, Tailwind CSS 4, Three.js. `npm run dev` serves port 3020. Read installed Next docs before coding.
- `/` is the portfolio landing page. `/coffee-chat` opens in a moving subway, pulls back to Seoul and reveals a central glass chat. It presents the owner's wider, positive view of collaboration. The former walking scene/cafe/pointer lock and their tracked assets are removed. Preserve ignored experiments.
- `SeoulAtlas.ts`: terrain/city meshes, OrbitControls, projected pins with collision hiding, selection focus and subtle bloom. `SeoulTerrain.ts`: approximately 100 m sampled DEM, common 2× vertical exaggeration. `SeoulGeography.ts`: real water polygons/island holes, open spaces, actual central footprints and detail-area exclusions. Water and buildings are merged where practical; filler blocks outside detail extracts are schematic.
- `PortfolioCity.tsx` owns the 11.4 s narrative phases, replay/skip and exploration toggle. `CommuteScene.ts` creates the interior; `MetroJourney.ts` moves eight authored cars on the actual OSM Dangsan bridge alignment. The transparent canvas reveals a layered CSS sky; sky/projection offset fade during pullback to avoid arrival jumps. Reduced motion skips the intro and makes map focus immediate. Chat disables manual orbit but keeps a gentle automatic rotation (disabled for reduced motion); exploration preserves chat history. Footer credits OSM, KOSTAT/Seoul Maps and USGS/Mapzen.
- `CityAssets.ts` instances 33 local Kenney Commercial 2.1 CC0 models outside actual footprint extracts; include the external `Textures/colormap.png`. Heights/footprints remain schematic there. `PortfolioConversation.tsx` contains authored keyword-based notes, not an AI API or messages from the owner; Enter sends, Shift+Enter inserts a line, and composing IME input does not send.
- Chat composition: city below a larger philosophy headline, blue/violet CSS sky, readable glass composer; circular plinth/rings fade with projection offset and return in exploration. Reference links are in `ASSETS.md`. Preserve continuous pullback/arrival and reduced-motion support when adjusting the final camera.
- All geography is local in `public/data/seoul*.json`; satellite imagery was reference-only. Sources, historical district date (2013), height estimates and regeneration scripts are documented in `ASSETS.md`.
- Coffee contact: `NEXT_PUBLIC_COFFEE_CHAT_URL` must be `https://` or `mailto:`. Without it, the conversation clearly says the link is being prepared; do not invent a contact address. Mail subject defaults to “포트폴리오 커피챗” if missing.
- Repository: `main` tracks `git@github.com:byoungyoon/pf.git`. Do not push unless current authorization covers it.
- Hosting: Vercel project `pf` in `byoungyoons-projects`, connected to `byoungyoon/pf`; production branch `main`, public URL `https://pf-xi-three.vercel.app`. Existing Vercel `portfolio` belongs to a different repo and must not be repointed. `vercel.json` and project settings use Next.js + verified Webpack build; `.vercel` and `.env*` remain ignored. User authorized connecting/publishing this project on 2026-10-08.

## Checks

`npm run lint`; `npx tsc --noEmit`; `npm run build -- --webpack` (no config consumes `NEXT_BUILD_DIR`). Use the running server at **localhost:3020**, not 127.0.0.1 (Next dev origin protection). Run browser checks before production build or on a separate production server; shared `.next` output can conflict. Inspect desktop/mobile intro, train movement, city/chat composition, authored replies/contact, Enter/IME, replay/skip, exploration/history, six places/reset/boundaries, reduced motion, overflow and asset request errors.
