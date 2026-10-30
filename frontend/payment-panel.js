// Sandbox UI only. All authorization, settlement and delivery checks stay on the server.
let loadingSDK;
export function loadSandboxSDK() {
 if(typeof window.paypal?.createInstance==='function')return Promise.resolve(window.paypal);
 if(loadingSDK)return loadingSDK;
 loadingSDK=new Promise((resolve,reject)=>{
  if(document.querySelector('script[src*="paypal.com/sdk/js"]'))return reject(Error('Remove the older PayPal SDK before using checkout.'));
  const script=document.createElement('script');script.src='https://www.sandbox.paypal.com/web-sdk/v6/core';script.async=true;
  const timer=setTimeout(()=>finish(Error('PayPal SDK timed out. Check your connection and retry.')),30000);
  function finish(error){clearTimeout(timer);script.onload=null;script.onerror=null;if(error){script.remove();reject(error)}else resolve(window.paypal)}
  script.onload=()=>finish(typeof window.paypal?.createInstance==='function'?null:Error('PayPal SDK did not initialize.'));
  script.onerror=()=>finish(Error('PayPal SDK was blocked or failed to load.'));
  document.head.append(script);
 }).catch(error=>{loadingSDK=null;throw error});return loadingSDK;
}
export function createPaymentPanel({React:R,useApp,card,button,json}) {
 const h=R.createElement;
 return function PaymentPanel({contract}) {
  const app=useApp(),id=contract.contract_id,path='/payments/'+encodeURIComponent(id);
  const [status,setStatus]=R.useState(null),[proof,setProof]=R.useState(null),[receipt,setReceipt]=R.useState(null),[error,setError]=R.useState(''),[busy,setBusy]=R.useState(false),[ready,setReady]=R.useState(false),[watch,setWatch]=R.useState(true),[revision,bump]=R.useReducer(n=>n+1,0);
  const target=R.useRef(null),session=R.useRef(null),alive=R.useRef(true),locked=R.useRef(false);
  const apiRef=R.useRef(app.api);apiRef.current=app.api;
  R.useEffect(()=>{alive.current=true;return()=>{alive.current=false;session.current=null}},[]);
  R.useEffect(()=>{session.current=null;setReady(false);setStatus(null);setProof(null);setReceipt(null);setError('')},[app.tokens.buyer,id]);
  async function action(fn){if(locked.current)return;locked.current=true;setBusy(true);setError('');try{await fn()}catch(e){if(alive.current)setError(e.message||String(e))}finally{locked.current=false;if(alive.current)setBusy(false)}}
  R.useEffect(()=>{
   if(!app.tokens.buyer)return;
   let live=true,timer;const controller=new AbortController();
   async function tick(){try{
    const state=await apiRef.current(path+'/status',{signal:controller.signal});if(!live)return;setStatus(state);setError('');
    try{const ev=await apiRef.current('/analytics/contracts/'+encodeURIComponent(id)+'/evidence',{signal:controller.signal});if(live)setProof(ev)}catch(e){if(live&&e.name!=='AbortError')setError(e.message)}
    if(live&&watch&&!['CAPTURE_COMPLETED','VOIDED','PAYMENT_ERROR'].includes(state.payment_state))timer=setTimeout(tick,4000);
   }catch(e){if(live&&e.name!=='AbortError')setError(e.message)}}
   tick();return()=>{live=false;controller.abort();clearTimeout(timer)};
  },[id,app.tokens.buyer,watch,revision]);
  const refresh=()=>bump();
  async function prepare(){await action(async()=>{
   const cfg=await apiRef.current('/api/frontend-config',{role:null});if(cfg.environment!=='SANDBOX'||!cfg.paypal_client_id)throw Error('Configure the sandbox app credentials in .env first.');
   const globalSDK=await loadSandboxSDK();const sdk=await globalSDK.createInstance({clientId:cfg.paypal_client_id,components:['paypal-payments'],pageType:'checkout'});
   const methods=await sdk.findEligibleMethods({currencyCode:'USD'});if(!methods.isEligible('paypal'))throw Error('PayPal is not eligible in this browser.');
   const created=sdk.createPayPalOneTimePaymentSession({
    async onApprove(data){if(!alive.current)return;try{const stored=await apiRef.current(path+'/status');if(stored.paypal_order_id!==data.orderId)throw Error('Order does not match this contract.');await apiRef.current(path+'/authorize',{body:{}});if(alive.current){setWatch(true);refresh()}}catch(e){if(alive.current)setError(e.message||String(e))}},
    onCancel(){if(alive.current){setError('Checkout closed. No success assumed; refresh the server status before retrying.');refresh()}},
    onError(e){if(alive.current){setError(e.message||'PayPal checkout error. Refresh status before retrying.');refresh()}}
   });
   if(!alive.current)return;session.current=created;setReady(true);
  })}
  R.useEffect(()=>{
   const el=target.current;if(!el||!ready)return;
   const click=()=>{if(locked.current||!session.current)return;setError('');locked.current=true;setBusy(true);
    // Start from the user click. Only the server creates an AUTHORIZE order.
    const order=apiRef.current(path+'/order',{body:{}}).then(d=>({orderId:d.paypal_order_id}));
    Promise.resolve().then(()=>session.current.start({presentationMode:'auto'},order)).catch(e=>{if(alive.current)setError(e.message||String(e))}).finally(()=>{locked.current=false;if(alive.current){setBusy(false);refresh()}});
   };el.addEventListener('click',click);return()=>el.removeEventListener('click',click);
  },[ready,id]);
  const state=status?.payment_state;
  const canPay=contract.status==='FROZEN'&&['UNINITIALIZED','ORDER_CREATED'].includes(state);
  const returned=new URLSearchParams(location.search).has('paypal_return');
  const messages={UNINITIALIZED:'No order yet. Prepare the button to authorize the frozen price.',ORDER_CREATED:'Order created. Finish PayPal approval, then confirm authorization.',AUTHORIZED:'Authorized — evaluation pending or running. Keep worker.py and Ollama running.',CAPTURE_PENDING:'Capture pending. The server is reconciling payment; do not start another purchase.',CAPTURE_COMPLETED:'Sandbox capture confirmed. Request your receipt and tested package below.',VOID_PENDING:'Cancellation pending. Wait for backend confirmation.',VOIDED:'Authorization cancelled. No capture for this contract. Create a new contract only for a new evaluation.',PAYMENT_ERROR:'Payment needs attention. Check server logs and provider status before another purchase.'};
  const rows=proof?.ag_grid_rows||[];
  const columns=['record_index','baseline_passed','skilled_passed','comparison_status','baseline_error','baseline_output','skilled_output','baseline_tokens','skilled_tokens','baseline_ms','skilled_ms'];
  const renderCell=(r,c)=>r[c]===null||r[c]===undefined?(c==='skilled_output'?'Locked / unavailable':'—'):typeof r[c]==='object'?JSON.stringify(r[c]):String(r[c]);
  function download(){if(!receipt)return;const blob=new Blob([JSON.stringify(receipt,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='AgentGain-'+id+'-receipt.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
  return card('PayPal Sandbox checkout',h('p',null,'Test money only. Approve the authorization; the backend evaluates and decides capture or cancellation.'),
   !app.config.payments_enabled&&h('p',{role:'alert'},'Set PAYMENT_CONTROLLER_ENABLED=1 and restart checkout_server before paying.'),
   returned&&h('p',null,'Returned from PayPal. Reconnect your buyer token if needed, then confirm authorization below.'),
   h('p',{role:'status'},messages[state]||'Connect buyer access to load payment status.'),error&&h('p',{role:'alert',className:'ag-error'},error),
   status&&json(status),
   canPay&&app.config.payments_enabled&&h(R.Fragment,null,button(busy?'Preparing…':'Prepare PayPal button',prepare,{disabled:busy||ready}),h('paypal-button',{ref:target,hidden:!ready||busy,'aria-label':'Authorize sandbox purchase'})),
   state==='ORDER_CREATED'&&button('Confirm authorization after PayPal approval',()=>action(async()=>{await apiRef.current(path+'/authorize',{body:{}});setWatch(true);refresh()}),{disabled:busy}),
   button('Refresh payment and evidence',refresh,{variant:'outline'}),button(watch?'Stop watching':'Watch status',()=>setWatch(v=>!v),{variant:'outline'}),
   h('p',null,'Stopping updates does not stop backend evaluation or payment processing.'),
   proof&&h(R.Fragment,null,h('h3',null,'Recorded evaluation evidence'),json(Object.fromEntries(Object.entries(proof).filter(([k])=>k!=='ag_grid_rows'))),h('div',{className:'seller-table-scroll'},h('table',{className:'seller-table'},h('thead',null,h('tr',null,columns.map(c=>h('th',{key:c},c.replaceAll('_',' '))))),h('tbody',null,rows.map(r=>h('tr',{key:r.record_index},columns.map(c=>h('td',{key:c},renderCell(r,c))))))))),
   state==='CAPTURE_COMPLETED'&&status?.eval_verdict==='PASS'&&button('Get receipt and tested package',()=>action(async()=>{const r=await apiRef.current(path+'/receipt');if(alive.current)setReceipt(r)}),{disabled:busy}),
   receipt&&h(R.Fragment,null,h('h3',null,'Verified delivery'),json(receipt),button('Download receipt and package JSON',download)));
 };
}
