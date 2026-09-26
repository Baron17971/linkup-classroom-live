"use client";

import {useEffect,useMemo,useState} from "react";
import {QRCodeSVG} from "qrcode.react";

const steps=[
  {n:1,label:"פרטי המשחק"},
  {n:2,label:"מאגר שאלות"},
  {n:3,label:"משפט המסתורין"},
  {n:4,label:"עיצוב והפעלה"}
];

const themes=[
  {name:"שרשרת זוהרת",mobile:"/chain-mobile.png"},
  {name:"שביל מסתורין",mobile:"/mystery-path-mobile.png"},
  {name:"מפת אוצר",mobile:"/treasure-map-mobile.png"},
  {name:"גלקסיית ידע",mobile:"/galaxy-mobile.png"},
  {name:"טבע וצמיחה",mobile:"/nature-mobile.png"},
  {name:"מעבדת מדע",mobile:"/science-mobile.png"},
  {name:"מסע ישראלי",mobile:"/israeli-journey-mobile.png"},
  {name:"אבני דרך",mobile:"/milestones-mobile.png"}
];

export default function Home(){
  const [view,setView]=useState("home");
  const [step,setStep]=useState(1);
  const [topic,setTopic]=useState("");
  const [subject,setSubject]=useState("");
  const [grade,setGrade]=useState("");
  const [instructions,setInstructions]=useState("");
  const [count,setCount]=useState(30);
  const [bank,setBank]=useState("");
  const [bankLoaded,setBankLoaded]=useState(false);
  const [items,setItems]=useState([]);
  const [secret,setSecret]=useState("");
  const [theme,setTheme]=useState("שרשרת זוהרת");
  const selectedTheme=themes.find(t=>t.name===theme)||themes[0];
  const [roomCode,setRoomCode]=useState("");
  const [teacherToken,setTeacherToken]=useState("");
  const [studentLink,setStudentLink]=useState("");
  const [copied,setCopied]=useState(false);
  const [creatingRoom,setCreatingRoom]=useState(false);
  const [roomError,setRoomError]=useState("");
  const [lobbyRoom,setLobbyRoom]=useState(null);
  const [projector,setProjector]=useState(false);

  const letters=useMemo(()=>secret.replace(/[\s\-–—.,!?'"״׳:;()]/g,"").length,[secret]);

  useEffect(()=>{
    setStudentLink(roomCode?"https://linkup-classroom-live.vercel.app/join/"+roomCode:"");
  },[roomCode]);

  useEffect(()=>{
    if(view!=="lobby"||!roomCode||!teacherToken)return;
    let alive=true;
    async function loadLobby(){
      try{
        const r=await fetch(`/api/game?code=${roomCode}&role=teacher&token=${teacherToken}`,{cache:"no-store"});
        const d=await r.json();
        if(!r.ok)throw new Error(d.error||"שגיאה בטעינת החדר");
        if(alive){setLobbyRoom(d);setRoomError("");}
      }catch(e){if(alive)setRoomError(e.message)}
    }
    loadLobby();
    const timer=setInterval(loadLobby,1000);
    return()=>{alive=false;clearInterval(timer)};
  },[view,roomCode,teacherToken]);

  const aiPrompt=useMemo(()=>`אני מורה ל${subject||"[מקצוע]"} ומלמד/ת תלמידי כיתה ${grade||"[כיתה]"} את הנושא: ${topic||"[נושא]"}.
צור ${count} שאלות קצרות למשחק כיתתי.
לכל שאלה צור תשובה נכונה אחת ורמז מילולי קצר שעוזר להגיע לתשובה אך אינו כולל אותה.
הימנע מכפילויות ושמור על רמת קושי מתאימה לכיתה.
החזר בלבד בפורמט:
שאלה | תשובה | רמז`,[subject,grade,topic,count]);

  const secretPrompt=useMemo(()=>`צור משפט סיום קצר, חיובי ומשמעותי בנושא ${topic||"[נושא]"}, המתאים לתלמידי כיתה ${grade||"[כיתה]"}.
המשפט חייב להכיל בדיוק ${count} אותיות, ללא ספירת רווחים, סימני פיסוק, מספרים או מקפים.
החזר רק את המשפט עצמו, ללא הסבר וללא ספירת אותיות.`,[topic,grade,count]);

  function go(n){
    setStep(n);
    requestAnimationFrame(()=>window.scrollTo({top:0,behavior:"smooth"}));
  }

  function openTeacher(){
    setView("teacher");
    requestAnimationFrame(()=>window.scrollTo({top:0,behavior:"instant"}));
  }

  function loadBank(){
    const parsed=bank.split(/\r?\n/)
      .map(x=>x.trim())
      .filter(Boolean)
      .map((line,index)=>{
        const parts=line.split("|").map(x=>x.trim());
        if(parts.length<3) return null;
        return {id:index+1,question:parts[0],answer:parts[1],hint:parts.slice(2).join(" | ")};
      })
      .filter(Boolean);
    setItems(parsed);
    setBankLoaded(parsed.length>0);
    if(parsed.length>0){
      setTimeout(()=>{
        document.getElementById("items-editor")?.scrollIntoView({behavior:"smooth",block:"start"});
      },120);
    }
  }

  function updateItem(id,key,value){
    setItems(prev=>prev.map(item=>item.id===id?{...item,[key]:value}:item));
  }

  function removeItem(id){
    setItems(prev=>prev.filter(item=>item.id!==id));
  }

  function addItem(){
    setItems(prev=>[...prev,{id:Date.now(),question:"",answer:"",hint:""}]);
  }

  function syncBank(){
    const text=items.map(item=>[item.question,item.answer,item.hint].join(" | ")).join("\n");
    setBank(text);
    setBankLoaded(items.length>0);
  }

  async function createRoom(){
    if(creatingRoom)return;
    setCreatingRoom(true);
    setRoomError("");
    try{
      const currentItems=items.length?items:bank.split(/\r?\n/).map((line,index)=>{
        const parts=line.split("|").map(x=>x.trim());
        if(parts.length<3)return null;
        return {id:index+1,question:parts[0],answer:parts[1],hint:parts.slice(2).join(" | ")};
      }).filter(Boolean);
      const r=await fetch("/api/game",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({action:"create",topic,subject,grade,instructions,count,theme,secret,items:currentItems})
      });
      const d=await r.json();
      if(!r.ok)throw new Error(d.error||"לא ניתן לפתוח חדר");
      setRoomCode(d.code);
      setTeacherToken(d.teacherToken);
      setLobbyRoom(null);
      setView("lobby");
    }catch(e){
      setRoomError(e.message);
    }finally{
      setCreatingRoom(false);
    }
  }

  async function startGame(){
    if(!roomCode||!teacherToken)return;
    try{
      const r=await fetch("/api/game",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({action:"start",code:roomCode,token:teacherToken})
      });
      const d=await r.json();
      if(!r.ok)throw new Error(d.error||"לא ניתן להתחיל");
      setLobbyRoom(d);
      setRoomError("");
    }catch(e){setRoomError(e.message)}
  }

  let countMessage="";
  if(letters===count) countMessage="✓ התאמה מושלמת";
  else if(letters<count) countMessage="חסרות "+(count-letters)+" אותיות";
  else countMessage="יש "+(letters-count)+" אותיות מיותרות";

  if(projector&&roomCode){
    const progress=lobbyRoom?.progress||0;
    const chars=secret.split("");
    let li=0;
    return <main className="projector-live">
      <picture className="preview-picture"><source media="(max-width:720px)" srcSet={selectedTheme.mobile}/><img src="/chain-bg-desktop.png" alt="" className="preview-bg"/></picture>
      <div className="preview-overlay">
        <img src="/linkup-logo2.png" alt="LinkUp" className="preview-logo"/>
        <div className="preview-topic">{topic}</div>
        {lobbyRoom?.status==="playing"&&<div className="projector-question-panel">
          <small>השאלה של {lobbyRoom?.currentPlayerName||""}</small>
          <h2>{lobbyRoom?.currentQuestion||""}</h2>
          <div className="projector-live-answer" dir="rtl">{lobbyRoom?.liveAnswer||"ממתינים לתשובה…"}</div>
        </div>}
        <div className="preview-secret projector-secret" dir="rtl">{chars.map((ch,i)=>{
          if(!/[א-ת]/.test(ch))return ch===" "?<span className="projector-space" key={i}/>:<span className="preview-punctuation" key={i}>{ch}</span>;
          const n=li++; return <span className="preview-letter" key={i}>{n<progress?ch:"•"}</span>
        })}</div>
        <div className="preview-progress"><b>{progress}</b><span>מתוך {count} חוליות</span></div>
        {lobbyRoom?.status==="finished"&&<div className="projector-finish">השרשרת הושלמה!</div>}
        <button className="projector-exit" onClick={()=>setProjector(false)}>יציאה ממצב מקרן</button>
      </div>
    </main>;
  }

  if(view==="preview"){
    const hiddenSentence=secret
      ? secret.trim().split(/\s+/).map((word,wi)=>
          <span className="preview-word" key={wi}>
            {word.split("").map((ch,ci)=>
              <span className={/[א-ת]/.test(ch)?"preview-letter":"preview-punctuation"} key={ci}>
                {/[א-ת]/.test(ch)?"•":ch}
              </span>
            )}
          </span>
        )
      : <small>משפט המסתורין יוצג כאן</small>;

    return <main className="preview-shell">
      <section className="preview-topbar">
        <button className="back" onClick={()=>{setView("teacher");setStep(4)}}>חזרה לעיצוב</button>
        <div><b>תצוגה מקדימה</b><span>כך ייראה מסך המשחק על המקרן</span></div>
        <button className="next" disabled={creatingRoom} onClick={createRoom}>{creatingRoom?"פותח חדר...":"המשך ללובי"}</button>
      </section>

      <section className="projector-preview">
        <picture className="preview-picture">
          <source media="(max-width:720px)" srcSet={selectedTheme.mobile}/>
          <img src="/chain-bg-desktop.png" alt="" className="preview-bg"/>
        </picture>
        <div className="preview-overlay">
          <img src="/linkup-logo2.png" alt="LinkUp" className="preview-logo"/>
          <div className="preview-topic">{topic||"נושא המשחק"}</div>
          <div className="preview-secret" dir="rtl">{hiddenSentence}</div>
          <div className="preview-progress"><b>0</b><span>מתוך {count} חוליות</span></div>
        </div>
      </section>
    </main>;
  }

  if(view==="lobby"){
    return <main className="lobby-shell">
      <section className="lobby-card">
        <img src="/linkup-logo2.png" alt="LinkUp" className="lobby-logo"/>
        <div className="lobby-kicker">לובי המשחק</div>
        <h1>{topic||"LinkUp"}</h1>
        <p className="lobby-sub">המשחק מוכן. עכשיו אפשר לחבר את התלמידים.</p>

        <div className="join-share-grid">
          <div className="qr-card">
            <span>סרקו כדי להצטרף</span>
            <div className="qr-wrap">{studentLink&&<QRCodeSVG value={studentLink} size={188} bgColor="#ffffff" fgColor="#123f52" level="M"/>}</div>
          </div>

          <div className="room-code-box">
            <span>קוד הכיתה</span>
            <strong>{roomCode}</strong>
            <small>אפשר לסרוק את הברקוד או להיכנס דרך הקישור</small>
          </div>
        </div>

        <div className="student-link-box">
          <span>קישור לתלמידים</span>
          <div className="student-link-row">
            <input readOnly value={studentLink}/>
            <button className="copy-link" onClick={async()=>{await navigator.clipboard.writeText(studentLink);setCopied(true);setTimeout(()=>setCopied(false),1800)}}>{copied?"הועתק ✓":"העתקת קישור"}</button>
          </div>
        </div>

        <div className="lobby-stats">
          <div><b>{lobbyRoom?.participantCount||0}</b><span>תלמידים מחוברים</span></div>
          <div><b>{count}</b><span>חוליות בשרשרת</span></div>
          <div><b>{items.length||count}</b><span>שאלות במאגר</span></div>
        </div>

        {!!lobbyRoom?.participants?.length&&<div className="connected-students">
          <b>מחוברים עכשיו</b>
          <div>{lobbyRoom.participants.map(p=><span key={p.id}>✓ {p.name}</span>)}</div>
        </div>}

        <div className="lobby-wait">{lobbyRoom?.status==="playing"?"המשחק התחיל ✓":"ממתינים לתלמידים…"}</div>
        {roomError&&<div className="room-error">{roomError}</div>}

        <div className="lobby-actions">
          <button className="projector-button" onClick={()=>setProjector(true)}>מצב מקרן</button>
          <button className="back" onClick={()=>{setView("teacher");setStep(4)}}>חזרה לעריכה</button>
          <button className="next" onClick={startGame} disabled={!lobbyRoom?.participantCount||lobbyRoom?.status==="playing"}>{lobbyRoom?.status==="playing"?"המשחק התחיל":"התחל משחק"}</button>
        </div>
      </section>
    </main>;
  }

  if(view==="home"){
    return <main className="home-screen">
      <picture className="home-picture">
        <source media="(max-width:720px)" srcSet="/home-mobile.png.png"/>
        <img src="/home-desktop.png.png" alt="LinkUp — כולנו חלק מהשרשרת" className="home-art"/>
      </picture>
      <button className="home-teacher-hotspot" onClick={openTeacher} aria-label="כניסת מורה">
        <span className="sr-only">כניסת מורה</span>
      </button>
      <div className="home-credit">פותח ע"י ענת ברון־לוביש · כל הזכויות שמורות</div>
    </main>;
  }

  return <main className="teacher-shell">
    <section className="teacher-card">
      <header className="brand-head">
        <img src="/linkup-logo2.png" alt="LinkUp — כולנו חלק מהשרשרת" className="brand-logo"/>
        <div className="brand-copy">
          <span>צד המורה</span>
          <h1>יצירת משחק חדש</h1>
          <p>בונים שרשרת ידע כיתתית שבה כל תלמיד פותח את החוליה הבאה.</p>
        </div>
      </header>

      <nav className="progress" aria-label="שלבי יצירת המשחק">
        {steps.map(s=><button key={s.n} className={step===s.n?"active":step>s.n?"done":""} onClick={()=>go(s.n)}>
          <b>{step>s.n?"✓":s.n}</b><span>{s.label}</span>
        </button>)}
      </nav>

      {step===1&&<section className="panel">
        <div className="panel-title"><span>01</span><div><h2>פרטי המשחק</h2><p>הגדירו את נושא הפעילות ואת גודל השרשרת.</p></div></div>
        <div className="form-grid">
          <label>נושא המשחק<input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="לדוגמה: מערכת הנשימה"/></label>
          <label>מקצוע<input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="לדוגמה: ביולוגיה"/></label>
          <label>כיתה<input value={grade} onChange={e=>setGrade(e.target.value)} placeholder="לדוגמה: י׳"/></label>
          <label>מספר חוליות
            <select value={count} onChange={e=>setCount(Number(e.target.value))}>
              {[20,25,30,35,40].map(n=><option key={n} value={n}>{n} שאלות</option>)}
            </select>
          </label>
        </div>
        <label>הוראות לתלמידים <small>(אופציונלי)</small>
          <textarea value={instructions} onChange={e=>setInstructions(e.target.value)} placeholder="לדוגמה: ענו על השאלה כדי לפתוח את החוליה הבאה בשרשרת."/>
        </label>
      </section>}

      {step===2&&<section className="panel">
        <div className="panel-title"><span>02</span><div><h2>מאגר השאלות</h2><p>לכל שאלה יהיו תשובה ורמז מילולי.</p></div></div>
        <div className="ai-box">
          <div><h3>יצירת מאגר בעזרת AI</h3><p>העתיקו את הפרומפט לכל כלי AI והדביקו כאן את התוצאה.</p></div>
          <textarea className="prompt" readOnly value={aiPrompt}/>
          <button className="soft" onClick={()=>navigator.clipboard.writeText(aiPrompt)}>העתקת פרומפט</button>
        </div>
        <label>הדבק כאן את המאגר שלך
          <textarea className="bank" value={bank} onChange={e=>{setBank(e.target.value);setBankLoaded(false)}} placeholder={"שאלה | תשובה | רמז\nבאיזה אברון מתרחשת הנשימה התאית? | מיטוכונדריה | מכונה תחנת הכוח של התא"}/>
        </label>
        <div className="bank-actions">
          <button className="load-bank" onClick={loadBank}>טעינת המאגר</button>
          <div className="bank-note"><b>{bank.split(/\r?\n/).filter(Boolean).length}</b><span>שורות במאגר</span></div>
        </div>
        {bankLoaded&&<>
          <div className="bank-loaded">✓ המאגר נטען בהצלחה · נפתח אזור עריכת הפריטים</div>
          <div className="items-editor" id="items-editor">
            <div className="items-editor-head">
              <div>
                <h3>עריכת הפריטים</h3>
                <p>{items.length} פריטים במאגר</p>
              </div>
              <button className="add-item" onClick={addItem}>＋ הוסף פריט</button>
            </div>
            <div className="items-list">
              {items.map((item,index)=><article className="item-card" key={item.id}>
                <div className="item-number">{index+1}</div>
                <label>שאלה
                  <textarea value={item.question} onChange={e=>updateItem(item.id,"question",e.target.value)} />
                </label>
                <div className="item-two">
                  <label>תשובה
                    <input value={item.answer} onChange={e=>updateItem(item.id,"answer",e.target.value)} />
                  </label>
                  <label>רמז
                    <input value={item.hint} onChange={e=>updateItem(item.id,"hint",e.target.value)} />
                  </label>
                </div>
                <button className="remove-item" onClick={()=>removeItem(item.id)}>מחק פריט</button>
              </article>)}
            </div>
            <button className="save-items" onClick={syncBank}>שמירת השינויים במאגר</button>
          </div>
        </>}
      </section>}

      {step===3&&<section className="panel">
        <div className="panel-title"><span>03</span><div><h2>משפט המסתורין</h2><p>כל תשובה נכונה תחשוף אות אחת.</p></div></div>
        <div className="ai-box secret-ai">
          <div><h3>יצירת משפט הסיום בעזרת AI</h3><p>הפרומפט מותאם אוטומטית למספר השאלות שבחרתם: <b>{count}</b> אותיות.</p></div>
          <textarea className="prompt secret-prompt" readOnly value={secretPrompt}/>
          <button className="soft" onClick={()=>navigator.clipboard.writeText(secretPrompt)}>העתקת פרומפט</button>
        </div>
        <label>משפט המסתורין
          <textarea className="secret" value={secret} onChange={e=>setSecret(e.target.value)} placeholder={"הדביקו כאן משפט בן בדיוק "+count+" אותיות"}/>
        </label>
        <div className={letters===count?"letter-count exact":"letter-count"}>
          <strong>{letters}</strong><span>מתוך {count} אותיות</span>
          <em>{countMessage}</em>
        </div>
        <div className="secret-preview" dir="rtl">
          {secret?secret.split("").map((ch,i)=>ch===" "?<i key={i}/>:<span key={i}>{/[א-ת]/.test(ch)?"•":ch}</span>):<small>כאן תופיע תצוגה מקדימה של מבנה המשפט</small>}
        </div>
      </section>}

      {step===4&&<section className="panel">
        <div className="panel-title"><span>04</span><div><h2>עיצוב והפעלה</h2><p>בחרו את האווירה של מסך המשחק.</p></div></div>
        <div className="themes">
          {themes.map(t=><button key={t.name} className={theme===t.name?"theme active":"theme"} onClick={()=>setTheme(t.name)}>
            <span className="theme-thumb"><img src={t.mobile} alt=""/></span>
            <b>{t.name}</b>
          </button>)}
        </div>
        <div className="theme-selection-note">העיצוב שבחרתם יוצג במסך המקרן. בשלב הבא תוכלו לראות תצוגה מקדימה מלאה.</div>
      </section>}

      <footer className="wizard-nav">
        {step>1?<button className="back" onClick={()=>go(step-1)}>חזרה</button>:<span/>}
        {step<4
          ? <button className="next" onClick={()=>go(step+1)}>המשך</button>
          : <button className="next final-next" onClick={()=>setView("preview")}>תצוגה מקדימה</button>}
      </footer>
    </section>
  </main>;
}
