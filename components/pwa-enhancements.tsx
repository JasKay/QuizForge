"use client";
import { useEffect, useState } from "react";
import { Bell, Download, X, PlayCircle } from "lucide-react";
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
export function PwaEnhancements() {
  const [install, setInstall] = useState<InstallPrompt | null>(null);
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);
  const [guide, setGuide] = useState(false);
  const [frequency, setFrequency] = useState("off");
  const [hour, setHour] = useState("18");
  const [reminders, setReminders] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    setPermission("Notification" in window ? Notification.permission : "unsupported");
    try { const saved = JSON.parse(localStorage.getItem("buzzer-reminders") || "{}"); setFrequency(saved.frequency || "off"); setHour(saved.hour || "18"); } catch {}
    const standalone = window.matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && (navigator as Navigator & {standalone?:boolean}).standalone);
    setIos(/iPad|iPhone|iPod/.test(navigator.userAgent) && !standalone);
    setVisible(!standalone && sessionStorage.getItem("buzzer-pwa-dismissed") !== "yes");
    const onInstall = (event: Event) => { event.preventDefault(); setInstall(event as InstallPrompt); };
    window.addEventListener("beforeinstallprompt", onInstall);
    return () => window.removeEventListener("beforeinstallprompt", onInstall);
  }, []);
  if (!visible) return null;
  return <aside aria-label="Buzzer app options" style={{position:"fixed",right:16,bottom:16,zIndex:80,maxWidth:330,width:"calc(100% - 32px)",padding:18,background:"#191d1a",color:"#f7f6f0",borderRadius:20,boxShadow:"0 14px 45px #0004",fontFamily:"inherit"}}>
    <button aria-label="Dismiss app options" onClick={() => {setVisible(false);sessionStorage.setItem("buzzer-pwa-dismissed","yes");}} style={{position:"absolute",right:12,top:12,background:"transparent",color:"inherit",border:0,cursor:"pointer"}}><X size={18}/></button>
    <div style={{display:"flex",alignItems:"center",gap:10}}><img src="/icon.svg" alt="" width={44} height={44} style={{borderRadius:12}}/><strong style={{fontSize:17}}>Take Buzzer with you</strong></div>
    <p style={{fontSize:13,opacity:.8,lineHeight:1.5,margin:"8px 0 12px"}}>Keep learning from your home screen. No app store needed.</p>
    {install && <button onClick={async()=>{await install.prompt();await install.userChoice;setInstall(null);}} style={{display:"flex",alignItems:"center",gap:8,border:0,borderRadius:12,padding:"10px 14px",background:"#d7fa52",color:"#191d1a",fontWeight:700,cursor:"pointer"}}><Download size={16}/> Install Buzzer</button>}
    <button onClick={()=>setGuide(!guide)} style={{display:"flex",alignItems:"center",gap:8,marginTop:10,border:"1px solid #ffffff50",borderRadius:12,padding:"9px 12px",background:"transparent",color:"inherit",cursor:"pointer"}}><PlayCircle size={16}/> {guide ? "Hide" : "Watch"} 10-second install guide</button>
    {guide && <div style={{marginTop:10,padding:14,background:"#344338",borderRadius:12}}><div style={{fontWeight:700}}>Install Buzzer on your phone</div><p style={{fontSize:13,lineHeight:1.6}}>{ios ? "Safari → Share → Add to Home Screen → Add" : "Chrome → Menu → Add to Home screen / Install app → Install"}</p><div style={{height:4,background:"#ffffff44",borderRadius:4}}><div style={{height:4,background:"#d7fa52",animation:"buzzer-install-10s 10s linear forwards"}}/></div><style>{`@keyframes buzzer-install-10s {from {width:0} to {width:100%}}`}</style></div>}
    {ios && <p style={{fontSize:12,lineHeight:1.5}}>On iPhone: tap Share in Safari, then <strong>Add to Home Screen</strong>.</p>}
    <button onClick={()=>setReminders(!reminders)} style={{display:"flex",alignItems:"center",gap:8,marginTop:10,border:"1px solid #ffffff50",borderRadius:12,padding:"9px 12px",background:"transparent",color:"inherit",cursor:"pointer"}}><Bell size={16}/> Choose practice reminders</button>
    {reminders && <div style={{marginTop:10,padding:12,borderRadius:12,background:"#344338",display:"grid",gap:8,fontSize:13}}>
      <label htmlFor="buzzer-frequency">How often?</label>
      <select id="buzzer-frequency" value={frequency} onChange={e=>setFrequency(e.target.value)} style={{padding:8,borderRadius:8,color:"#191d1a"}}>
        <option value="off">No reminders</option><option value="daily">Every day</option><option value="weekdays">Weekdays</option><option value="weekly">Once a week</option>
      </select>
      <label htmlFor="buzzer-hour">Preferred local hour</label>
      <select id="buzzer-hour" value={hour} onChange={e=>setHour(e.target.value)} style={{padding:8,borderRadius:8,color:"#191d1a"}}>
        {Array.from({length:24},(_,h)=><option key={h} value={String(h)}>{String(h).padStart(2,"0")}:00</option>)}
      </select>
      <button onClick={async()=>{if(frequency!=="off" && permission==="default"){const result=await Notification.requestPermission();setPermission(result);}localStorage.setItem("buzzer-reminders",JSON.stringify({frequency,hour}));setReminders(false);}} style={{padding:10,borderRadius:9,border:0,background:"#d7fa52",color:"#191d1a",fontWeight:700,cursor:"pointer"}}>Save preferences</button>
      <small style={{lineHeight:1.5,opacity:.8}}>Saved on this device. Scheduled push delivery is not yet active; this does not schedule a notification.</small>
    </div>}
    {permission === "default" && <button onClick={async()=>{const value=await Notification.requestPermission();setPermission(value);if(value==="granted"){const registration=await navigator.serviceWorker.ready;await registration.showNotification("You're all set for Buzzer!",{body:"Come back to practise a few questions.",icon:"/icon.svg"});}}} style={{display:"flex",alignItems:"center",gap:8,marginTop:10,border:"1px solid #ffffff50",borderRadius:12,padding:"9px 12px",background:"transparent",color:"inherit",cursor:"pointer"}}><Bell size={16}/> Enable notifications</button>}
    {permission === "granted" && <p style={{fontSize:12,opacity:.7,marginTop:8}}>Notifications enabled. Scheduled reminders are not active yet.</p>}
  </aside>;
}
