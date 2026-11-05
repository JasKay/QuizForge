"use client";
import { useEffect, useState } from "react";
import { Bell, Download, X } from "lucide-react";
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
export function PwaEnhancements() {
  const [install, setInstall] = useState<InstallPrompt | null>(null);
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    setPermission("Notification" in window ? Notification.permission : "unsupported");
    const standalone = window.matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && (navigator as Navigator & {standalone?:boolean}).standalone);
    setIos(/iPad|iPhone|iPod/.test(navigator.userAgent) && !standalone);
    setVisible(!standalone && sessionStorage.getItem("buzzer-pwa-dismissed") !== "yes");
    const onInstall = (event: Event) => { event.preventDefault(); setInstall(event as InstallPrompt); };
    window.addEventListener("beforeinstallprompt", onInstall);
    return () => window.removeEventListener("beforeinstallprompt", onInstall);
  }, []);
  if (!visible || (!install && !ios && permission === "unsupported")) return null;
  return <aside aria-label="Buzzer app options" style={{position:"fixed",right:16,bottom:16,zIndex:80,maxWidth:330,width:"calc(100% - 32px)",padding:18,background:"#191d1a",color:"#f7f6f0",borderRadius:20,boxShadow:"0 14px 45px #0004",fontFamily:"inherit"}}>
    <button aria-label="Dismiss app options" onClick={() => {setVisible(false);sessionStorage.setItem("buzzer-pwa-dismissed","yes");}} style={{position:"absolute",right:12,top:12,background:"transparent",color:"inherit",border:0,cursor:"pointer"}}><X size={18}/></button>
    <strong style={{fontSize:17}}>Take Buzzer with you</strong>
    <p style={{fontSize:13,opacity:.8,lineHeight:1.5,margin:"8px 0 12px"}}>Keep learning from your home screen. No app store needed.</p>
    {install && <button onClick={async()=>{await install.prompt();await install.userChoice;setInstall(null);}} style={{display:"flex",alignItems:"center",gap:8,border:0,borderRadius:12,padding:"10px 14px",background:"#d7fa52",color:"#191d1a",fontWeight:700,cursor:"pointer"}}><Download size={16}/> Install Buzzer</button>}
    {ios && <p style={{fontSize:12,lineHeight:1.5}}>On iPhone: tap Share in Safari, then <strong>Add to Home Screen</strong>.</p>}
    {permission === "default" && <button onClick={async()=>{const value=await Notification.requestPermission();setPermission(value);if(value==="granted"){const registration=await navigator.serviceWorker.ready;await registration.showNotification("You're all set for Buzzer!",{body:"Come back to practise a few questions.",icon:"/icon.svg"});}}} style={{display:"flex",alignItems:"center",gap:8,marginTop:10,border:"1px solid #ffffff50",borderRadius:12,padding:"9px 12px",background:"transparent",color:"inherit",cursor:"pointer"}}><Bell size={16}/> Enable notifications</button>}
    {permission === "granted" && <p style={{fontSize:12,opacity:.7,marginTop:8}}>Notifications enabled. Scheduled reminders are not active yet.</p>}
  </aside>;
}
