import { database } from "@/lib/server/db";
import { requireUser, readAction, apiError, AppError, privateHeaders } from "@/lib/server/account";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const json = (data: unknown) => Response.json(data, { headers: privateHeaders });
export async function GET(request: Request) {
 try {
  const user = await requireUser(request);
  const db = database();
  const [settings, online, invites, matches] = await Promise.all([
   db.query("select show_online,challenge_alerts,practice_frequency,practice_hour,timezone from buzzer.notification_settings where user_id=$1",[user.id]),
   db.query("select u.id,u.name from buzzer.presence p join buzzer.notification_settings s on s.user_id=p.user_id and s.show_online=true join public.buzzer_user u on u.id=p.user_id where p.user_id<>$1 and p.seen_at>now()-interval '2 minutes' order by p.seen_at desc limit 8",[user.id]),
   db.query("select i.id,i.sender_id,u.name as sender_name,i.created_at from buzzer.duel_invites i join public.buzzer_user u on u.id=i.sender_id join buzzer.notification_settings ns on ns.user_id=i.recipient_id and ns.challenge_alerts=true where i.recipient_id=$1 and i.status='pending' and i.expires_at>now() order by i.created_at desc limit 10",[user.id]),
   db.query("select i.id,i.room_code,i.sender_id,i.recipient_id,us.name as sender_name,ur.name as recipient_name from buzzer.duel_invites i join public.buzzer_user us on us.id=i.sender_id join public.buzzer_user ur on ur.id=i.recipient_id where (i.sender_id=$1 or i.recipient_id=$1) and i.status='accepted' and i.room_code is not null and i.created_at>now()-interval '24 hours' order by i.created_at desc limit 10",[user.id])
  ]);
  return json({ settings: settings[0] || {show_online:false,challenge_alerts:true,practice_frequency:"off",practice_hour:18,timezone:"UTC"}, online, invites, matches });
 } catch(e){return apiError(e);}
}
export async function POST(request: Request) {
 try {
  const user = await requireUser(request);
  const body = await readAction(request);
  const db = database();
  if(body.action==="heartbeat"){
   await db.query("insert into buzzer.presence(user_id,seen_at) values($1,now()) on conflict(user_id) do update set seen_at=now()",[user.id]);
   return json({ok:true});
  }
  if(body.action==="settings"){
   const show = body.showOnline === true;
   const alerts = body.challengeAlerts !== false;
   const frequency = body.frequency;
   const hour = body.hour;
   const timezone = body.timezone;
   if(!["off","daily","weekdays","weekly"].includes(String(frequency)) || !Number.isInteger(hour) || Number(hour)<0 || Number(hour)>23 || typeof timezone!=="string" || timezone.length>80) throw new AppError("Invalid reminder preferences.");
   await db.query("insert into buzzer.notification_settings(user_id,show_online,challenge_alerts,practice_frequency,practice_hour,timezone) values($1,$2,$3,$4,$5,$6) on conflict(user_id) do update set show_online=$2,challenge_alerts=$3,practice_frequency=$4,practice_hour=$5,timezone=$6,updated_at=now()",[user.id,show,alerts,frequency,hour,timezone]);
   return json({ok:true});
  }
  if(body.action==="invite"){
   if(typeof body.recipientId!=="string" || body.recipientId===user.id) throw new AppError("Choose another player.");
   const target=await db.query("select 1 from buzzer.presence p join buzzer.notification_settings s on s.user_id=p.user_id where p.user_id=$1 and s.show_online=true and s.challenge_alerts=true and p.seen_at>now()-interval '2 minutes'",[body.recipientId]);
   if(!target.length) throw new AppError("This player is no longer available.");
   const existing=await db.query("select id from buzzer.duel_invites where sender_id=$1 and recipient_id=$2 and status='pending' and expires_at>now() limit 1",[user.id,body.recipientId]);
   if(existing.length) throw new AppError("You already invited this player.");
   await db.query("insert into buzzer.duel_invites(sender_id,recipient_id) values($1,$2)",[user.id,body.recipientId]);
   return json({ok:true});
  }
  if(body.action==="respond"){
   if(typeof body.inviteId!=="string" || !/^[0-9a-f-]{36}$/i.test(body.inviteId) || !["accepted","declined"].includes(String(body.response))) throw new AppError("Invalid invitation.");
   if(body.response==="declined"){
    const rows=await db.query("update buzzer.duel_invites set status='declined' where id=$1 and recipient_id=$2 and status='pending' and expires_at>now() returning id",[body.inviteId,user.id]);
    if(!rows.length) throw new AppError("Invitation expired.");
    return json({ok:true});
   }
   if(typeof body.roomCode!=="string" || !/^[A-Z0-9]{4,12}$/.test(body.roomCode)) throw new AppError("Create a duel room before accepting.");
   const valid=await db.query("select 1 from arena.rooms r join arena.members m on m.room_id=r.id where r.code=$1 and m.account_user_id=$2 and r.expires_at>now() and r.status<>'closed' limit 1",[body.roomCode,user.id]);
   if(!valid.length) throw new AppError("Create your own active duel room first.");
   const rows=await db.query("update buzzer.duel_invites set status='accepted',room_code=$1 where id=$2 and recipient_id=$3 and status='pending' and expires_at>now() returning id",[body.roomCode,body.inviteId,user.id]);
   if(!rows.length) throw new AppError("Invitation expired.");
   return json({ok:true,roomCode:body.roomCode});
  }
  throw new AppError("Unknown action.");
 }catch(e){return apiError(e);}
}
