"""Run separately: python demo_worker.py"""
import asyncio
import logging
from demo_core import init_demo, claim_demo, evaluate, finish_error, expire_demo
from config import get_settings

async def main():
    await init_demo()
    logging.info('Demo worker ready — real Ollama evaluation; no payments processed')
    while True:
        try:
            await expire_demo()
            run_id = await claim_demo()
            if not run_id:
                await asyncio.sleep(2)
                continue
            logging.info('Starting %s', run_id)
            try:
                await asyncio.wait_for(evaluate(run_id), timeout=get_settings()['MAX_JOB_RUNTIME_SECONDS'])
            except Exception as exc:
                logging.exception('Demo evaluation failed')
                await finish_error(run_id, 'Demo runtime error: '+type(exc).__name__+'. Check worker logs.')
            logging.info('Finished %s', run_id)
        except Exception:
            logging.exception('Demo queue error')
            await asyncio.sleep(3)

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())
