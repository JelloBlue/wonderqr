import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type,x-admin-token,authorization,apikey","Access-Control-Allow-Methods":"POST,OPTIONS"};
const out=(x:any,status=200)=>new Response(JSON.stringify(x),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
const db=()=>createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const clean=(v:any)=>v==null?"":String(v).trim();
const editable=["business_name","owner_name","phone_number","whatsapp_number","instagram_url","youtube_url","facebook_url","justdial_url","pinterest_url","x_url"];
const validUrl=(v:string)=>{if(!v)return true;try{const u=new URL(v);return u.protocol==="http:"||u.protocol==="https:"}catch{return false}};
const validPhone=(v:string)=>!v||/^[+()\d\s.-]{7,30}$/.test(v);
const sha256Hex=async(v:string)=>{const hash=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return Array.from(new Uint8Array(hash)).map(x=>x.toString(16).padStart(2,"0")).join("");};
function safeBusiness(b:any,qr:any){if(!b)return null;const {auth_token,admin_pin_hash,admin_pin_set_by,...safe}=b;return {...safe,qr_codes:qr?[qr]:[]};}
async function authenticate(req:Request,body:any){const headerToken=clean(req.headers.get("x-admin-token"));const auth=clean(req.headers.get("authorization"));const bearer=auth.replace(/^Bearer\s+/i,"");const token=headerToken||bearer||clean(body.token);if(!token)return {error:"Missing admin token",status:401};const s=db();const {data:b,error}=await s.from("businesses").select("id,qr_code_id,business_name,google_review_url,instagram_url,youtube_url,whatsapp_number,phone_number,owner_name,active,created_at,total_reviews,rating_1_count,rating_2_count,rating_3_count,rating_4_count,rating_5_count,qr_code,facebook_url,pinterest_url,x_url,justdial_url,review_filter_enabled,review_min_rating,review_filter_locked,auth_token,admin_pin_hash,admin_pin_set_by").eq("auth_token",token).eq("active",true).maybeSingle();if(error){console.error("AUTH_DB_ERROR",error);return {error:`Business authentication database error: ${error.message}`,status:500};}if(!b)return {error:"Invalid or inactive business token",status:401};let qr=null;if(b.qr_code_id!=null){const {data:q,error:qe}=await s.from("qr_codes").select("id,code,status").eq("id",b.qr_code_id).maybeSingle();if(qe)console.error("QR_LOOKUP_ERROR",qe.message);else qr=q||null}return {s,b,qr,token};}

Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 if(req.method!=="POST")return out({error:"Method not allowed"},405);
 try{
  const body=await req.json().catch(()=>({}));
  const auth=await authenticate(req,body);if(auth.error)return out({error:auth.error},auth.status);
  const {s,b,qr,token}=auth;const business=safeBusiness(b,qr);const action=clean(body.action)||"dashboard";
  if(action==="auth")return out({ok:true,business});
  if(action==="dashboard"||action==="feedback"){
   const {data:feedback,error}=await s.from("feedback").select("id,business_id,rating,message,created_at,customer_name,customer_phone").eq("business_id",b.id).eq("is_test",false).order("created_at",{ascending:false});
   if(error)return out({error:`Unable to load customer feedback: ${error.message}`},500);return out({ok:true,business,feedback:feedback||[]});
  }
  if(action==="notifications"){
   const limit=Math.min(Math.max(Number(body.limit)||30,1),100);const {data:notes,error:ne}=await s.from("notifications").select("id,title,message,target_type,target_business_id,action_url,created_at,created_by").or(`target_type.eq.all,target_business_id.eq.${b.id}`).order("created_at",{ascending:false}).limit(limit);if(ne)return out({error:ne.message},400);const ids=(notes||[]).map((n:any)=>n.id);let reads:any[]=[];if(ids.length){const {data:rd,error:re}=await s.from("notification_reads").select("notification_id,read_at").eq("business_id",b.id).in("notification_id",ids);if(re)return out({error:re.message},400);reads=rd||[]}const rm=new Map(reads.map((r:any)=>[r.notification_id,r.read_at]));const notifications=(notes||[]).map((n:any)=>({...n,read_at:rm.get(n.id)||null,unread:!rm.has(n.id)}));return out({ok:true,notifications,unread_count:notifications.filter((n:any)=>n.unread).length});
  }
  if(action==="mark_notification_read"){
   const id=clean(body.notification_id);if(!id)return out({error:"Notification ID is required."},400);const {data:note,error:ne}=await s.from("notifications").select("id,target_type,target_business_id").eq("id",id).maybeSingle();if(ne)return out({error:ne.message},400);if(!note)return out({error:"Notification not found."},404);if(note.target_type!=="all"&&Number(note.target_business_id)!==Number(b.id))return out({error:"Notification not available for this business."},403);const {data:read,error:re}=await s.from("notification_reads").upsert({notification_id:id,business_id:b.id,read_at:new Date().toISOString()},{onConflict:"notification_id,business_id"}).select("notification_id,read_at").single();if(re)return out({error:re.message},400);return out({ok:true,read});
  }
  if(action==="update_review_settings"){
   if(b.review_filter_locked)return out({error:"Review filter settings are locked by Super Admin."},403);const enabled=body.review_filter_enabled===true||body.review_filter_enabled===false?body.review_filter_enabled:null;const min=Number(body.review_min_rating);if(enabled===null||![4,5].includes(min))return out({error:"Invalid review filter settings."},400);const {data:u,error:ue}=await s.from("businesses").update({review_filter_enabled:enabled,review_min_rating:min}).eq("id",b.id).eq("auth_token",token).select("*").single();if(ue)return out({error:ue.message},400);return out({ok:true,business:safeBusiness(u,qr)});
  }
  if(action==="update_profile"){
   const updates:any={};for(const key of editable){if(!(key in body))continue;const value=clean(body[key]);if(key.endsWith("_url")&&!validUrl(value))return out({error:`Please enter a valid ${key.replace("_url","").replace("_"," ")} URL.`},400);if((key==="phone_number"||key==="whatsapp_number")&&!validPhone(value))return out({error:`Please enter a valid ${key==="phone_number"?"phone":"WhatsApp"} number.`},400);updates[key]=value||null}if(!clean(updates.business_name))return out({error:"Business name is required."},400);const {data:u,error:ue}=await s.from("businesses").update(updates).eq("id",b.id).eq("auth_token",token).select("*").single();if(ue)return out({error:ue.message},400);return out({ok:true,business:safeBusiness(u,qr)});
  }
  if(action==="change_pin"){
   const currentPin=clean(body.current_pin),newPin=clean(body.new_pin);
   if(!/^[0-9]{4}$/.test(currentPin)||!/^[0-9]{4}$/.test(newPin))return out({error:"PIN must be exactly 4 digits."},400);
   if(currentPin===newPin)return out({error:"New PIN must be different from the current PIN."},400);
   const currentHash=await sha256Hex(currentPin);if(!b.admin_pin_hash||b.admin_pin_hash!==currentHash)return out({error:"Current PIN is incorrect."},401);
   const newHash=await sha256Hex(newPin);const {error:ue}=await s.from("businesses").update({admin_pin_hash:newHash,admin_pin_set_by:"business_admin"}).eq("id",b.id).eq("auth_token",token).eq("active",true);if(ue){console.error("PIN_UPDATE_ERROR",ue);return out({error:"Unable to update Admin PIN."},500);}return out({ok:true});
  }
  return out({error:"Unknown action"},400);
 }catch(e){console.error("ADMIN_API_ERROR",e);return out({error:`Admin service error: ${e instanceof Error?e.message:String(e)}`},500)}
});