"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { buildJamsilScene, canWalkStep, getGroundHeight } from "./JamsilScene";
import { buildTowerLobby, COFFEE_STOP } from "./TowerLobby";
import styles from "./coffee-chat.module.css";

type Phase = "entry" | "cinematic" | "lobby" | "city";

const COFFEE_INVITE = {
  code: "01",
  name: "커피챗",
  location: "COFFEE CHAT",
  title: "어서 오세요.\n커피 한 잔?",
  description: "함께 만들고 싶은 제품이나 나누고 싶은 이야기가 있다면 편하게 연락 주세요. 잠실에서 시작한 이야기를 대화로 이어가고 싶습니다.",
};

const coffeeChatHref = process.env.NEXT_PUBLIC_COFFEE_CHAT_URL?.trim();
const hasCoffeeChatLink = !!coffeeChatHref && /^(https:\/\/|mailto:)/i.test(coffeeChatHref);

function TouchButton({ label, direction, children, onDirection }: {
  label: string; direction: string; children: React.ReactNode;
  onDirection: (direction: string, pressed: boolean) => void;
}) {
  return (
    <button type="button" aria-label={label}
      onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); onDirection(direction, true); }}
      onPointerUp={() => onDirection(direction, false)}
      onPointerCancel={() => onDirection(direction, false)}>{children}</button>
  );
}

function requestLookLock(canvas?: HTMLCanvasElement | null) {
  const request = canvas?.requestPointerLock?.();
  if (request && typeof request.catch === "function") request.catch(() => {});
}

function canWalkLobby(x: number, z: number) {
  if (x < -8.35 || x > 8.35 || z < -10.65 || z > 11.7) return false;
  if (Math.abs(x) < 4.2 && z > -9.75 && z < -6.85) return false;
  for (const cx of [-2.2, 4.2]) if (Math.abs(x - cx) < 1.55 && z > -3.25 && z < 3.55) return false;
  for (const cx of [-1.22, 1.22]) if (Math.hypot(x - cx, z + 6.18) < .43) return false;
  return true;
}

export default function PortfolioCity() {
  const mountRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<Set<string>>(new Set());
  const startedRef = useRef(false);
  const phaseRef = useRef<Phase>("entry");
  const skipArrivalRef = useRef(false);
  const openPlaceRef = useRef<number | null>(null);
  const nearPlaceRef = useRef<number | null>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const [sceneError, setSceneError] = useState(false);
  const [started, setStarted] = useState(false);
  const [phase, setPhase] = useState<Phase>("entry");
  const [cinematicMoment, setCinematicMoment] = useState("lake");
  const [locked, setLocked] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const [nearPlace, setNearPlace] = useState<number | null>(null);
  const [activePlace, setActivePlace] = useState<number | null>(null);

  const setTouchDirection = useCallback((direction: string, pressed: boolean) => {
    if (pressed) controlsRef.current.add(direction);
    else controlsRef.current.delete(direction);
  }, []);

  const changePhase = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const enterCity = useCallback(() => {
    if (!sceneReady) return;
    startedRef.current = true;
    skipArrivalRef.current = false;
    setStarted(true);
    changePhase("cinematic");
    mountRef.current?.querySelector("canvas")?.focus();
  }, [changePhase, sceneReady]);

  const returnToLake = useCallback(() => {
    controlsRef.current.clear();
    nearPlaceRef.current = null;
    setNearPlace(null);
    changePhase("city");
  }, [changePhase]);

  const openStation = useCallback(() => {
    openPlaceRef.current = 0;
    setActivePlace(0);
    controlsRef.current.clear();
    if (document.pointerLockElement) document.exitPointerLock();
  }, []);

  const enterLobby = useCallback(() => {
    controlsRef.current.clear();
    changePhase("lobby");
    openStation();
  }, [changePhase, openStation]);

  const closeStation = useCallback(() => {
    openPlaceRef.current = null;
    setActivePlace(null);
    if (!window.matchMedia("(pointer: coarse)").matches) requestLookLock(mountRef.current?.querySelector("canvas"));
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const controls = controlsRef.current;
    setIsTouch(window.matchMedia("(pointer: coarse)").matches);

    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" }); }
    catch (error) { console.error(error); queueMicrotask(() => setSceneError(true)); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.17;
    renderer.domElement.tabIndex = 0;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const lobbyScene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(76, 1, 0.1, 450);
    camera.rotation.order = "YXZ";
    camera.position.set(55, getGroundHeight(55, 60) + 1.7, 60);
    const world = buildJamsilScene(scene, renderer, () => setSceneReady(true), () => setSceneError(true));
    const lobby = buildTowerLobby(lobbyScene);

    const resize = () => { const width = mount.clientWidth; const height = mount.clientHeight; camera.aspect = width / height; camera.fov = phaseRef.current === "lobby" ? (width < 640 ? 82 : 68) : (width < 640 ? 90 : 76); camera.updateProjectionMatrix(); renderer.setSize(width, height); };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    let yaw = -1.12;
    let pitch = -.08;
    let dragLooking = false;
    let lastX = 0;
    let lastY = 0;
    let frame = 0;
    let previous = performance.now();
    let previousUi = 0;
    let entryStartedAt: number | null = null;
    let shownMoment = "lake";
    let previousMode: Phase = "entry";
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMouseMove = (event: MouseEvent) => {
      if (document.pointerLockElement !== renderer.domElement || openPlaceRef.current !== null) return;
      yaw -= event.movementX * 0.0022;
      pitch = THREE.MathUtils.clamp(pitch - event.movementY * 0.0022, -1.15, 1.15);
    };
    const onCanvasDown = (event: PointerEvent) => {
      if (!startedRef.current || phaseRef.current === "cinematic" || openPlaceRef.current !== null) return;
      renderer.domElement.focus();
      dragLooking = true;
      lastX = event.clientX; lastY = event.clientY;
      if (event.pointerType !== "touch" && !document.pointerLockElement) requestLookLock(renderer.domElement);
    };
    const onCanvasMove = (event: PointerEvent) => {
      if (!dragLooking || document.pointerLockElement || openPlaceRef.current !== null) return;
      yaw -= (event.clientX - lastX) * 0.005;
      pitch = THREE.MathUtils.clamp(pitch - (event.clientY - lastY) * 0.005, -1.15, 1.15);
      lastX = event.clientX; lastY = event.clientY;
    };
    const onCanvasUp = () => { dragLooking = false; };
    const onKeyDown = (event: KeyboardEvent) => {
      const code = event.code;
      if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "ShiftLeft", "ShiftRight", "KeyE", "Escape"].includes(code)) event.preventDefault();
      controls.add(code);
      if (code === "Escape" && phaseRef.current === "cinematic") skipArrivalRef.current = true;
      if (code === "KeyE" && startedRef.current && openPlaceRef.current === null && nearPlaceRef.current !== null) openStation();
      if (code === "Escape" && openPlaceRef.current !== null) closeStation();
    };
    const onKeyUp = (event: KeyboardEvent) => controls.delete(event.code);
    const onBlur = () => controls.clear();
    const onLockChange = () => setLocked(document.pointerLockElement === renderer.domElement);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("pointerlockchange", onLockChange);
    renderer.domElement.addEventListener("pointerdown", onCanvasDown);
    renderer.domElement.addEventListener("pointermove", onCanvasMove);
    renderer.domElement.addEventListener("pointerup", onCanvasUp);
    renderer.domElement.addEventListener("pointercancel", onCanvasUp);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);

    const tick = (now: number) => {
      const delta = Math.min((now - previous) / 1000, 0.25);
      previous = now;
      const time = now / 1000;
      let mode = phaseRef.current;
      if (mode === "cinematic") {
        if (entryStartedAt === null) entryStartedAt = now;
        const elapsed = now - entryStartedAt;
        if (reducedMotion.matches || skipArrivalRef.current || elapsed >= 10800) {
          camera.position.set(0, 1.7, 7);
          yaw = 0; pitch = -.12;
          mode = "lobby";
          changePhase("lobby");
          openStation();
        } else if (elapsed < 4300) {
          const progress = THREE.MathUtils.smoothstep(elapsed, 0, 3500);
          camera.position.set(55 - progress * .6, getGroundHeight(55, 60) + 1.7 + progress * 1.4, 60 - progress * 4);
          yaw = THREE.MathUtils.lerp(-1.12, 0, progress);
          pitch = THREE.MathUtils.lerp(-.08, .39, progress);
        } else {
          const z = elapsed < 6200
            ? THREE.MathUtils.lerp(13.2, 11.8, THREE.MathUtils.smoothstep(elapsed, 4300, 6200))
            : THREE.MathUtils.lerp(11.8, 7, THREE.MathUtils.smoothstep(elapsed, 6200, 7800));
          camera.position.set(0, 1.7, z);
          yaw = 0; pitch = -.12;
        }
        const moment = elapsed < 2500 ? "lake" : elapsed < 3500 ? "tower" : elapsed < 4700 ? "blackout" : elapsed < 7600 ? "arrival" : elapsed < 10000 ? "welcome" : "settle";
        if (moment !== shownMoment) { shownMoment = moment; setCinematicMoment(moment); }
      }
      if (mode !== previousMode) {
        camera.fov = mode === "lobby" ? (mount.clientWidth < 640 ? 82 : 68) : (mount.clientWidth < 640 ? 90 : 76);
        camera.updateProjectionMatrix();
      }
      if (mode !== previousMode && mode === "city") {
        camera.position.set(55, getGroundHeight(55, 60) + 1.7, 60);
        yaw = -1.12; pitch = -.08;
      }
      if (mode !== previousMode && mode === "lobby" && previousMode === "city") {
        camera.position.set(0, 1.7, 7);
        yaw = 0; pitch = -.12;
      }
      previousMode = mode;
      if ((mode === "city" || mode === "lobby") && openPlaceRef.current === null) {
        const forward = Number(controls.has("KeyW") || controls.has("ArrowUp")) - Number(controls.has("KeyS") || controls.has("ArrowDown"));
        const strafe = Number(controls.has("KeyD") || controls.has("ArrowRight")) - Number(controls.has("KeyA") || controls.has("ArrowLeft"));
        const length = Math.hypot(forward, strafe) || 1;
        const speed = controls.has("ShiftLeft") || controls.has("ShiftRight") ? 12 : 7.5;
        const nextX = camera.position.x + (-Math.sin(yaw) * forward + Math.cos(yaw) * strafe) / length * speed * delta;
        const nextZ = camera.position.z + (-Math.cos(yaw) * forward - Math.sin(yaw) * strafe) / length * speed * delta;
        if (mode === "lobby") {
          if (canWalkLobby(nextX, camera.position.z)) camera.position.x = nextX;
          if (canWalkLobby(camera.position.x, nextZ)) camera.position.z = nextZ;
        } else {
          if (canWalkStep(camera.position.x, camera.position.z, nextX, camera.position.z)) camera.position.x = nextX;
          if (canWalkStep(camera.position.x, camera.position.z, camera.position.x, nextZ)) camera.position.z = nextZ;
        }
        const ground = mode === "lobby" ? 0 : getGroundHeight(camera.position.x, camera.position.z);
        const bob = !reducedMotion.matches ? Math.sin(time * 10) * Math.min(Math.abs(forward) + Math.abs(strafe), 1) * 0.025 : 0;
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, ground + 1.7 + bob, Math.min(1, delta * 10));
      }
      camera.rotation.y = yaw;
      camera.rotation.x = pitch;
      if ((mode === "city" || mode === "lobby") && now - previousUi > 180) {
        previousUi = now;
        const nearestDistance = mode === "lobby" ? Math.hypot(camera.position.x - COFFEE_STOP.x, camera.position.z - COFFEE_STOP.z) : Infinity;
        const near = nearestDistance < 4.3 ? 0 : null;
        if (near !== nearPlaceRef.current) { nearPlaceRef.current = near; setNearPlace(near); }
      }
      if (!reducedMotion.matches) {
        if (mode === "lobby" || (mode === "cinematic" && entryStartedAt !== null && now - entryStartedAt >= 4300)) {
          const doorProgress = mode === "lobby" || entryStartedAt === null ? 1 : THREE.MathUtils.smoothstep(now - entryStartedAt, 5200, 6750);
          lobby.animate(time, doorProgress, camera);
        }
        else world.animate(time);
      }
      renderer.render(mode === "lobby" || (mode === "cinematic" && entryStartedAt !== null && now - entryStartedAt >= 4300) ? lobbyScene : scene, camera);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      world.dispose();
      lobby.dispose();
      cancelAnimationFrame(frame);
      observer.disconnect();
      if (document.pointerLockElement === renderer.domElement) document.exitPointerLock();
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("pointerlockchange", onLockChange);
      renderer.domElement.removeEventListener("pointerdown", onCanvasDown);
      renderer.domElement.removeEventListener("pointermove", onCanvasMove);
      renderer.domElement.removeEventListener("pointerup", onCanvasUp);
      renderer.domElement.removeEventListener("pointercancel", onCanvasUp);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      controls.clear();
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      const collect = (object: THREE.Object3D) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Sprite) {
          if (!(object instanceof THREE.Sprite)) geometries.add(object.geometry);
          const list = Array.isArray(object.material) ? object.material : [object.material];
          list.forEach((material) => materials.add(material));
        }
      };
      scene.traverse(collect);
      lobbyScene.traverse(collect);
      geometries.forEach((geometry) => geometry.dispose());
      const allTextures = new Set<THREE.Texture>();
      materials.forEach((material) => {
        if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshBasicMaterial) {
          if (material.map) allTextures.add(material.map);
          if (material instanceof THREE.MeshStandardMaterial && material.normalMap) allTextures.add(material.normalMap);
        }
        material.dispose();
      });
      allTextures.forEach((texture) => texture.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [changePhase, closeStation, openStation]);

  return (
    <main className={styles.game}>
      <div ref={mountRef} className={styles.world} aria-label="석촌호수에서 잠실타워로 들어가는 3D 포트폴리오" />
      <div className={styles.vignette} aria-hidden="true" />
      {phase !== "lobby" && <div className={styles.gameScanlines} aria-hidden="true" />}
      <header className={styles.gameHeader}>
        <Link href="/" className={styles.homeLink}><span aria-hidden="true">↖</span> PORTFOLIO</Link>
        <span className={styles.districtLabel}><i /> NEON SEOUL <b>／</b> JAMSIL</span>
        <span className={styles.gameClock}>{phase === "lobby" ? "LOTTE WORLD TOWER · PORTFOLIO LOBBY" : "SEOKCHON LAKE · OLYMPIC-RO"}</span>
      </header>
      {!started && (
        <div className={styles.entryOverlay}>
          <div className={styles.entryPanel}>
            <span className={styles.entryKicker}><i /> FRONTEND DEVELOPER / INTERACTIVE PORTFOLIO</span>
            <h1>NEON<br /><span>SEOUL.</span></h1>
            <p className={styles.entryKorean}>석촌호수에서 잠실타워까지.<br />제 이야기가 시작됩니다.</p>
            <p className={styles.entryDescription}>석촌호숫길에서 잠실타워 로비까지. 잠시 둘러본 뒤 편하게 커피챗으로 이어가요.</p>
            <button className={styles.enterButton} type="button" onClick={enterCity} disabled={!sceneReady || sceneError}>
              {sceneError ? "도시를 불러오지 못했어요" : sceneReady ? "잠실타워로 들어가기" : "잠실을 불러오는 중..."} <span aria-hidden="true">↗</span>
            </button>
            <span className={styles.entryControl}>호숫길에서 출발하는 짧은 시네마틱 인트로</span>
          </div>
        </div>
      )}
      {phase === "cinematic" && (
        <div className={`${styles.cinematicOverlay} ${styles[`cinematic_${cinematicMoment}`]}`} aria-live="polite">
          <div className={styles.cinematicShade} />
          <div className={styles.cinematicCaption}>
            <span>{cinematicMoment === "lake" ? "01 / SEOKCHON LAKE" : cinematicMoment === "tower" ? "02 / LOTTE WORLD TOWER" : cinematicMoment === "arrival" ? "03 / TOWER ENTRANCE" : "04 / PORTFOLIO LOBBY"}</span>
            <strong>{cinematicMoment === "lake" ? "호수에서 시작해" : cinematicMoment === "tower" ? "잠실타워를 바라봅니다" : cinematicMoment === "arrival" ? "문이 열립니다" : "어서 오세요."}</strong>
            {(cinematicMoment === "welcome" || cinematicMoment === "settle") && <p>잠시 머물며 이야기를 나눠요.</p>}
          </div>
          <button className={styles.cinematicSkip} type="button" onClick={() => { skipArrivalRef.current = true; }}>건너뛰기 ↗</button>
        </div>
      )}
      {started && phase !== "cinematic" && activePlace === null && (
        <>
          {phase === "city" && <div className={styles.crosshair} aria-hidden="true"><span /></div>}
          {phase === "lobby" && <button className={styles.returnToLake} type="button" onClick={returnToLake}>↖ 호숫길로 돌아가기</button>}
          {phase === "city" && <button className={styles.returnToLake} type="button" onClick={enterLobby}>↗ 타워 로비로 들어가기</button>}
          {phase === "lobby" && <div className={styles.lobbyGuide}><span>WELCOME TO THE CAFE</span><strong>편하게 앉으세요.<br />커피 한 잔하며 이야기해요.</strong><button type="button" onClick={openStation}>커피챗 열기 <span aria-hidden="true">↗</span></button></div>}
          <div className={styles.gameHud}>
            <div className={styles.instructions}>{isTouch ? "왼쪽 버튼 이동 · 화면을 밀어 둘러보기" : locked ? "WASD 이동  /  SHIFT 달리기  /  마우스 시점  /  ESC 커서" : "화면을 클릭해 마우스 시점 사용 · WASD 이동"}</div>
          </div>
          {nearPlace !== null && <button className={styles.interactPrompt} type="button" onClick={openStation}><kbd>E</kbd> 커피챗 열기 <span aria-hidden="true">↗</span></button>}
          {isTouch && <div className={styles.touchControls} aria-label="이동 조작">
            <TouchButton label="앞으로 이동" direction="KeyW" onDirection={setTouchDirection}>↑</TouchButton>
            <div>
              <TouchButton label="왼쪽 이동" direction="KeyA" onDirection={setTouchDirection}>←</TouchButton>
              <TouchButton label="뒤로 이동" direction="KeyS" onDirection={setTouchDirection}>↓</TouchButton>
              <TouchButton label="오른쪽 이동" direction="KeyD" onDirection={setTouchDirection}>→</TouchButton>
            </div>
          </div>}
        </>
      )}
      {activePlace !== null && (
        <div className={styles.terminalOverlay} role="dialog" aria-modal="true" aria-labelledby="place-title">
          <div className={styles.terminalPanel}>
            <button className={styles.panelClose} type="button" onClick={closeStation} aria-label="소개 닫기">×</button>
            <span className={styles.terminalKicker}>◉ {COFFEE_INVITE.code} / {COFFEE_INVITE.location}</span>
            <h2 id="place-title">{COFFEE_INVITE.title.split("\n").map((line, index) => <span key={line} className={index ? styles.panelAccent : undefined}>{line}{index === 0 && <br />}</span>)}</h2>
            <p>{COFFEE_INVITE.description}</p>
            {hasCoffeeChatLink ? <a className={styles.panelAction} href={coffeeChatHref} target={coffeeChatHref?.startsWith("mailto:") ? undefined : "_blank"} rel={coffeeChatHref?.startsWith("mailto:") ? undefined : "noreferrer"}>커피챗 제안하기 <span aria-hidden="true">↗</span></a>
              : <small className={styles.contactPending}>커피챗 연락 링크는 준비 중이에요.</small>}
          </div>
        </div>
      )}
      <div className={styles.mapCredit}>
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">거리·건물 © OpenStreetMap contributors</a>
        <span aria-hidden="true">·</span>
        <a href="https://commons.wikimedia.org/wiki/File:Seokchon_Lake_in_Seoul.jpg" target="_blank" rel="noreferrer">석촌호수 사진 © Christian Bolz · CC BY-SA 4.0 · AI 재구성</a>
      </div>
    </main>
  );
}
