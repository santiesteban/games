import {validateSubmission} from './submission.js';

const MAX_BODY=65536;
const reply=(value,status=200,origin='')=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})}});
async function readLimited(request){
  if(Number(request.headers.get('Content-Length'))>MAX_BODY) throw new Error('Submission is too large.');
  if(!request.body) throw new Error('Submission is empty.');
  const reader=request.body.getReader(),chunks=[];let size=0;
  while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>MAX_BODY){await reader.cancel();throw new Error('Submission is too large.')}chunks.push(value)}
  const bytes=new Uint8Array(size);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length}
  return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
}
async function digest(value){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('')}
export async function submit(request,env){
  const origin=request.headers.get('Origin')||'';
  if(!env.CREATOR_ORIGIN||origin!==env.CREATOR_ORIGIN)return reply({error:'Origin not allowed.'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin'}});
  if(request.method!=='POST')return reply({error:'Method not allowed.'},405,origin);
  if(!env.TURNSTILE_SECRET||!env.DB||!env.SUBMISSION_LIMITER)return reply({error:'Submission service is not configured.'},503,origin);
  try{
    const ip=request.headers.get('CF-Connecting-IP');if(!ip)return reply({error:'Submission service unavailable.'},503,origin);
    const {success:allowed}=await env.SUBMISSION_LIMITER.limit({key:ip});if(!allowed)return reply({error:'Too many submissions. Please try later.'},429,origin);
    const data=await readLimited(request);
    if(typeof data.turnstileToken!=='string'||data.turnstileToken.length>2048)throw new Error('Please complete the verification.');
    const payload=new URLSearchParams({secret:env.TURNSTILE_SECRET,response:data.turnstileToken});
    const check=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:payload});
    const verification=await check.json();if(!verification.success||verification.hostname!==new URL(env.CREATOR_ORIGIN).hostname||verification.action!=='puzzle_submit')return reply({error:'Verification failed. Please try again.'},403,origin);
    const validated=validateSubmission(data),json=JSON.stringify(validated.puzzle);
    const canonical=JSON.stringify([validated.puzzle.grid,validated.puzzle.palette,validated.puzzle.start,validated.puzzle.goal,validated.puzzle.initialDepths]);
    const id=crypto.randomUUID(),now=new Date().toISOString(),hash=await digest(canonical);
    await env.DB.prepare('INSERT INTO submissions (id,created_at,creator_name,description,puzzle_json,content_hash) VALUES (?,?,?,?,?,?)').bind(id,now,validated.creatorName,validated.description,json,hash).run();
    return reply({id,status:'pending'},201,origin);
  }catch(error){console.error('Submission failed',error);return reply({error:'Submission could not be processed. Check the puzzle and try again.'},400,origin)}
}
export default {fetch(request,env){const path=new URL(request.url).pathname;if(path!=='/submit')return reply({error:'Not found.'},404);return submit(request,env)}};
