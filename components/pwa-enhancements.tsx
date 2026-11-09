"use client";
import { type FormEvent, useEffect, useState } from "react";
import { Bell, Download, X, PlayCircle, Mail, Sparkles, Send, Check } from "lucide-react";
import { NotificationCenter } from "@/components/notification-center";
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
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState("");
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
  async function sendFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (feedbackSending || feedbackMessage.trim().length < 3) return;
    setFeedbackSending(true);
    setFeedbackStatus("");
    try {
      const response = await fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: feedbackMessage.trim() }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Couldn’t send that just now. Try again.");
      setFeedbackMessage("");
      setFeedbackStatus("Thanks. Your suggestion is in.");
    } catch (error) {
      setFeedbackStatus(error instanceof Error ? error.message : "Couldn’t send that just now. Try again.");
    } finally {
      setFeedbackSending(false);
    }
  }
  return <aside aria-label="Buzzer app options" style={{position:"fixed",right:16,top:76,zIndex:100,maxWidth:380,width:"calc(100% - 32px)",maxHeight:"calc(100dvh - 92px)",overflowY:"auto",padding:16,background:"linear-gradient(155deg,#202820 0%,#151a17 76%)",color:"#f7f6f0",border:"1px solid #ffffff20",borderRadius:22,boxShadow:"0 20px 60px #0007,0 2px 12px #0003",fontFamily:"inherit",backdropFilter:"blur(18px)"}}>
    <button aria-label="Dismiss app options" onClick={() => {setVisible(false);}} style={{position:"absolute",right:12,top:12,width:34,height:34,display:"grid",placeItems:"center",background:"#ffffff12",color:"inherit",border:"1px solid #ffffff12",borderRadius:11,cursor:"pointer"}}><X size={18}/></button>
    <div style={{display:"flex",alignItems:"center",gap:12,padding:"4px 38px 12px 2px"}}><img src="/icon.svg" alt="" width={48} height={48} style={{borderRadius:14,boxShadow:"0 5px 18px #d7fa5230"}}/><div><div style={{fontSize:10,fontWeight:800,letterSpacing:1.2,textTransform:"uppercase",color:"#d7fa52",marginBottom:3}}>Buzzer · stay in the game</div><strong style={{fontSize:18,letterSpacing:-.3}}>Take Buzzer with you</strong></div></div>
    <p style={{fontSize:13,color:"#d0d8d1",lineHeight:1.55,margin:"0 0 14px"}}>{installed ? "You already have Buzzer installed. Manage your practice reminders here." : "Add Buzzer to your home screen in a few taps. No app store needed."}</p>
    {!installed && install && <button onClick={async()=>{await install.prompt();await install.userChoice;setInstall(null);}} style={{display:"flex",alignItems:"center",gap:8,border:0,borderRadius:12,padding:"10px 14px",background:"#d7fa52",color:"#191d1a",fontWeight:700,cursor:"pointer"}}><Download size={16}/> Install Buzzer</button>}
    {!installed && <button onClick={()=>{setGuide(!guide);setStep(0);}} style={{display:"flex",alignItems:"center",gap:8,marginTop:10,border:"1px solid #ffffff50",borderRadius:12,padding:"9px 12px",background:"transparent",color:"inherit",cursor:"pointer"}}><PlayCircle size={16}/> {guide ? "Hide" : "Show"} installation steps</button>}
    {!installed && guide && <div style={{marginTop:12,padding:16,background:"#344338",borderRadius:14}}>
      <div style={{fontSize:11,color:"#d7fa52",fontWeight:800,letterSpacing:1}}>STEP {step+1} OF 3</div>
      <div style={{fontSize:17,fontWeight:750,marginTop:8}}>{(ios ? ["Open Buzzer in Safari","Tap the Share icon","Scroll down and tap Add to Home Screen"] : ["Open Buzzer in Chrome","Tap the three-dot menu","Tap Install app or Add to Home screen"])[step]}</div>
      <p style={{fontSize:12,lineHeight:1.5,opacity:.8}}>{(ios ? ["Use Safari rather than an in-app browser.","The Share icon is a square with an upward arrow, usually at the bottom of Safari.","If you don't see it, scroll the Share sheet down. Tap Add to confirm."] : ["Use Chrome on your Android phone.","Find the three dots in the browser toolbar.","Confirm Install. Buzzer will appear on your home screen."])[step]}</p>
      <div style={{display:"flex",gap:6,margin:"14px 0"}}>{[0,1,2].map(n=><div key={n} style={{height:5,flex:1,borderRadius:6,background:n<=step?"#d7fa52":"#ffffff44"}}/>)}</div>
      <div style={{display:"flex",justifyContent:"space-between",gap:8}}><button disabled={step===0} onClick={()=>setStep(s=>Math.max(0,s-1))} style={{padding:"8px 12px",borderRadius:8,border:"1px solid #ffffff55",background:"transparent",color:"white",opacity:step===0?.4:1}}>Back</button><button onClick={()=>step===2?setGuide(false):setStep(s=>s+1)} style={{padding:"8px 14px",borderRadius:8,border:0,background:"#d7fa52",color:"#191d1a",fontWeight:750}}>{step===2?"Done":"Next step"}</button></div>
    </div>}
    <button onClick={()=>setReminders(!reminders)} style={{display:"flex",alignItems:"center",gap:9,marginTop:10,width:"100%",border:"1px solid #ffffff24",borderRadius:13,padding:"11px 12px",background:"#ffffff08",color:"inherit",fontWeight:650,textAlign:"left",cursor:"pointer"}}><span style={{display:"grid",placeItems:"center",width:30,height:30,borderRadius:10,background:"#d7fa5218",color:"#d7fa52"}}><Bell size={16}/></span><span style={{flex:1}}>Choose practice reminders</span><span aria-hidden="true" style={{fontSize:18,color:"#aab3aa"}}>{reminders?"−":"+"}</span></button>
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
    <NotificationCenter />
    {permission === "granted" && <p style={{fontSize:10,color:"#aeb9af",lineHeight:1.4,margin:"8px 2px 0"}}><span style={{color:"#d7fa52"}}>●</span> Push on · scheduled reminders coming soon</p>}
    <button onClick={()=>{setFeedbackOpen(!feedbackOpen);setFeedbackStatus("");}} aria-expanded={feedbackOpen} style={{display:"flex",alignItems:"center",gap:9,marginTop:12,width:"100%",padding:"9px 10px",border:"1px solid #d7fa5238",borderRadius:12,background:"#d7fa520c",color:"inherit",textAlign:"left",cursor:"pointer"}}>
      <span style={{display:"grid",placeItems:"center",width:30,height:30,borderRadius:9,background:"#d7fa52",color:"#191d1a",flexShrink:0}}><Mail size={15}/></span><span style={{flex:1,fontSize:12,fontWeight:700}}><Sparkles size={12} color="#d7fa52" style={{verticalAlign:"-2px",marginRight:5}}/>Suggest an improvement</span><span aria-hidden="true" style={{color:"#d7fa52",fontSize:15}}>{feedbackOpen?"−":"+"}</span>
    </button>
    {feedbackOpen && <form onSubmit={sendFeedback} style={{display:"grid",gap:8,marginTop:7,padding:10,borderRadius:12,background:"#ffffff08",border:"1px solid #ffffff14"}}>
      <label htmlFor="buzzer-feedback" style={{fontSize:11,color:"#c7d0c8"}}>What should we improve?</label>
      <textarea id="buzzer-feedback" value={feedbackMessage} onChange={e=>setFeedbackMessage(e.target.value.slice(0,500))} maxLength={500} rows={3} required minLength={3} placeholder="Share your idea…" style={{width:"100%",resize:"vertical",boxSizing:"border-box",padding:9,border:"1px solid #ffffff22",borderRadius:9,background:"#101512",color:"#f7f6f0",font:"inherit",fontSize:12,lineHeight:1.45}}/>
      <div style={{display:"flex",alignItems:"center",gap:8}}><button type="submit" disabled={feedbackSending||feedbackMessage.trim().length<3} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 10px",border:0,borderRadius:8,background:"#d7fa52",color:"#191d1a",fontSize:11,fontWeight:750,cursor:feedbackSending?"wait":"pointer",opacity:feedbackMessage.trim().length<3?.55:1}}>{feedbackStatus.startsWith("Thanks")?<Check size={13}/>:<Send size={13}/>} {feedbackSending?"Sending…":"Send suggestion"}</button><span role="status" style={{fontSize:10,color:feedbackStatus.startsWith("Thanks")?"#d7fa52":"#f0bda6"}}>{feedbackStatus}</span></div>
    </form>}
  </aside>;
}
