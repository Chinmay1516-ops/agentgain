"""Read routes required by the connected frontend; no secrets or private skill text."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from auth import CurrentUser, get_current_user, require_role
from database import AsyncSessionLocal
from models import SkillPackage, EvaluationContract
from demo_core import DemoRun
from config import get_settings
router = APIRouter()

def public_skill(s):
    return dict(skill_id=s.id,version=s.version,seller_id=s.seller_id,title=s.title,
                description=s.description,price_usd=str(s.price_usd),currency=s.currency,
                content_sha256=s.content_sha256,supported_tasks=s.supported_tasks,
                seller_eval_policy=s.seller_eval_policy,licence_terms=s.licence_terms)

@router.get('/api/ui-config')
async def ui_config():
    settings=get_settings()
    return {'mode':'DEMO_NO_PAYMENT','models':settings['ALLOWED_OLLAMA_MODELS'],
            'min_eval_records':settings['MIN_EVAL_RECORDS']}

@router.get('/api/me')
async def me(user: CurrentUser=Depends(get_current_user)):
    return {'id':user.id,'role':user.role}

@router.get('/api/skills')
async def skills():
    async with AsyncSessionLocal() as db:
        rows=(await db.execute(select(SkillPackage).order_by(SkillPackage.title,SkillPackage.id))).scalars().all()
        return {'skills':[public_skill(s) for s in rows]}

@router.get('/api/seller/skills')
async def seller_skills(user: CurrentUser=Depends(require_role('seller'))):
    async with AsyncSessionLocal() as db:
        rows=(await db.execute(select(SkillPackage).where(SkillPackage.seller_id==user.id)
                              .order_by(SkillPackage.title,SkillPackage.id))).scalars().all()
        return {'skills':[public_skill(s) for s in rows]}

@router.get('/api/my/contracts')
async def my_contracts(user: CurrentUser=Depends(require_role('buyer'))):
    async with AsyncSessionLocal() as db:
        rows=(await db.execute(select(EvaluationContract,SkillPackage,DemoRun)
            .join(SkillPackage,SkillPackage.id==EvaluationContract.skill_id)
            .outerjoin(DemoRun,DemoRun.contract_id==EvaluationContract.id)
            .where(EvaluationContract.buyer_id==user.id)
            .order_by(EvaluationContract.created_at.desc()))).all()
        return {'contracts':[{'contract_id':c.id,'skill_id':s.id,'title':s.title,
                'status':c.status.value,'payment_state':c.payment_state.value,
                'demo_run_id':r.id if r else None,'demo_status':r.status if r else None}
                for c,s,r in rows]}

@router.get('/api/seller/{skill_id}/demo-outcomes')
async def demo_outcomes(skill_id:str,user:CurrentUser=Depends(require_role('seller'))):
    async with AsyncSessionLocal() as db:
        skill=await db.get(SkillPackage,skill_id)
        if not skill or skill.seller_id!=user.id:
            raise HTTPException(404,'Seller skill not found')
        runs=(await db.execute(select(DemoRun).join(EvaluationContract,DemoRun.contract_id==EvaluationContract.id)
            .where(EvaluationContract.skill_id==skill_id))).scalars().all()
        counts={key:0 for key in ['PASS','FAIL','INCONCLUSIVE','TECHNICAL_ERROR','QUEUED','RUNNING']}
        for r in runs:
            outcome=(r.summary or {}).get('verdict') if r.status=='COMPLETED' else r.status
            if outcome in counts: counts[outcome]+=1
        return {'mode':'DEMO_NO_PAYMENT','demo_run_count':len(runs),'outcomes':counts,
                'payment_processed':False,'note':'Demo evaluations are not purchases or revenue.'}
