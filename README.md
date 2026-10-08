# Seoul coffee chat portfolio

Next.js, Tailwind CSS and Three.js portfolio. `/coffee-chat` starts inside a moving subway, pulls back to Seoul, then reveals a central glass conversation panel. The story connects an everyday commute with a wider, positive view of working together. Real elevation, river banks, roads and central building footprints support the city; local CC0 building models add variety outside detailed areas.

The conversation contains authored portfolio notes, not AI-generated replies. Visitors can ask about work, collaboration and coffee chat. “서울 둘러보기” opens the six-place atlas and preserves the conversation when returning. Replay, skip and reduced-motion support are included.

The final city sits below the headline, keeps a gentle automatic rotation and blends into a blue/violet sky. The circular plinth fades for conversation and returns during exploration. Camera composition settles throughout the pullback rather than jumping on arrival.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3020/coffee-chat](http://localhost:3020/coffee-chat). `/` remains the portfolio landing page.

Set `NEXT_PUBLIC_COFFEE_CHAT_URL` to an `https://` or `mailto:` URL to enable contact. Without it, the conversation says the contact link is being prepared. A mail link receives “포트폴리오 커피챗” as its subject when no subject is already configured.

## Checks

```bash
npm run lint
npx tsc --noEmit
npm run build -- --webpack
```

Geographic sources, reproduction steps and the model's accuracy limits are documented in [ASSETS.md](ASSETS.md). All runtime geography is local; no satellite images, map API credentials or external tile requests are required.

## Vercel

The live portfolio is [pf-xi-three.vercel.app](https://pf-xi-three.vercel.app), with the [coffee chat experience](https://pf-xi-three.vercel.app/coffee-chat). The GitHub repository `byoungyoon/pf` is connected to the Vercel project [pf](https://vercel.com/byoungyoons-projects/pf) under `byoungyoons-projects`. Pushes to `main` deploy to production. `vercel.json` selects Next.js and the verified `npm run build -- --webpack` build command. Local `.vercel` metadata and environment files are ignored by Git.
