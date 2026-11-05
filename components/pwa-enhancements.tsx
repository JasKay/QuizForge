"use client";
import { useEffect, useState } from "react";
import { Bell, Download, X, PlayCircle } from "lucide-react";
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
export function PwaEnhancements() {
  const [install, setInstall] = useState<InstallPrompt | null>(null);
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [step, setStep] = useState(0);
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
    setInstalled(Boolean(standalone));
    const open = () => { setVisible(true); setGuide(false); setStep(0); };
    window.addEventListener("buzzer:open-install", open);
    const close = () => window.removeEventListener("buzzer:open-install", open);
    setVisible(false);
    const onInstall = (event: Event) => { event.preventDefault(); setInstall(event as InstallPrompt); };
    window.addEventListener("beforeinstallprompt", onInstall);
    return () => { window.removeEventListener("beforeinstallprompt", onInstall); close(); };
  }, []);
  if (!visible) return null;
  return <aside aria-label="Buzzer app options" style={{position:"fixed",right:16,top:76,zIndex:100,maxWidth:350,width:"calc(100% - 32px)",padding:18,background:"#191d1a",color:"#f7f6f0",borderRadius:20,boxShadow:"0 14px 45px #0004",fontFamily:"inherit"}}>
    <button aria-label="Dismiss app options" onClick={() => {setVisible(false);}} style={{position:"absolute",right:12,top:12,background:"transparent",color:"inherit",border:0,cursor:"pointer"}}><X size={18}/></button>
    <div style={{display:"flex",alignItems:"center",gap:10}}><img src="/icon.svg" alt="" width={44} height={44} style={{borderRadius:12}}/><strong style={{fontSize:17}}>Take Buzzer with you</strong></div>
    <p style={{fontSize:13,opacity:.8,lineHeight:1.5,margin:"8px 0 12px"}}>{installed ? "You already have Buzzer installed. Manage your practice reminders here." : "Add Buzzer to your home screen in a few taps. No app store needed."}</p>
    {!installed && install && <button onClick={async()=>{await install.prompt();await install.userChoice;setInstall(null);}} style={{display:"flex",alignItems:"center",gap:8,border:0,borderRadius:12,padding:"10px 14px",background:"#d7fa52",color:"#191d1a",fontWeight:700,cursor:"pointer"}}><Download size={16}/> Install Buzzer</button>}
    {!installed && <button onClick={()=>{setGuide(!guide);setStep(0);}} style={{display:"flex",alignItems:"center",gap:8,marginTop:10,border:"1px solid #ffffff50",borderRadius:12,padding:"9px 12px",background:"transparent",color:"inherit",cursor:"pointer"}}><PlayCircle size={16}/> {guide ? "Hide" : "Show"} installation steps</button>}
    {!installed && guide && <div style={{marginTop:12,padding:16,background:"#344338",borderRadius:14}}>
      <div style={{fontSize:11,color:"#d7fa52",fontWeight:800,letterSpacing:1}}>STEP {step+1} OF 3</div>
      <div style={{fontSize:17,fontWeight:750,marginTop:8}}>{(ios ? ["Open Buzzer in Safari","Tap the Share icon","Scroll down and tap Add to Home Screen"] : ["Open Buzzer in Chrome","Tap the three-dot menu","Tap Install app or Add to Home screen"])[step]}</div>
      <p style={{fontSize:12,lineHeight:1.5,opacity:.8}}>{(ios ? ["Use Safari rather than an in-app browser.","The Share icon is a square with an upward arrow, usually at the bottom of Safari.","If you don't see it, scroll the Share sheet down. Tap Add to confirm."] : ["Use Chrome on your Android phone.","Find the three dots in the browser toolbar.","Confirm Install. Buzzer will appear on your home screen."])[step]}</p>
      <div style={{display:"flex",gap:6,margin:"14px 0"}}>{[0,1,2].map(n=><div key={n} style={{height:5,flex:1,borderRadius:6,background:n<=step?"#d7fa52":"#ffffff44"}}/>)}</div>
      <div style={{display:"flex",justifyContent:"space-between",gap:8}}><button disabled={step===0} onClick={()=>setStep(s=>Math.max(0,s-1))} style={{padding:"8px 12px",borderRadius:8,border:"1px solid #ffffff55",background:"transparent",color:"white",opacity:step===0?.4:1}}>Back</button><button onClick={()=>step===2?setGuide(false):setStep(s=>s+1)} style={{padding:"8px 14px",borderRadius:8,border:0,background:"#d7fa52",color:"#191d1a",fontWeight:750}}>{step===2?"Done":"Next step"}</button></div>
    </div>}
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
