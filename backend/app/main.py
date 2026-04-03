from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.routers import (
    auth,
    usuarios,
    categorias,
    fornecedores,
    produtos,
    estoque,
    caixa,
    vendas,
    compras,
    dashboard,
    relatorios,
    auditoria,
    configuracoes,
    whatsapp,
)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    import os
    os.makedirs(settings.upload_dir, exist_ok=True)
    yield
    # Shutdown (connection pool cleanup is handled by SQLAlchemy)


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    docs_url="/api/docs" if settings.app_debug else None,
    redoc_url="/api/redoc" if settings.app_debug else None,
    openapi_url="/api/openapi.json" if settings.app_debug else None,
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files (uploads)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

# API Routers
PREFIX = "/api"
app.include_router(auth.router,         prefix=f"{PREFIX}/auth",        tags=["Auth"])
app.include_router(usuarios.router,     prefix=f"{PREFIX}/usuarios",     tags=["Usuários"])
app.include_router(categorias.router,   prefix=f"{PREFIX}/categorias",   tags=["Categorias"])
app.include_router(fornecedores.router, prefix=f"{PREFIX}/fornecedores", tags=["Fornecedores"])
app.include_router(produtos.router,     prefix=f"{PREFIX}/produtos",     tags=["Produtos"])
app.include_router(estoque.router,      prefix=f"{PREFIX}/estoque",      tags=["Estoque"])
app.include_router(caixa.router,        prefix=f"{PREFIX}/caixa",        tags=["Caixa"])
app.include_router(vendas.router,       prefix=f"{PREFIX}/vendas",       tags=["Vendas"])
app.include_router(compras.router,      prefix=f"{PREFIX}/compras",      tags=["Compras"])
app.include_router(dashboard.router,    prefix=f"{PREFIX}/dashboard",    tags=["Dashboard"])
app.include_router(relatorios.router,   prefix=f"{PREFIX}/relatorios",   tags=["Relatórios"])
app.include_router(auditoria.router,       prefix=f"{PREFIX}/auditoria",       tags=["Auditoria"])
app.include_router(configuracoes.router,   prefix=f"{PREFIX}/configuracoes",   tags=["Configurações"])
app.include_router(whatsapp.router,        prefix=f"{PREFIX}/whatsapp",         tags=["WhatsApp"])


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "app": settings.app_name}
