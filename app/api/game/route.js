import { getCache } from "@vercel/functions";
import crypto from "node:crypto";

export const runtime="nodejs";
export const dynamic="force-dynamic";

// Separate cache namespace for LinkUp only. It is intentionally isolated from the Bingo app.
const cache=()=>getCache(undefined,"linkup-classroom-live-v1");
const TTL=60*60*24*30;
const roomKey=(code)=>`linkup-room:${code}`;
const clean=(v,max=200)=>typeof v==="string"?v.trim().slice(0,max):"";
const code6=()=>String(crypto.randomInt(100000,1000000));
const token=()=>crypto.randomBytes(18).toString("hex");

async function load(code){return await cache().get(roomKey(code))}
async function save(room){
  room.updatedAt=Date.now();
  room.version=(room.version||0)+1;
  await cache().set(roomKey(room.code),room,{ttl:TTL});
}
async function freshCode(){
  for(let i=0;i<12;i++){
    const c=code6();
    if(!(await load(c)))return c;
  }
  throw new Error("code");
}
function teacherOK(room,t){return !!t&&t===room.teacherToken}
function publicRoom(room){
  return {
    code:room.code,
    topic:room.topic,
    subject:room.subject,
    grade:room.grade,
    instructions:room.instructions,
    count:room.count,
    theme:room.theme,
    secret:room.secret,
    status:room.status,
    participantCount:Object.keys(room.participants||{}).length,
    questionCount:room.items?.length||0,
    version:room.version||0,
    progress:room.progress||0,
    liveAnswer:room.liveAnswer||"",
    revealedLetters:room.revealedLetters||[],
    phase:room.phase||"question",
    paused:!!room.paused,
    feedback:room.feedback||"",
    hintedLetters:room.hintedLetters||[],
    lastAnswer:room.lastAnswer||"",
    nextPlayerName:room.nextPlayerName||""
  };
}

export async function GET(req){
  const u=new URL(req.url);
  const code=clean(u.searchParams.get("code"),10);
  const room=await load(code);
  if(!room)return Response.json({error:"not_found"},{status:404});
  const role=u.searchParams.get("role")||"public";

  if(role==="teacher"){
    const t=u.searchParams.get("token");
    if(!teacherOK(room,t))return Response.json({error:"forbidden"},{status:403});
    return Response.json({
      ...publicRoom(room),
      participants:Object.values(room.participants||{}).map(p=>({id:p.id,name:p.name,joinedAt:p.joinedAt})),
      currentQuestion:["playing","paused"].includes(room.status)?(room.items||[])[room.progress||0]?.question||"": "",
      currentHint:["playing","paused"].includes(room.status)?(room.items||[])[room.progress||0]?.hint||"": "",
      currentAnswer:["playing","paused"].includes(room.status)?(room.items||[])[room.progress||0]?.answer||"": "",
      currentAnswerLength:["playing","paused"].includes(room.status)?((room.items||[])[room.progress||0]?.answer||"").replace(/\s/g,"").length:0,
      currentPlayerName:(()=>{const ps=Object.values(room.participants||{}).sort((a,b)=>a.joinedAt-b.joinedAt);return ps.length?ps[(room.currentTurn||0)%ps.length].name:""})()
    });
  }

  if(role==="student"){
    const pid=u.searchParams.get("participantId");
    const p=room.participants?.[pid];
    if(!p)return Response.json({error:"student_not_found"},{status:404});
    const players=Object.values(room.participants||{}).sort((a,b)=>a.joinedAt-b.joinedAt);
    const active=["playing","paused"].includes(room.status);
    const current=active&&players.length?players[(room.currentTurn||0)%players.length]:null;
    const item=active?(room.items||[])[room.progress||0]:null;
    return Response.json({...publicRoom(room),participant:{id:p.id,name:p.name,joinedAt:p.joinedAt},turn:item&&current?{isMyTurn:current.id===p.id,participantName:current.name,question:current.id===p.id?item.question:null,hint:current.id===p.id?item.hint:null,answerLength:current.id===p.id?item.answer.replace(/\s/g,"").length:0,answerPattern:current.id===p.id?item.answer.split(/(\s+)/).map(x=>/^\s+$/.test(x)?" ":x.length):[],hintedLetters:current.id===p.id?(room.hintedLetters||[]):[]}:null});
  }

  return Response.json(publicRoom(room));
}

export async function POST(req){
  let body={};
  try{body=await req.json()}catch{}
  const action=clean(body.action,30);

  if(action==="create"){
    const topic=clean(body.topic,100);
    const subject=clean(body.subject,80);
    const grade=clean(body.grade,40);
    const instructions=clean(body.instructions,300);
    const theme=clean(body.theme,60);
    const secret=clean(body.secret,300);
    const count=[20,25,30,35,40].includes(Number(body.count))?Number(body.count):30;
    const raw=Array.isArray(body.items)?body.items:[];
    const items=raw.map((x,i)=>({
      id:`q${i+1}`,
      question:clean(x.question,300),
      answer:clean(x.answer,100),
      hint:clean(x.hint,200)
    })).filter(x=>x.question&&x.answer).slice(0,60);
    const code=await freshCode();
    const teacherToken=token();
    const room={
      code,teacherToken,topic,subject,grade,instructions,count,theme,secret,items,
      status:"lobby",participants:{},progress:0,currentTurn:0,liveAnswer:"",revealedLetters:[],phase:"question",paused:false,feedback:"",hintedLetters:[],lastAnswer:"",nextPlayerName:"",version:0,createdAt:Date.now()
    };
    await save(room);
    return Response.json({code,teacherToken});
  }

  const code=clean(body.code,10);
  const room=await load(code);
  if(!room)return Response.json({error:"not_found"},{status:404});

  if(action==="join"){
    if(room.status==="finished")return Response.json({error:"finished"},{status:409});
    const name=clean(body.name,50);
    if(!name)return Response.json({error:"name"},{status:400});
    const id=token().slice(0,16);
    room.participants[id]={id,name,joinedAt:Date.now()};
    await save(room);
    return Response.json({participantId:id});
  }

  if(action==="start"){
    if(!teacherOK(room,body.token))return Response.json({error:"forbidden"},{status:403});
    if(!Object.keys(room.participants||{}).length)return Response.json({error:"אין עדיין תלמידים מחוברים"},{status:409});
    if(!(room.items||[]).length)return Response.json({error:"אין עדיין שאלות במאגר. חזרו לעריכה וטענו את המאגר לפני תחילת המשחק."},{status:409});
    room.status="playing";
    room.liveAnswer=""; room.phase="question"; room.paused=false; room.feedback=""; room.hintedLetters=[]; room.lastAnswer=""; room.nextPlayerName="";
    await save(room);
    return Response.json({
      ...publicRoom(room),
      participants:Object.values(room.participants||{}).map(p=>({id:p.id,name:p.name,joinedAt:p.joinedAt}))
    });
  }

  if(action==="typing"){
    const pid=clean(body.participantId,40);
    const players=Object.values(room.participants||{}).sort((a,b)=>a.joinedAt-b.joinedAt);
    const current=players[(room.currentTurn||0)%players.length];
    if(room.status!=="playing"||!current||current.id!==pid)return Response.json({error:"not_your_turn"},{status:409});
    room.liveAnswer=clean(body.answer,120); room.feedback="";
    await save(room);
    return Response.json({ok:true});
  }

  if(action==="letter_hint"){
    const pid=clean(body.participantId,40);
    const players=Object.values(room.participants||{}).sort((a,b)=>a.joinedAt-b.joinedAt);
    const current=players[(room.currentTurn||0)%players.length];
    const item=(room.items||[])[room.progress||0];
    if(room.status!=="playing"||room.feedback!=="wrong"||!current||current.id!==pid||!item)return Response.json({error:"hint_unavailable"},{status:409});
    const chars=item.answer.replace(/\s/g,"").split("");
    const used=new Set(room.hintedLetters||[]);
    const available=chars.map((_,i)=>i).filter(i=>!used.has(i));
    if(available.length)room.hintedLetters=[...used,available[crypto.randomInt(0,available.length)]];
    await save(room); return Response.json({hintedLetters:room.hintedLetters});
  }

  if(action==="answer"){
    const pid=clean(body.participantId,40);
    const p=room.participants?.[pid];
    if(!p)return Response.json({error:"student_not_found"},{status:404});
    if(room.status!=="playing")return Response.json({error:"not_playing"},{status:409});
    const players=Object.values(room.participants||{}).sort((a,b)=>a.joinedAt-b.joinedAt);
    const current=players[(room.currentTurn||0)%players.length];
    if(!current||current.id!==pid)return Response.json({error:"not_your_turn"},{status:409});
    const item=(room.items||[])[room.progress||0];
    if(!item)return Response.json({error:"no_question"},{status:409});
    const norm=v=>clean(v,120).toLocaleLowerCase("he-IL").replace(/[\s"'״׳.,!?;:()\-–—]/g,"");
    const correct=norm(body.answer)===norm(item.answer);
    if(!correct){room.liveAnswer=clean(body.answer,120);room.feedback="wrong";await save(room);return Response.json({correct:false,hint:item.hint});}
    room.liveAnswer=clean(body.answer,120);
    room.lastAnswer=item.answer; room.feedback="correct"; room.phase="correct"; room.hintedLetters=[];
    const letterCount=(room.secret||"").split("").filter(ch=>/[א-ת]/.test(ch)).length;
    const revealed=new Set(room.revealedLetters||[]);
    const available=Array.from({length:letterCount},(_,i)=>i).filter(i=>!revealed.has(i));
    if(available.length){
      const pick=available[crypto.randomInt(0,available.length)];
      room.revealedLetters=[...revealed,pick];
    }
    room.progress=(room.progress||0)+1;
    room.currentTurn=(room.currentTurn||0)+1;
    if(room.progress>=Math.min(room.count,room.items.length)){room.status="finished";room.phase="finished";room.liveAnswer="";}
    else {room.nextPlayerName=players[room.currentTurn%players.length]?.name||"";}
    await save(room);
    return Response.json({correct:true,progress:room.progress,status:room.status});
  }

  if(action==="advance"){
    if(!teacherOK(room,body.token))return Response.json({error:"forbidden"},{status:403});
    if(room.status==="finished")return Response.json(publicRoom(room));
    room.phase="question";room.feedback="";room.liveAnswer="";room.hintedLetters=[];room.lastAnswer="";room.nextPlayerName="";
    await save(room); return Response.json(publicRoom(room));
  }
  if(["skip","next_player","reveal","pause"].includes(action)){
    if(!teacherOK(room,body.token))return Response.json({error:"forbidden"},{status:403});
    const players=Object.values(room.participants||{}).sort((a,b)=>a.joinedAt-b.joinedAt);
    if(action==="pause"){room.paused=!room.paused;room.status=room.paused?"paused":"playing";await save(room);return Response.json(publicRoom(room));}
    if(action==="next_player"){room.currentTurn=(room.currentTurn||0)+1;room.liveAnswer="";room.feedback="";room.phase="question";await save(room);return Response.json(publicRoom(room));}
    if(action==="skip"){room.progress=(room.progress||0)+1;room.currentTurn=(room.currentTurn||0)+1;room.liveAnswer="";room.feedback="";if(room.progress>=Math.min(room.count,room.items.length)){room.status="finished";room.phase="finished"}else room.phase="question";await save(room);return Response.json(publicRoom(room));}
    if(action==="reveal"){
      const item=(room.items||[])[room.progress||0]; if(!item)return Response.json({error:"no_question"},{status:409});
      room.liveAnswer=item.answer;room.lastAnswer=item.answer;room.feedback="correct";room.phase="correct";
      const letterCount=(room.secret||"").split("").filter(ch=>/[א-ת]/.test(ch)).length, revealed=new Set(room.revealedLetters||[]), available=Array.from({length:letterCount},(_,i)=>i).filter(i=>!revealed.has(i));
      if(available.length)room.revealedLetters=[...revealed,available[crypto.randomInt(0,available.length)]];
      room.progress=(room.progress||0)+1;room.currentTurn=(room.currentTurn||0)+1;
      if(room.progress>=Math.min(room.count,room.items.length)){room.status="finished";room.phase="finished";room.liveAnswer=""}else{room.phase="transition";room.nextPlayerName=players[room.currentTurn%players.length]?.name||""}
      await save(room);return Response.json(publicRoom(room));
    }
  }

  return Response.json({error:"action"},{status:400});
}
