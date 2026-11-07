import {authenticate,oauth} from './github-auth.js';
const reply=(value,status,origin)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...(origin?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Credentials':'true','Vary':'Origin'}:{})}});
export default {async fetch(request,env){
  const origin=request.headers.get('Origin')||'';
  const url=new URL(request.url);
  if(url.pathname.startsWith('/auth/'))return oauth(request,env);
  if(url.pathname==='/gallery'&&request.method==='GET'){
    try{const data=await env.DB.prepare("SELECT creator_name,description,puzzle_json FROM submissions WHERE status='approved' AND published=1 ORDER BY reviewed_at DESC, id").all();return new Response(JSON.stringify(data.results.map(row=>({creatorName:row.creator_name,description:row.description,puzzle:JSON.parse(row.puzzle_json)}))),{headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Access-Control-Allow-Origin':'*'}})}catch{return reply({error:'Gallery unavailable.'},500,'')}
  }
  if(origin!==env.ADMIN_ORIGIN||!origin)return reply({error:'Origin not allowed.'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Credentials':'true','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization','Vary':'Origin'}});
  const user=await authenticate(request,env);if(!user||!env.DB)return reply({error:'Not authorized.'},403,origin);
  try{
    if(request.method==='GET'&&url.pathname==='/submissions'){
      const status=url.searchParams.get('status')||'pending';if(!['pending','approved','rejected'].includes(status))return reply({error:'Invalid status.'},400,origin);
      const data=await env.DB.prepare('SELECT id,created_at,status,creator_name,description,puzzle_json,content_hash,reviewed_at,published FROM submissions WHERE status = ? ORDER BY created_at DESC LIMIT 100').bind(status).all();return reply({submissions:data.results},200,origin);
    }
    const match=url.pathname.match(/^\/submissions\/([0-9a-f-]{36})\/(approve|reject)$/);
    if(request.method==='POST'&&match){const status=match[2]==='approve'?'approved':'rejected';const result=await env.DB.prepare("UPDATE submissions SET status=?, reviewed_at=?, reviewer=? WHERE id=? AND status='pending'").bind(status,new Date().toISOString(),user,match[1]).run();return result.meta.changes?reply({status},200,origin):reply({error:'Submission not found or already reviewed.'},409,origin)}
    const galleryMatch=url.pathname.match(/^\/submissions\/([0-9a-f-]{36})\/(publish|unpublish)$/);
    if(request.method==='POST'&&galleryMatch){const published=galleryMatch[2]==='publish'?1:0;const result=await env.DB.prepare("UPDATE submissions SET published=? WHERE id=? AND status='approved'").bind(published,galleryMatch[1]).run();return result.meta.changes?reply({published:!!published},200,origin):reply({error:'Approved submission not found.'},409,origin)}
    return reply({error:'Not found.'},404,origin);
  }catch{return reply({error:'Review service unavailable.'},500,origin)}
}};
