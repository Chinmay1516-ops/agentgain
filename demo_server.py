"""Serve the connected frontend and real local evaluations without PayPal."""
import os
os.environ['PAYMENT_CONTROLLER_ENABLED']='0'
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import Depends, HTTPException
from fastapi.responses import JSONResponse, RedirectResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from auth import CurrentUser, require_role
from demo_core import DemoRun, init_demo, queue_demo
from database import AsyncSessionLocal
from main import app
from ui_routes import router as ui_router
app.include_router(ui_router)
root=Path(__file__).parent
original_lifespan=app.router.lifespan_context
@asynccontextmanager
async def demo_lifespan(app):
    await init_demo()
    async with original_lifespan(app):
        yield
app.router.lifespan_context=demo_lifespan

@app.middleware('http')
async def block_demo_payments(request,call_next):
    if request.url.path=='/payments' or request.url.path.startswith('/payments/'):
        return JSONResponse({'detail':'Local demo — no payment processed; payment routes disabled'},status_code=403)
    return await call_next(request)

@app.post('/demo/contracts/{contract_id}/run')
async def start_demo(contract_id:str,user:CurrentUser=Depends(require_role('buyer'))):
    run_id=await queue_demo(contract_id,user.id)
    return {'run_id':run_id,'mode':'DEMO_NO_PAYMENT','message':'No funds authorized, captured or cancelled'}

@app.get('/demo/runs/{run_id}')
async def demo_status(run_id:str,user:CurrentUser=Depends(require_role('buyer'))):
    async with AsyncSessionLocal() as db:
        r=await db.get(DemoRun,run_id)
        if not r:raise HTTPException(404,'Demo run not found')
        if r.buyer_id!=user.id:raise HTTPException(403,'You cannot view another buyer demo')
        return {'run_id':r.id,'contract_id':r.contract_id,'mode':'DEMO_NO_PAYMENT',
                'payment_processed':False,'status':r.status,'completed_records':len(r.rows),
                'summary':r.summary,'rows':r.rows}

@app.get('/checkout/{skill_id}')
async def checkout(skill_id:str):
    from urllib.parse import quote
    return RedirectResponse('/buyer/skills/'+quote(skill_id,safe=''))

@app.get('/style.css',include_in_schema=False)
async def stylesheet():return FileResponse(root/'frontend/style.css',media_type='text/css')

@app.get('/',include_in_schema=False)
@app.get('/buyer',include_in_schema=False)
@app.get('/buyer/{path:path}',include_in_schema=False)
@app.get('/seller',include_in_schema=False)
@app.get('/seller/{path:path}',include_in_schema=False)
async def frontend_history(path:str=''):
    return FileResponse(root/'frontend/index.html')

app.mount('/assets',StaticFiles(directory=root/'frontend/assets'),name='assets')
app.mount('/app',StaticFiles(directory=root/'frontend',html=True),name='frontend')
app.mount('/integration-examples',StaticFiles(directory=root/'examples'),name='examples')
