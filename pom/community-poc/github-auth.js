const bytesToBase64=bytes=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const random=()=>bytesToBase64(crypto.getRandomValues(new Uint8Array(32)));
export async function hash(value){return bytesToBase64(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))))}
const cookieValue=(request,name)=>request.headers.get('Cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='))?.slice(name.length+1);
const response=(body,status=400,headers={})=>new Response(body,{status,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff',...headers}});
function validConfig(env){try{const callback=new URL(env.OAUTH_CALLBACK_URL),admin=new URL(env.ADMIN_PAGE_URL);return !!env.GITHUB_CLIENT_ID&&!!env.GITHUB_CLIENT_SECRET&&!!env.ADMIN_GITHUB_ID&&!!env.DB&&callback.protocol==='https:'&&admin.protocol==='https:'&&admin.origin===env.ADMIN_ORIGIN&&!admin.hash&&!admin.search}catch{return false}}
export async function oauth(request,env){
 if(!validConfig(env))return response('Sign-in is not configured.',503);
 const url=new URL(request.url);if(request.method!=='GET'||url.origin!==new URL(env.OAUTH_CALLBACK_URL).origin)return response('Not found.',404);
 if(url.pathname==='/auth/start'){
  const state=random(),verifier=random(),authorize=new URL('https://github.com/login/oauth/authorize');
  for(const [k,v] of Object.entries({client_id:env.GITHUB_CLIENT_ID,redirect_uri:env.OAUTH_CALLBACK_URL,scope:'',state,code_challenge:await hash(verifier),code_challenge_method:'S256',allow_signup:'false'}))authorize.searchParams.set(k,v);
  return response('',302,{Location:authorize.href,'Set-Cookie':`ll_oauth=${state}.${verifier}; Path=/auth/callback; Secure; HttpOnly; SameSite=Lax; Max-Age=600`});
 }
 if(url.pathname!=='/auth/callback')return response('Not found.',404);
 const cookie=cookieValue(request,'ll_oauth'),parts=cookie?.split('.'),state=url.searchParams.get('state'),code=url.searchParams.get('code');
 if(!parts||parts.length!==2||!state||state!==parts[0]||!code||code.length>1024)return response('Sign-in failed. Return to the review page and try again.',403);
 try{
  const tokenResponse=await fetch('https://github.com/login/oauth/access_token',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify({client_id:env.GITHUB_CLIENT_ID,client_secret:env.GITHUB_CLIENT_SECRET,code,redirect_uri:env.OAUTH_CALLBACK_URL,code_verifier:parts[1]})});const token=await tokenResponse.json();if(!tokenResponse.ok||!token.access_token)throw Error('token');
  const userResponse=await fetch('https://api.github.com/user',{headers:{Authorization:`Bearer ${token.access_token}`,'User-Agent':'little-ledges-gallery-poc',Accept:'application/vnd.github+json'}});const user=await userResponse.json();if(!userResponse.ok||String(user.id)!==String(env.ADMIN_GITHUB_ID))return response('This GitHub account is not authorized.',403,{'Set-Cookie':'ll_oauth=; Path=/auth/callback; Secure; HttpOnly; SameSite=Lax; Max-Age=0'});
  const session=random(),expires=new Date(Date.now()+15*60*1000).toISOString();await env.DB.prepare('DELETE FROM admin_sessions WHERE expires_at <= ?').bind(new Date().toISOString()).run();await env.DB.prepare('INSERT INTO admin_sessions (token_hash, expires_at) VALUES (?,?)').bind(await hash(session),expires).run();
  const destination=new URL(env.ADMIN_PAGE_URL);destination.hash='session='+session;
  return response('',302,{Location:destination.href,'Set-Cookie':'ll_oauth=; Path=/auth/callback; Secure; HttpOnly; SameSite=Lax; Max-Age=0'});
 }catch{return response('Sign-in failed. Please try again.',403)}
}
export async function authenticate(request,env){
 if(!validConfig(env))return null;const value=request.headers.get('Authorization')||'',match=/^Bearer ([A-Za-z0-9_-]{43})$/.exec(value);if(!match)return null;
 try{const found=await env.DB.prepare('SELECT expires_at FROM admin_sessions WHERE token_hash = ?').bind(await hash(match[1])).first();return found&&found.expires_at>new Date().toISOString()?String(env.ADMIN_GITHUB_ID):null}catch{return null}
}
