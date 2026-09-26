"use client";

import {useMemo,useState} from "react";

const steps=[
  {n:1,label:"פרטי המשחק"},
  {n:2,label:"מאגר שאלות"},
  {n:3,label:"משפט המסתורין"},
  {n:4,label:"עיצוב והפעלה"}
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

  const letters=useMemo(()=>secret.replace(/[\s\-–—.,!?'"״׳:;()]/g,"").length,[secret]);

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

  let countMessage="";
  if(letters===count) countMessage="✓ התאמה מושלמת";
  else if(letters<count) countMessage="חסרות "+(count-letters)+" אותיות";
  else countMessage="יש "+(letters-count)+" אותיות מיותרות";

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
        <img src="/LinkUp-logo.png" alt="LinkUp — כולנו חלק מהשרשרת" className="brand-logo"/>
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
          <div className="bank-loaded">✓ המאגר נטען בהצלחה · ניתן לערוך את כל הפריטים לפני המשך</div>
          <div className="items-editor">
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
          {["שרשרת זוהרת","שביל מסתורין","מפת אוצר","גלקסיית ידע","טבע וצמיחה","מעבדת מדע","מסע ישראלי","אבני דרך"].map(t=><button key={t} className={theme===t?"theme active":"theme"} onClick={()=>setTheme(t)}><span className="theme-dot"/><b>{t}</b></button>)}
        </div>
        <div className="ready-card">
          <div><small>LinkUp</small><h3>{topic||"המשחק שלך כמעט מוכן"}</h3><p>{count} חוליות · {theme}</p></div>
          <button className="launch">פתיחת לובי המשחק</button>
        </div>
      </section>}

      <footer className="wizard-nav">
        {step>1?<button className="back" onClick={()=>go(step-1)}>חזרה</button>:<span/>}
        {step<4&&<button className="next" onClick={()=>go(step+1)}>המשך</button>}
      </footer>
    </section>
  </main>;
}
