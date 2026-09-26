"use client";

import {useEffect,useState} from "react";
import {useParams} from "next/navigation";

export default function JoinRoom(){
  const params=useParams();
  const code=String(params.code||"");
  const [name,setName]=useState("");
  const [participantId,setParticipantId]=useState("");
  const [room,setRoom]=useState(null);
  const [joining,setJoining]=useState(false);
  const [error,setError]=useState("");
  const [answer,setAnswer]=useState("");
  const [feedback,setFeedback]=useState("");
  const [showHint,setShowHint]=useState(false);
  const [hintMode,setHintMode]=useState("");

  useEffect(()=>{
    const saved=localStorage.getItem("linkupPid:"+code);
    if(saved)setParticipantId(saved);
  },[code]);

  useEffect(()=>{
    if(!participantId)return;
    let alive=true;
    async function load(){
      try{
        const r=await fetch(`/api/game?code=${code}&role=student&participantId=${participantId}`,{cache:"no-store"});
        const d=await r.json();
        if(r.status===404){
          localStorage.removeItem("linkupPid:"+code);
          if(alive)setParticipantId("");
          return;
        }
        if(!r.ok)throw new Error(d.error||"שגיאה");
        if(alive){setRoom(d);setError("");}
      }catch(e){if(alive)setError(e.message)}
    }
    load();
    const timer=setInterval(load,1000);
    return()=>{alive=false;clearInterval(timer)};
  },[participantId,code]);

  async function join(){
    if(!name.trim()||joining)return;
    setJoining(true);setError("");
    try{
      const r=await fetch("/api/game",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({action:"join",code,name})
      });
      const d=await r.json();
      if(!r.ok)throw new Error(d.error==="not_found"?"החדר לא נמצא":d.error||"לא ניתן להצטרף");
      localStorage.setItem("linkupPid:"+code,d.participantId);
      setParticipantId(d.participantId);
    }catch(e){setError(e.message)}
    finally{setJoining(false)}
  }

  async function pushTyping(value){
    try{await fetch("/api/game",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"typing",code,participantId,answer:value})})}catch{}
  }

  async function submitAnswer(){
    if(!answer.trim()||!room?.turn?.isMyTurn)return;
    try{
      const r=await fetch("/api/game",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"answer",code,participantId,answer})});
      const d=await r.json();
      if(!r.ok)throw new Error(d.error||"שגיאה");
      if(d.correct){setFeedback("נכון! החוליה נפתחה ✓");setAnswer("");setShowHint(false)}
      else {setFeedback("עוד ניסיון — אפשר להיעזר ברמז");setShowHint(true)}
    }catch(e){setError(e.message)}
  }

  if(participantId){
    const playing=room?.status==="playing";
    const paused=room?.status==="paused";
    const finished=room?.status==="finished";
    const mine=room?.turn?.isMyTurn;
    return <main className="student-join-shell">
      <section className="student-join-card waiting-card">
        <img src="/linkup-logo2.png" alt="LinkUp" className="student-join-logo"/>
        {!playing&&!finished&&<><div className="waiting-dot">✓</div><h1>התחברת למשחק</h1><p><b>{room?.participant?.name||name}</b>, מחכים שהמורה יתחיל את השרשרת.</p></>}
        {paused&&<><div className="waiting-dot">Ⅱ</div><h1>המשחק בהשהיה</h1><p>המורה יחזיר את המשחק בעוד רגע.</p></>}
        {playing&&room?.phase==="transition"&&<><div className="waiting-dot">⛓</div><h1>החוליה נפתחה!</h1><p>הבא/ה בתור: <b>{room?.nextPlayerName}</b></p></>}
        {playing&&room?.phase==="correct"&&<><div className="waiting-dot">✓</div><h1>נכון!</h1><p>התשובה: <b>{room?.lastAnswer}</b></p></>}
        {playing&&room?.phase==="question"&&!mine&&<><div className="waiting-dot">⛓</div><h1>השרשרת בתנועה</h1><p><b>{room?.participant?.name||name}</b>, ממתינים לתורך. כרגע משחק/ת: <b>{room?.turn?.participantName||""}</b></p><div className="student-chain-progress">{room?.progress||0} מתוך {room?.count||0} חוליות</div></>}
        {playing&&room?.phase==="question"&&mine&&<div className="student-question-card">
          <div className="student-turn-badge">התור שלך</div>
          <h1>{room?.turn?.question}</h1>
          <div className="letter-boxes words" dir="rtl">{(room?.turn?.answerPattern||[]).map((part,pi)=>part===" "?<i className="answer-word-space" key={pi}/>:<span className="answer-word" key={pi}>{Array.from({length:part}).map((_,i)=>{const before=(room.turn.answerPattern||[]).slice(0,pi).filter(x=>x!==" ").reduce((s,x)=>s+x,0);return <b key={i}>{answer.replace(/\s/g,"")[before+i]||""}</b>})}</span>)}</div>
          <input className="answer-hidden-input" value={answer} maxLength={room?.turn?.answerLength||80} autoFocus onChange={e=>{const v=e.target.value;setAnswer(v);setFeedback("");pushTyping(v)}} onKeyDown={e=>{if(e.key==="Enter")submitAnswer()}} placeholder="הקלידו את התשובה"/>
          {showHint&&!hintMode&&<div className="hint-choices"><button onClick={()=>setHintMode("word")}>רמז מילולי</button><button onClick={()=>setHintMode("letter")}>חשיפת אות</button></div>}
          {showHint&&hintMode==="word"&&room?.turn?.hint&&<div className="student-hint">רמז: {room.turn.hint}</div>}
          {showHint&&hintMode==="letter"&&<div className="student-hint">האות הראשונה: <b>{room?.turn?.firstLetter}</b></div>}
          {feedback&&<div className="student-feedback">{feedback}</div>}
          <button className="next student-enter" disabled={!answer.trim()} onClick={submitAnswer}>שליחת תשובה</button>
        </div>}
        {finished&&<><div className="waiting-dot">✓</div><h1>השלמתם את השרשרת!</h1><p>{room?.secret}</p></>}
        <small>קוד כיתה: {code}</small>
        {error&&<div className="room-error">{error}</div>}
      </section>
    </main>;
  }

  return <main className="student-join-shell">
    <section className="student-join-card">
      <img src="/linkup-logo2.png" alt="LinkUp" className="student-join-logo"/>
      <div className="student-join-kicker">הצטרפות למשחק</div>
      <h1>ברוכים הבאים</h1>
      <p>קוד כיתה <b>{code}</b></p>
      <label>השם שלך
        <input value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")join()}} placeholder="הקלידו שם"/>
      </label>
      {error&&<div className="room-error">{error}</div>}
      <button className="next student-enter" disabled={!name.trim()||joining} onClick={join}>{joining?"מתחבר...":"כניסה למשחק"}</button>
    </section>
  </main>;
}
