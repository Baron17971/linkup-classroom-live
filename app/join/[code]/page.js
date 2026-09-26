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

  if(participantId){
    return <main className="student-join-shell">
      <section className="student-join-card waiting-card">
        <img src="/linkup-logo2.png" alt="LinkUp" className="student-join-logo"/>
        <div className="waiting-dot">✓</div>
        <h1>{room?.status==="playing"?"המשחק מתחיל!":"התחברת למשחק"}</h1>
        <p><b>{room?.participant?.name||name}</b>, {room?.status==="playing"?"המורה התחיל את השרשרת.":"מחכים שהמורה יתחיל את השרשרת."}</p>
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
