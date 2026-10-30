import {AgentGainAPI} from './api.js';
import {mountPayPal} from './paypal.js';
const $ = id => document.getElementById(id);
const api = new AgentGainAPI({getToken:()=>$('token').value.trim()});
let currentContract, failureId, watchController, removePayPal;
const query = new URLSearchParams(location.search);
$('skillId').value = query.get('skill_id') || '';
$('contractId').value = query.get('contract_id') || '';
function message(value) {$('message').textContent = value;}
function show(id, value) {$(id).textContent = JSON.stringify(value,null,2);}
function bind(id, action) {$(id).onclick = async () => {$(id).disabled=true;try {await action();message('Request completed.');} catch(e){message(e.message);} finally {$(id).disabled=false;}};}
function json(id) {return JSON.parse($(id).value);}
function cid() {const id=$('contractId').value.trim(); if(!id) throw new Error('Load or create a contract first.'); return id;}
function displayContract(c) {currentContract=c;$('contractId').value=c.contract_id;show('terms',c);$('consent').checked=false;removePayPal?.();}
function evidenceTable(data) {
  $('grid').replaceChildren();
  const table=document.createElement('table');
  const cols=['record_index','baseline_passed','skilled_passed','comparison_status','baseline_error','baseline_output','skilled_output','baseline_tokens','skilled_tokens','baseline_ms','skilled_ms'];
  const head=table.insertRow();for(const col of cols){const th=document.createElement('th');th.textContent=col;head.append(th);}
  for(const row of data.ag_grid_rows){const tr=table.insertRow();for(const col of cols){const td=tr.insertCell();td.textContent=row[col]===null?'Unavailable / locked':typeof row[col]==='object'?JSON.stringify(row[col]):String(row[col]);}}
  $('grid').append(table);
}
async function refresh() {const id=cid();show('status',await api.status(id));const e=await api.evidence(id);const {ag_grid_rows,...summary}=e;show('summary',summary);evidenceTable(e);}
bind('health',async()=>show('status',await api.health()));
bind('register',async()=>{const r=await api.registerSkill(json('skillBody'));$('skillId').value=r.skill_id;show('skillView',r);});
bind('checkout',async()=>show('skillView',await api.checkout($('skillId').value.trim())));
bind('attempt',async()=>{const r=await api.attemptTask(json('attemptBody'));failureId=r.failure_id;show('attemptView',r);if(r.recommended_skill)$('skillId').value=r.recommended_skill.skill_id;});
bind('dataset',async()=>{const body=json('datasetBody');if(failureId)body.origin_failure_id=failureId;const r=await api.prepareDataset(body);$('datasetId').value=r.dataset_id;show('status',r);});
bind('create',async()=>displayContract(await api.createContract({skill_id:$('skillId').value.trim(),dataset_id:$('datasetId').value.trim(),model_name:$('model').value.trim(),purchase_mode:'FULL_SKILL'})));
bind('load',async()=>displayContract(await api.contract(cid())));
bind('approve',async()=>{if(!currentContract||cid()!==currentContract.contract_id||!$('consent').checked)throw new Error('Load the contract, review it and check approval first.');show('status',await api.approveContract(currentContract));});
bind('paypalInit',async()=>{const c=await api.contract(cid());if(!['FROZEN','COMPLETED'].includes(c.status))throw new Error('Approve the contract first.');removePayPal?.();removePayPal=await mountPayPal({api,contractId:cid(),button:$('paypalCheckoutButton'),onUpdate:refresh,onError:e=>message(e.message)});});
bind('returnAuthorize',async()=>{await api.authorize(cid());await refresh();});
bind('refresh',refresh);
bind('watch',async()=>{watchController?.abort();watchController=new AbortController();const id=cid();await api.watch(id,async s=>{show('status',s);const e=await api.evidence(id);const {ag_grid_rows,...summary}=e;show('summary',summary);evidenceTable(e);},{signal:watchController.signal});});
bind('stop',async()=>watchController?.abort());
bind('receipt',async()=>show('delivery',await api.receipt(cid())));
bind('retry',async()=>{if(!failureId)throw new Error('Attempt the original task in this session first.');show('delivery',await api.retryTask({contract_id:cid(),failure_id:failureId}));});
bind('funnel',async()=>show('delivery',await api.sellerFunnel($('skillId').value.trim())));
bind('outcomes',async()=>show('delivery',await api.sellerOutcomes($('skillId').value.trim())));
for(const [id,name] of [['skillBody','skill'],['attemptBody','attempt'],['datasetBody','dataset']]) {
 try {const r=await fetch('../integration-examples/'+name+'.json');if(!r.ok)throw new Error('Example unavailable');$(id).value=JSON.stringify(await r.json(),null,2);}catch(e){message(e.message);}
}
if(query.has('paypal_return'))message('PayPal returned. Enter buyer token, load the contract, then confirm authorization.');
if(query.has('paypal_cancel'))message('PayPal approval cancelled. Enter buyer token and refresh server status.');
