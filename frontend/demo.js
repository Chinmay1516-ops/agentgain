const $=id=>document.getElementById(id);
let watching=false;
async function request(path,post=false){
 if(!$('token').value.trim())throw Error('Paste your buyer token first.');
 const r=await fetch(path,{method:post?'POST':'GET',headers:{Authorization:'Bearer '+$('token').value.trim()}});
 const data=await r.json();if(!r.ok)throw Error(typeof data.detail==='string'?data.detail:JSON.stringify(data.detail));return data;
}
async function refresh(){
 const id=$('run').value.trim();if(!id)throw Error('Enter a demo run ID or start an evaluation.');
 const data=await request('/demo/runs/'+encodeURIComponent(id));
 $('status').textContent=JSON.stringify({mode:data.mode,status:data.status,completed_records:data.completed_records,payment_processed:false},null,2);
 $('summary').textContent=JSON.stringify(data.summary||{message:'Evaluation pending. Keep the demo worker running.'},null,2);
 const cols=['record_index','baseline_passed','skilled_passed','comparison_status','baseline_tokens','skilled_tokens','baseline_ms','skilled_ms'];
 const table=document.createElement('table');const head=table.insertRow();
 for(const col of cols){const th=document.createElement('th');th.textContent=col;head.append(th);}
 for(const row of data.rows){const tr=table.insertRow();for(const col of cols)tr.insertCell().textContent=String(row[col]);}
 $('grid').replaceChildren(table);return data;
}
function bind(id,fn){$(id).onclick=async()=>{$(id).disabled=true;try{await fn();$('message').textContent='Request completed.';}catch(e){$('message').textContent=e.message;watching=false;}finally{$(id).disabled=false;}};}
bind('start',async()=>{const c=$('contract').value.trim();if(!c)throw Error('Paste your approved Contract ID.');const d=await request('/demo/contracts/'+encodeURIComponent(c)+'/run',true);$('run').value=d.run_id;await refresh();});
bind('refresh',refresh);
bind('watch',async()=>{watching=true;const end=Date.now()+7200000;while(watching&&Date.now()<end){const d=await refresh();if(['COMPLETED','TECHNICAL_ERROR'].includes(d.status))break;await new Promise(r=>setTimeout(r,5000));}watching=false;});
bind('stop',async()=>{watching=false;});
