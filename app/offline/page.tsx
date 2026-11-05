export default function Offline() {
  return <main style={{minHeight:"100dvh",display:"grid",placeItems:"center",background:"#f7f6f0",color:"#191d1a",fontFamily:"system-ui",padding:24}}>
    <section style={{maxWidth:420,textAlign:"center"}}>
      <div style={{fontSize:56,fontWeight:900,letterSpacing:"-.06em"}}>Buzzer<span style={{color:"#7e9e17"}}>!</span></div>
      <h1 style={{fontSize:28,marginTop:24}}>You're offline.</h1>
      <p style={{lineHeight:1.6}}>Reconnect to continue your learning trails or join a live match. Your account and competition data stay protected.</p>
      <a href="/" style={{display:"inline-block",background:"#191d1a",color:"white",borderRadius:14,padding:"14px 24px",marginTop:16}}>Try again</a>
    </section>
  </main>;
}
