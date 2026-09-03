import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MASTER_KEY = Deno.env.get("SUPERADMIN_KEY");
const db = () => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const cors = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type, apikey, x-superadmin-key, x-admin-token","Access-Control-Allow-Methods":"POST, OPTIONS"};
const out = (data: unknown, status = 200) => new Response(JSON.stringify(data), {status, headers:{...cors,"Content-Type":"application/json"}});
const EVENT_TYPES = new Set(["scan","rating_1","rating_2","rating_3","instagram_click","youtube_click","facebook_click","pinterest_click","x_click","whatsapp_click","phone_click","justdial_click"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, {status:204, headers:cors});
  if (req.method !== "POST") return out({error:"Method not allowed"},405);
  try {
    const body = await req.json();
    const action = String(body.action || "");
    const supabase = db();
    if (action === "event") {
      const qrCode = String(body.qr_code || "").trim();
      const eventType = String(body.event_type || "").trim();
      const visitorId = String(body.visitor_id || "").trim().slice(0,128) || null;
      if (!qrCode || !EVENT_TYPES.has(eventType)) return out({error:"Invalid usage event"},400);
      const {data:qr,error:qrError}=await supabase.from("qr_codes").select("id,code").ilike("code",qrCode).maybeSingle();
      if(qrError)return out({error:qrError.message},400);
      if(!qr)return out({ok:true});
      const {data:business,error:businessError}=await supabase.from("businesses").select("id").eq("qr_code_id",qr.id).eq("active",true).maybeSingle();
      if(businessError)return out({error:businessError.message},400);
      if(!business)return out({ok:true});
      const {error}=await supabase.from("usage_events").insert([{business_id:business.id,event_type:eventType,visitor_id:visitorId}]);
      if(error)return out({error:error.message},400);
      return out({ok:true});
    }
    if (action === "summary") {
      const businessId=Number(body.business_id);
      const start=String(body.start||"").trim();
      const end=String(body.end||"").trim();
      if(!Number.isInteger(businessId)||businessId<1)return out({error:"Invalid business ID"},400);
      if(!start||!end)return out({error:"Start and end dates are required"},400);

      const suppliedKey=req.headers.get("x-superadmin-key")||body.key;
      let authorized=false;
      if(MASTER_KEY && suppliedKey===MASTER_KEY) authorized=true;

      if(!authorized){
        const adminToken=(req.headers.get("x-admin-token")||body.admin_token||"").trim();
        if(!adminToken)return out({error:"Unauthorized"},401);
        const {data:business,error:authError}=await supabase.from("businesses").select("id").eq("id",businessId).eq("auth_token",adminToken).eq("active",true).maybeSingle();
        if(authError)return out({error:authError.message},400);
        if(!business)return out({error:"Unauthorized"},401);
        authorized=true;
      }

      const {data,error}=await supabase.from("usage_events").select("event_type,visitor_id,created_at").eq("business_id",businessId).gte("created_at",start).lt("created_at",end).order("created_at",{ascending:false});
      if(error)return out({error:error.message},400);
      const counts:Record<string,number>={};const visitors=new Set<string>();let lastScan:string|null=null;
      for(const row of data||[]){counts[row.event_type]=(counts[row.event_type]||0)+1;if(row.event_type==="scan"&&row.visitor_id)visitors.add(row.visitor_id);if(!lastScan&&row.event_type==="scan")lastScan=row.created_at;}
      return out({ok:true,counts,unique_visitors:visitors.size,total_scans:counts.scan||0,last_scan:lastScan});
    }
    return out({error:"Unknown action"},400);
  } catch(error){return out({error:error instanceof Error?error.message:String(error)},500);}
});
