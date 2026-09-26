"use client";

import {useState} from "react";
import {useParams} from "next/navigation";

export default function JoinRoom(){
  const params=useParams();
  const code=params.code;
  const [name,setName]=useState("");
  const [joined,setJoined]=useState(false);

  if(joined){
    return <main className="student-join-shell">
      <section className="student-join-card waiting-card">
        <img src="/LinkUp-logo.png" alt="LinkUp" className="student-join-logo"/>
        <div className="waiting-dot">✓</div>
        <h1>התחברת למשחק</h1>
        <p><b>{name}</b>, מחכים שהמורה יתחיל את השרשרת.</p>
        <small>קוד כיתה: {code}</small>
      </section>
    </main>;
  }

  return <main className="student-join-shell">
    <section className="student-join-card">
      <img src="/LinkUp-logo.png" alt="LinkUp" className="student-join-logo"/>
      <div className="student-join-kicker">הצטרפות למשחק</div>
      <h1>ברוכים הבאים</h1>
      <p>קוד כיתה <b>{code}</b></p>
      <label>השם שלך
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="הקלידו שם"/>
      </label>
      <button className="next student-enter" disabled={!name.trim()} onClick={()=>setJoined(true)}>כניסה למשחק</button>
    </section>
  </main>;
}
