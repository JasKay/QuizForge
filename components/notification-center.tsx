"use client";
import { useCallback, useEffect, useState } from "react";
import { BellRing, Swords, Users, ShieldCheck } from "lucide-react";
type Settings = {show_online:boolean;challenge_alerts:boolean;practice_frequency:string;practice_hour:number;timezone:string};
type Player = {id:string;name:string};
type Invite = {id:string;sender_name:string};
type Match = {id:string;room_code:string;sender_name:string;recipient_name:string};
const base:Settings = {show_online:false,challenge_alerts:true,practice_frequency:"off",practice_hour:18,timezone:"UTC"};
export function NotificationCenter() {
 const [settings,setSettings]=useState<Settings>(base);
 const [online,setOnline]=useState<Player[]>([]);
 const [invites,setInvites]=useState<Invite[]>([]);
 const [matches,setMatches]=useState<Match[]>([]);
 const [status,setStatus]=useState("");
 const [signedIn,setSignedIn]=useState(false);
 const load=useCallback(async()=>{
  try {
   const r=await fetch("/api/notification-center",{cache:"no-store"});
   if(r.status===401){setSignedIn(false);return;}
   if(!r.ok){setStatus("Notifications are not available yet.");return;}
   const data=await r.json();setSignedIn(true);setSettings(data.settings);setOnline(data.online);setInvites(data.invites);setMatches(data.matches||[]);setStatus("");
  }catch{setStatus("Unable to connect to notifications.");}
 },[]);
 useEffect(()=>{void load();const t=setInterval(()=>{if(document.visibilityState==="visible")void load();},30000);return()=>clearInterval(t);},[load]);
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
 if(!signedIn)return <div style={{marginTop:14,padding:12,border:"1px solid #ffffff30",borderRadius:12,fontSize:13}}><BellRing size={17} style={{display:"inline",verticalAlign:"middle",marginRight:6}}/> Sign in to see live players, challenges and saved notification preferences.</div>;
 return <section aria-label="Notification centre" style={{marginTop:16,borderTop:"1px solid #ffffff30",paddingTop:14,fontSize:13}}>
  <strong style={{display:"flex",gap:8,alignItems:"center"}}><BellRing size={16}/> Notification centre {invites.length>0?`(${invites.length})`:""}</strong>
  {invites.length>0 && <div style={{marginTop:12}}>{invites.map(i=><div key={i.id} style={{padding:10,background:"#364735",borderRadius:10,marginBottom:8}}><strong>{i.sender_name}</strong> challenged you!<div style={{display:"flex",gap:8,marginTop:8}}><button onClick={()=>void acceptInvite(i.id)} style={{padding:8,borderRadius:8,background:"#d7fa52",color:"#191d1a",border:0}}>Accept</button><button onClick={()=>void act({action:"respond",inviteId:i.id,response:"declined"})} style={{padding:8,borderRadius:8,background:"transparent",color:"white",border:"1px solid #ffffff55"}}>Decline</button></div></div>)}</div>}
  {matches.length>0 && <div style={{marginTop:12}}><strong>Ready to play</strong>{matches.map(m=><div key={m.id} style={{padding:10,background:"#364735",borderRadius:10,marginTop:8}}><div>{m.sender_name} vs {m.recipient_name}</div><div style={{marginTop:5}}>Room code: <strong style={{color:"#d7fa52",letterSpacing:2}}>{m.room_code}</strong></div><a href="/play" style={{display:"inline-block",marginTop:8,color:"#d7fa52",textDecoration:"underline"}}>Open Play to join</a></div>)}</div>}
  <label style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",marginTop:12}}><span><ShieldCheck size={15} style={{display:"inline",verticalAlign:"middle",marginRight:6}}/> Show me as online</span><input type="checkbox" checked={settings.show_online} onChange={e=>void save({...settings,show_online:e.target.checked})}/></label>
  <label style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",marginTop:12}}><span>Allow challenge alerts</span><input type="checkbox" checked={settings.challenge_alerts} onChange={e=>void save({...settings,challenge_alerts:e.target.checked})}/></label>
  <div style={{marginTop:14,display:"flex",alignItems:"center",gap:7,fontWeight:700}}><Users size={16}/> Available to challenge</div>
  {online.length===0?<p style={{opacity:.75,fontSize:12}}>No players currently sharing their online status.</p>:online.map(p=><div key={p.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginTop:8}}><span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}><span style={{color:"#d7fa52"}}>●</span> {p.name}</span><button onClick={()=>void act({action:"invite",recipientId:p.id})} style={{display:"flex",gap:4,alignItems:"center",padding:7,borderRadius:8,border:0,background:"#d7fa52",color:"#191d1a",fontWeight:700,flexShrink:0}}><Swords size={13}/> Challenge</button></div>)}
  <p style={{fontSize:11,opacity:.7,lineHeight:1.5,marginTop:12}}>Online means active in the last 2 minutes and opted in. Invitations are delivered in-app while the recipient is online. Accepting creates a room. Open Play and enter its room code to join.</p>
  {status&&<p role="status" style={{fontSize:12,color:"#ffd2b4"}}>{status}</p>}
 </section>;
}
