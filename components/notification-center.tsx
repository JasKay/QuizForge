"use client";
import { type CSSProperties, useCallback, useEffect, useState } from "react";
import { BellRing, Swords, Users, ShieldCheck } from "lucide-react";
type Settings = {show_online:boolean;challenge_alerts:boolean;practice_frequency:string;practice_hour:number;timezone:string};
type Player = {id:string;name:string};
type Invite = {id:string;sender_name:string};
type Match = {id:string;room_code:string;sender_name:string;recipient_name:string};
type FeedbackItem = {id:string;sender_name:string;message:string;created_at:string};
const base:Settings = {show_online:false,challenge_alerts:true,practice_frequency:"off",practice_hour:18,timezone:"UTC"};
export function NotificationCenter() {
 const [settings,setSettings]=useState<Settings>(base);
 const [online,setOnline]=useState<Player[]>([]);
 const [invites,setInvites]=useState<Invite[]>([]);
 const [matches,setMatches]=useState<Match[]>([]);
 const [status,setStatus]=useState("");
 const [signedIn,setSignedIn]=useState(false);
 const [feedbackInbox,setFeedbackInbox]=useState<FeedbackItem[]>([]);
 const [isFeedbackOwner,setIsFeedbackOwner]=useState(false);
 const load=useCallback(async()=>{
  try {
   const r=await fetch("/api/notification-center",{cache:"no-store"});
   if(r.status===401){setSignedIn(false);return;}
   if(!r.ok){setStatus("Notifications are not available yet.");return;}
   const data=await r.json();setSignedIn(true);setSettings(data.settings);setOnline(data.online);setInvites(data.invites);setMatches(data.matches||[]);setStatus("");
  }catch{setStatus("Unable to connect to notifications.");}
 },[]);
 const loadFeedback=useCallback(async()=>{try{const r=await fetch("/api/feedback",{cache:"no-store"});if(!r.ok)return;const data=await r.json();setIsFeedbackOwner(data.isOwner===true);setFeedbackInbox(data.feedback||[]);}catch{}},[]);
 useEffect(()=>{void load();void loadFeedback();const t=setInterval(()=>{if(document.visibilityState==="visible"){void load();void loadFeedback();}},30000);return()=>clearInterval(t);},[load,loadFeedback]);
 useEffect(()=>{if(!signedIn)return;const heartbeat=()=>{if(document.visibilityState==="visible")void fetch("/api/notification-center",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"heartbeat"})}).catch(()=>{});};heartbeat();const t=setInterval(heartbeat,60000);return()=>clearInterval(t);},[signedIn]);
 async function act(data:Record<string,unknown>){try{const r=await fetch("/api/notification-center",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});const body=await r.json();if(!r.ok){setStatus(body.error||"Please try again.");return false;}await load();return true;}catch{setStatus("Unable to save. Please try again.");return false;}}
 async function acceptInvite(inviteId:string){
  setStatus("Creating your duel room…");
  try {
   const response=await fetch("/api/rooms",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"create",name:"Challenger",title:"Buzzer Duel",count:10,seconds:30,correct:10,incorrect:0})});
   const data=await response.json();
   if(!response.ok || !data.room?.code){setStatus(data.error||"Unable to create a duel room.");return;}
   const code=String(data.room.code);
   const accepted=await act({action:"respond",inviteId,response:"accepted",roomCode:code});
   if(accepted)setStatus("Duel ready! Open Play and join room "+code);
  }catch{setStatus("Unable to create your duel. Try again.");}
 }
 async function save(next:Settings){setSettings(next);await act({action:"settings",showOnline:next.show_online,challengeAlerts:next.challenge_alerts,frequency:next.practice_frequency,hour:next.practice_hour,timezone:next.timezone});}
 const toggleStyle: CSSProperties = {width:32,height:18,accentColor:"#d7fa52",cursor:"pointer",flexShrink:0};
 const preferenceStyle: CSSProperties = {display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",padding:"7px 9px",background:"#ffffff06",border:"1px solid #ffffff10",borderRadius:10,minHeight:38};
 if(!signedIn)return <div style={{marginTop:13,padding:13,border:"1px solid #ffffff20",borderRadius:15,background:"#ffffff08",fontSize:12,color:"#d0d8d1",lineHeight:1.5}}><BellRing size={17} color="#d7fa52" style={{display:"inline",verticalAlign:"middle",marginRight:7}}/> Sign in to see live players, challenges and saved notification preferences.</div>;
 return <section aria-label="Notification centre" style={{marginTop:14,padding:13,border:"1px solid #ffffff18",borderRadius:17,background:"linear-gradient(145deg,#ffffff0c,#ffffff05)",fontSize:13}}>
  <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:12}}><span style={{display:"grid",placeItems:"center",width:32,height:32,borderRadius:11,background:"#d7fa5218",color:"#d7fa52"}}><BellRing size={16}/></span><strong style={{flex:1,fontSize:14}}>Notification centre</strong>{invites.length>0&&<span aria-label={`${invites.length} new challenges`} style={{minWidth:22,height:22,padding:"0 6px",display:"grid",placeItems:"center",borderRadius:99,background:"#d7fa52",color:"#191d1a",fontSize:11,fontWeight:800}}>{invites.length}</span>}</div>
  {invites.length>0 && <div style={{marginBottom:11}}>{invites.map(i=><div key={i.id} style={{padding:11,background:"#d7fa5210",border:"1px solid #d7fa5240",borderRadius:13,marginBottom:8}}><div style={{fontSize:12,color:"#eaf0e9"}}><strong>{i.sender_name}</strong> challenged you</div><div style={{display:"flex",gap:7,marginTop:10}}><button onClick={()=>void acceptInvite(i.id)} style={{padding:"8px 12px",borderRadius:9,background:"#d7fa52",color:"#191d1a",border:0,fontWeight:750,cursor:"pointer"}}>Accept challenge</button><button onClick={()=>void act({action:"respond",inviteId:i.id,response:"declined"})} style={{padding:"8px 12px",borderRadius:9,background:"#ffffff08",color:"white",border:"1px solid #ffffff30",cursor:"pointer"}}>Decline</button></div></div>)}</div>}
  {matches.length>0 && <div style={{marginBottom:11}}><strong style={{fontSize:12,color:"#d7fa52"}}>Ready to play</strong>{matches.map(m=><div key={m.id} style={{padding:11,background:"#ffffff08",border:"1px solid #ffffff16",borderRadius:12,marginTop:7}}><div>{m.sender_name} vs {m.recipient_name}</div><div style={{marginTop:5,color:"#c7d0c8"}}>Room code: <strong style={{color:"#d7fa52",letterSpacing:2}}>{m.room_code}</strong></div><a href="/play" style={{display:"inline-block",marginTop:8,color:"#d7fa52",fontWeight:700,textDecoration:"none"}}>Open Play to join →</a></div>)}</div>}
  <div style={{display:"grid",gap:5}}>
   <label style={preferenceStyle}><span style={{display:"flex",alignItems:"center",gap:7,fontSize:12,fontWeight:650}}><ShieldCheck size={14} color="#d7fa52"/> Show me as online</span><input aria-label="Show me as online" type="checkbox" style={toggleStyle} checked={settings.show_online} onChange={e=>void save({...settings,show_online:e.target.checked})}/></label>
   <label style={preferenceStyle}><span style={{display:"flex",alignItems:"center",gap:7,fontSize:12,fontWeight:650}}><BellRing size={14} color="#d7fa52"/> Allow challenge alerts</span><input aria-label="Allow challenge alerts" type="checkbox" style={toggleStyle} checked={settings.challenge_alerts} onChange={e=>void save({...settings,challenge_alerts:e.target.checked})}/></label>
  </div>
  <div style={{marginTop:10,display:"flex",alignItems:"center",gap:6,fontWeight:750,fontSize:12}}><Users size={14} color="#d7fa52"/> Available to challenge</div>
  {online.length===0?<div style={{marginTop:6,padding:"9px",textAlign:"center",background:"#ffffff05",borderRadius:10,fontSize:11,color:"#aeb9af"}}>No one’s online right now</div>:online.map(p=><div key={p.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginTop:7,padding:"7px 9px",background:"#ffffff08",borderRadius:10}}><span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}><span style={{color:"#d7fa52",marginRight:6}}>●</span> {p.name}</span><button onClick={()=>void act({action:"invite",recipientId:p.id})} style={{display:"flex",gap:5,alignItems:"center",padding:"6px 8px",borderRadius:8,border:0,background:"#d7fa52",color:"#191d1a",fontWeight:750,flexShrink:0,cursor:"pointer"}}><Swords size={12}/> Challenge</button></div>)}
  {isFeedbackOwner&&<details style={{marginTop:11,borderTop:"1px solid #ffffff14",paddingTop:9}}><summary style={{fontSize:11,fontWeight:700,cursor:"pointer",color:"#d7fa52"}}>Player suggestions {feedbackInbox.length?`(${feedbackInbox.length})`:""}</summary><div style={{display:"grid",gap:6,marginTop:7}}>{feedbackInbox.length?feedbackInbox.map(item=><article key={item.id} style={{padding:8,borderRadius:9,background:"#ffffff08",fontSize:11}}><p style={{margin:0,lineHeight:1.45}}>{item.message}</p><small style={{display:"block",marginTop:5,color:"#aeb9af"}}>{item.sender_name} · {new Date(item.created_at).toLocaleDateString()}</small></article>):<small style={{color:"#aeb9af"}}>No suggestions yet.</small>}</div></details>}
  {status&&<p role="status" style={{fontSize:12,color:"#ffd2b4"}}>{status}</p>}
 </section>;
}
