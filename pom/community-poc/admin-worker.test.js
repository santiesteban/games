import test from 'node:test';import assert from 'node:assert/strict';import worker from './admin-worker.js';
test('review API denies an untrusted origin and unsigned requests before accessing data',async()=>{let called=false;const env={ADMIN_ORIGIN:'https://example.org',DB:{prepare(){called=true;throw Error('unexpected')}}};let response=await worker.fetch(new Request('https://review.example/submissions',{headers:{Origin:'https://attacker.example'}}),env);assert.equal(response.status,403);response=await worker.fetch(new Request('https://review.example/submissions',{headers:{Origin:'https://example.org','Cf-Access-Jwt-Assertion':'forged'}}),env);assert.equal(response.status,403);assert.equal(called,false)});

test('only an authenticated admin can publish approved puzzles and remove them from the public gallery',async()=>{
 const id='12345678-1234-1234-1234-123456789abc',token='A'.repeat(43),rows=[{id,status:'approved',published:0,creator_name:'Creator',description:'Example',puzzle_json:'{"name":"Example"}'},{id:'22345678-1234-1234-1234-123456789abc',status:'pending',published:0}];
 const env={ADMIN_ORIGIN:'https://example.org',ADMIN_GITHUB_ID:'123',GITHUB_CLIENT_ID:'client',GITHUB_CLIENT_SECRET:'test',OAUTH_CALLBACK_URL:'https://review.example/auth/callback',ADMIN_PAGE_URL:'https://example.org/admin',DB:{prepare(sql){return{bind(...args){return{async first(){return {expires_at:'2999-01-01T00:00:00.000Z'}},async run(){const row=rows.find(r=>r.id===args[1]&&r.status==='approved');if(row)row.published=args[0];return{meta:{changes:row?1:0}}}}},async all(){return {results:rows.filter(r=>r.status==='approved'&&r.published).map(({creator_name,description,puzzle_json})=>({creator_name,description,puzzle_json}))}}}}}};
 const request=(path,auth=true)=>new Request(`https://review.example${path}`,{method:'POST',headers:{Origin:'https://example.org',...(auth?{Authorization:`Bearer ${token}`}:{})}});
 let response=await worker.fetch(request(`/submissions/${id}/publish`,false),env);assert.equal(response.status,403);
 response=await worker.fetch(request('/submissions/22345678-1234-1234-1234-123456789abc/publish'),env);assert.equal(response.status,409);
 response=await worker.fetch(request(`/submissions/${id}/publish`),env);assert.equal(response.status,200);
 response=await worker.fetch(new Request('https://review.example/gallery'),env);assert.deepEqual(await response.json(),[{creatorName:'Creator',description:'Example',puzzle:{name:'Example'}}]);
 response=await worker.fetch(request(`/submissions/${id}/unpublish`),env);assert.equal(response.status,200);
 response=await worker.fetch(new Request('https://review.example/gallery'),env);assert.deepEqual(await response.json(),[]);
});
