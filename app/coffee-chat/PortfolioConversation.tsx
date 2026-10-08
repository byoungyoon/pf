"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./coffee-chat.module.css";

const contactHref = process.env.NEXT_PUBLIC_COFFEE_CHAT_URL?.trim();
const hasContact = !!contactHref && /^(https:\/\/|mailto:)/i.test(contactHref);
const prompts = ["어떤 동료가 되고 싶나요?", "어떤 일을 만들고 있나요?", "커피챗을 제안하고 싶어요"];
type Message = {role:"visitor"|"portfolio";text:string;contact?:boolean;about?:boolean};

// Authored portfolio notes: these are not generated replies or messages from the
// owner. Keep claims grounded in the homepage and the owner's stated philosophy.
function answer(question:string):Message {
  if(/커피|만나|연락|대화|메일|이메일/.test(question)) return {role:"portfolio",text:"함께 만들고 싶은 것, 일하는 방식, 아직 정리되지 않은 아이디어도 좋아요. 잠깐 시간을 내어 서로의 이야기를 나눠보고 싶습니다.",contact:true};
  if(/서울|지하철|출근|도시|풍경|버스|긍정|시야/.test(question)) return {role:"portfolio",text:"같은 지하철을 타고 출근하면서도, 시야를 넓히면 서울의 아름다움이 보입니다. 일할 때도 그 시선을 지키고 싶어요. 눈앞의 어려움을 함께 풀고, 우리가 만들어가는 더 넓은 풍경을 바라보는 동료가 되고 싶습니다."};
  if(/동료|협업|팀|철학|사상|가치|어려|태도|힘들/.test(question)) return {role:"portfolio",text:"눈앞의 어려움을 함께 풀고, 우리가 만들어가는 더 넓은 풍경을 바라보는 동료가 되고 싶습니다. 작은 문제를 차근차근 해결하면서도, 함께 만드는 일의 의미를 잊지 않는 태도를 중요하게 생각해요."};
  if(/만들|개발|일|기술|제품|프로젝트|작업|프론트|포폴|포트폴리오|소개/.test(question)) return {role:"portfolio",text:"프론트엔드를 중심으로, 아이디어를 실제로 작동하는 제품으로 옮기는 일을 합니다. 보기 좋은 화면과 사용하기 좋은 경험을 함께 고민해요. 이 공간도 제가 세상을 바라보는 방식과 함께 일하고 싶은 태도를 담아 만들었습니다.",about:true};
  return {role:"portfolio",text:"여기에는 제 소개와 함께 일하는 태도를 미리 담아두었어요. 아래 질문으로 둘러보거나, 그 이야기는 커피챗에서 직접 나눠 주세요.",contact:true};
}

export default function PortfolioConversation() {
  const [input,setInput]=useState("");
  const [messages,setMessages]=useState<Message[]>([]);
  const [pending,setPending]=useState(false);
  const replyRef=useRef<ReturnType<typeof setTimeout>|null>(null);
  const historyRef=useRef<HTMLDivElement>(null);
  const inputRef=useRef<HTMLTextAreaElement>(null);
  useEffect(()=>()=>{if(replyRef.current)clearTimeout(replyRef.current);},[]);
  useEffect(()=>{const history=historyRef.current;if(history)history.scrollTop=history.scrollHeight;},[messages,pending]);
  function send(text:string) {
    const question=text.trim();if(!question||pending)return;
    setMessages(previous=>[...previous,{role:"visitor",text:question}]);setInput("");setPending(true);
    replyRef.current=setTimeout(()=>{setMessages(previous=>[...previous,answer(question)]);setPending(false);replyRef.current=null;},450);
    inputRef.current?.focus();
  }
  function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();send(input);}
  function reset(){if(replyRef.current)clearTimeout(replyRef.current);replyRef.current=null;setMessages([]);setPending(false);setInput("");inputRef.current?.focus();}
  let href=contactHref;
  if(hasContact&&contactHref?.toLowerCase().startsWith("mailto:")) {
    const url=new URL(contactHref);if(!url.searchParams.has("subject"))url.searchParams.set("subject","포트폴리오 커피챗");href=url.toString();
  }
  return <section className={`${styles.conversation} ${messages.length?styles.conversationActive:""}`} aria-label="포트폴리오 대화">
    <div className={styles.conversationHeading}>
      <span className={styles.conversationKicker}>A WIDER VIEW, TOGETHER</span>
      <h1>{messages.length?"함께 만들어갈 이야기":"같은 하루,"}{!messages.length&&<><br/>조금 더 넓은 시선.</>}</h1>
      <p>눈앞의 어려움은 함께 풀고,<br/>우리가 만드는 더 넓은 풍경을 바라봅니다.</p>
    </div>
    {!!messages.length&&<div ref={historyRef} className={styles.chatHistory} role="log" aria-label="대화 내용" aria-live="polite" aria-relevant="additions text">
      {messages.map((message,index)=><div key={index} className={message.role==="visitor"?styles.visitorMessage:styles.portfolioMessage}>
        {message.role==="portfolio"&&<span className={styles.messageAuthor}>BYOUNGYOON <small>소개 노트</small></span>}
        <p>{message.text}</p>
        {message.about&&<Link href="/#about" className={styles.messageLink}>소개 더 보기 <span aria-hidden="true">↗</span></Link>}
        {message.contact&&(hasContact?<a className={styles.messageLink} href={href} target={contactHref?.toLowerCase().startsWith("mailto:")?undefined:"_blank"} rel={contactHref?.toLowerCase().startsWith("mailto:")?undefined:"noreferrer"}>커피챗 연락하기 <span aria-hidden="true">↗</span></a>:<span className={styles.contactPending}>커피챗 연락 링크는 준비 중입니다.</span>)}
      </div>)}
      {pending&&<span className={styles.replyPending} role="status">소개 노트를 펼치고 있어요<span aria-hidden="true"> ···</span></span>}
    </div>}
    <form className={styles.composer} onSubmit={submit}>
      <label htmlFor="portfolio-question" className={styles.srOnly}>궁금한 이야기를 입력하세요</label>
      <textarea ref={inputRef} id="portfolio-question" value={input} rows={2} maxLength={1000} onChange={event=>setInput(event.target.value)} placeholder="어떤 동료인지, 어떤 일을 만드는지 물어보세요."
        onKeyDown={event=>{if(event.key==="Enter"&&!event.shiftKey&&!event.nativeEvent.isComposing){event.preventDefault();send(input);}}}/>
      <div className={styles.composerFooter}><span>미리 담아둔 소개와 생각을 둘러보세요.</span><button type="submit" disabled={!input.trim()||pending} aria-label="메시지 보내기"><span aria-hidden="true">↑</span></button></div>
    </form>
    <div className={styles.suggestedQuestions} aria-label="추천 질문">{prompts.map(prompt=><button key={prompt} type="button" onClick={()=>send(prompt)} disabled={pending}>{prompt}</button>)}</div>
    {!!messages.length&&<button className={styles.resetConversation} type="button" onClick={reset}>새 이야기 시작하기 <span aria-hidden="true">↺</span></button>}
  </section>;
}
