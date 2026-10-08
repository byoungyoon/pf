"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { ATLAS_PLACES, buildSeoulAtlas } from "./SeoulAtlas";
import PortfolioConversation from "./PortfolioConversation";
import styles from "./coffee-chat.module.css";

type Phase = "loading" | "commute" | "widen" | "perspective" | "conversation";
const STORY_DURATION = 11.4;
const captions = {
  commute: ["매일, 같은 출근길에서.", "우리의 하루는 작은 풍경 안에서 시작됩니다."],
  widen: ["시야를 조금 넓히면,", "익숙한 하루에도 새로운 장면이 있습니다."],
  perspective: ["함께 만들어갈 풍경이 보입니다.", "눈앞의 어려움을 함께 풀고, 더 넓은 풍경을 바라보는 동료."],
};

export default function PortfolioCity() {
  const mountRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedRef = useRef(-1);
  const selectionVersionRef=useRef(0);
  const boundariesRef = useRef(false);
  const exploringRef = useRef(false);
  const phaseRef = useRef<Phase>("loading");
  const storyRef = useRef({elapsed:0,skip:false});
  const [phase,setPhase] = useState<Phase>("loading");
  const [selected,setSelected] = useState(-1);
  const [boundaries,setBoundaries] = useState(false);
  const [exploring,setExploring] = useState(false);
  const [error,setError] = useState(false);
  const finished = phase === "conversation";

  const selectPlace = useCallback((index:number)=>{selectedRef.current=index;selectionVersionRef.current++;setSelected(index);},[]);
  const finishStory = useCallback(()=>{
    storyRef.current.skip=true;
    storyRef.current.elapsed=STORY_DURATION;
    phaseRef.current="conversation";setPhase("conversation");
  },[]);
  const replay = useCallback(()=>{
    storyRef.current={elapsed:0,skip:false};
    phaseRef.current="commute";setPhase("commute");
    exploringRef.current=false;setExploring(false);selectPlace(-1);
  },[selectPlace]);
  const toggleExplore = useCallback(()=>{
    const next=!exploringRef.current;exploringRef.current=next;setExploring(next);selectPlace(-1);
  },[selectPlace]);

  useEffect(()=>{
    const mount=mountRef.current;if(!mount)return;
    let renderer:THREE.WebGLRenderer;
    let atlas:ReturnType<typeof buildSeoulAtlas>;
    try {
      renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:"high-performance"});
      renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));
      renderer.outputColorSpace=THREE.SRGBColorSpace;
      renderer.toneMapping=THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure=1.15;
      renderer.domElement.setAttribute("aria-label","출근길에서 서울 전체로 이어지는 입체 풍경. 서울 둘러보기에서는 드래그로 회전하고 스크롤로 확대할 수 있습니다.");
      mount.appendChild(renderer.domElement);
      atlas=buildSeoulAtlas(renderer);
    } catch(cause) {
      console.error(cause);
      // Release a context that was created before scene construction failed.
      if(typeof renderer! === "object"){renderer!.dispose();renderer!.domElement.remove();}
      queueMicrotask(()=>{setError(true);finishStory();});return;
    }
    const resize=()=>{renderer.setSize(mount.clientWidth,mount.clientHeight);atlas.resize(mount.clientWidth,mount.clientHeight);};
    const observer=new ResizeObserver(resize);observer.observe(mount);resize();
    const reducedMotion=window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame=0,previous=performance.now(),firstFrame=true,focusVersion=-1;
    const tick=(now:number)=>{
      const elapsed=Math.max(0,(now-previous)/1000),delta=Math.min(elapsed,.1);previous=now;
      if(!firstFrame&&!document.hidden)storyRef.current.elapsed+=elapsed;
      const skip=storyRef.current.skip||reducedMotion.matches;
      const time=skip?STORY_DURATION:storyRef.current.elapsed;
      const progress=skip?1:THREE.MathUtils.clamp((time-2.2)/8.8,0,1);
      const next:Phase=time>=STORY_DURATION?"conversation":time<4?"commute":time<7.5?"widen":"perspective";
      atlas.story(progress,storyRef.current.elapsed,reducedMotion.matches,exploringRef.current,delta);
      mount.style.setProperty("--sky-arrival",String(THREE.MathUtils.smoothstep(progress,.18,.9)));
      if(progress>=1){atlas.focus(selectedRef.current,focusVersion!==selectionVersionRef.current);focusVersion=selectionVersionRef.current;}
      const stageStart=time<4?0:time<7.5?4:7.5, stageEnd=time<4?4:time<7.5?7.5:STORY_DURATION;
      const captionOpacity=THREE.MathUtils.smoothstep(time-stageStart,0,.65)*(1-THREE.MathUtils.smoothstep(time,stageEnd-.55,stageEnd));
      mount.parentElement?.style.setProperty("--caption-opacity",String(captionOpacity));
      atlas.render(delta,reducedMotion.matches,labelRefs.current,boundariesRef.current,!exploringRef.current);
      if(phaseRef.current!==next){phaseRef.current=next;setPhase(next);}
      if(firstFrame)previous=performance.now();
      firstFrame=false;frame=requestAnimationFrame(tick);
    };
    frame=requestAnimationFrame(tick);
    return()=>{cancelAnimationFrame(frame);observer.disconnect();atlas.dispose();renderer.dispose();renderer.domElement.remove();};
  },[finishStory]);

  const caption = phase!=="loading"&&phase!=="conversation"?captions[phase]:null;
  return <main className={`${styles.game} ${finished?styles.finished:""} ${exploring?styles.exploring:""}`} data-phase={phase}>
    <div ref={mountRef} className={styles.world}/>
    <div className={styles.vignette} aria-hidden="true"/>
    <div className={styles.conversationVeil} aria-hidden="true"/>
    <header className={styles.gameHeader}>
      <Link href="/" className={styles.homeLink}><span aria-hidden="true">↖</span> BYOUNGYOON</Link>
      <div className={styles.headerActions}>
        {finished?<><button type="button" className={styles.replayButton} onClick={replay} disabled={error}>처음부터 보기 <span aria-hidden="true">↺</span></button><button type="button" className={styles.exploreButton} onClick={toggleExplore} disabled={error}>{exploring?"대화로 돌아가기":"서울 둘러보기"}<span aria-hidden="true">{exploring?"↙":"↗"}</span></button></>:<button type="button" className={styles.skipButton} onClick={finishStory}>건너뛰고 이야기하기 <span aria-hidden="true">↗</span></button>}
      </div>
    </header>
    {phase==="loading"&&<div className={styles.loadingStory} role="status"><span>SEOUL, A WIDER VIEW</span><p>서울의 풍경을 준비하고 있어요.</p></div>}
    {caption&&<div key={phase} className={styles.storyCaption} aria-live="polite"><span className={styles.chapterNumber}>0{phase==="commute"?1:phase==="widen"?2:3} / A WIDER VIEW</span><h2>{caption[0]}</h2><p>{caption[1]}</p></div>}
    {finished&&<div hidden={exploring}><PortfolioConversation/></div>}
    {finished&&exploring&&<>
      <div className={styles.atlasLabels}>{ATLAS_PLACES.map((place,index)=><button key={place.label} type="button" ref={el=>{labelRefs.current[index]=el;}} className={`${styles.atlasPin} ${selected===index?styles.atlasPinSelected:""}`} aria-pressed={selected===index} onClick={()=>selectPlace(index)}><i/><span>{place.name}</span></button>)}</div>
      <nav className={styles.placeNav} aria-label="서울 지역 선택"><span className={styles.placeNavTitle}>A FEW PLACES IN SEOUL</span>{ATLAS_PLACES.map((place,index)=><button key={place.label} type="button" aria-pressed={selected===index} className={selected===index?styles.placeSelected:undefined} onClick={()=>selectPlace(index)}><span className={styles.placeNumber}>0{index+1}</span><span><strong>{place.name}</strong><small>{place.label}</small></span><span aria-hidden="true">↗</span></button>)}<p className={styles.placeDescription}>{ATLAS_PLACES[selected]?.description??"같은 도시에서도, 더 넓은 풍경을 봅니다."}</p></nav>
      <div className={styles.mapTools} aria-label="지도 보기 설정"><button type="button" onClick={()=>selectPlace(-1)}>서울 전체 보기 <span aria-hidden="true">↺</span></button><button type="button" aria-pressed={boundaries} onClick={()=>{boundariesRef.current=!boundaries;setBoundaries(boundariesRef.current);}}><i className={boundaries?styles.toggleOn:undefined}/>구 경계</button></div>
      <span className={styles.mapHint}>드래그해서 회전 · 스크롤 / 두 손가락으로 확대</span>
    </>}
    {finished&&error&&<span className={styles.sceneError}>도시 풍경을 불러오지 못했지만, 이야기는 둘러볼 수 있어요.</span>}
    <div className={styles.mapCredit}><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">지도 © OpenStreetMap</a><span>·</span><a href="https://github.com/southkorea/seoul-maps" target="_blank" rel="noreferrer">구 경계 KOSTAT 2013 / Seoul Maps</a><span>·</span><a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md" target="_blank" rel="noreferrer">고도 USGS / Mapzen</a></div>
  </main>;
}
