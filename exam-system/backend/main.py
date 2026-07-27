from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, paper, verify, admin, metrics
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from contextlib import asynccontextmanager
import asyncio, os
from anchor_worker import anchor_loop

@asynccontextmanager
async def lifespan(app: FastAPI):
    interval = int(os.environ.get('ANCHOR_INTERVAL_SECONDS', 3600))
    task = asyncio.create_task(anchor_loop(interval))
    yield
    task.cancel()

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title='Secure Exam System', lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(CORSMiddleware,
    allow_origins=['http://localhost:3000'],
    allow_credentials=True, allow_methods=['*'], allow_headers=['*'])

app.include_router(auth.router)
app.include_router(paper.router)
app.include_router(verify.router)
app.include_router(admin.router)
app.include_router(metrics.router)
from routers import generate
app.include_router(generate.router)

@app.get('/health')
def health(): return {'status': 'ok'}
