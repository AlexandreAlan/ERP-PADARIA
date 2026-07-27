"""Infra de testes: banco SQLite in-memory isolado por teste.

Aponta DATABASE_URL/JWT_SECRET_KEY pra valores de teste ANTES de importar
qualquer módulo do app (o `config`/`database` leem settings no import). Cada
teste recebe uma sessão async ligada a um SQLite em memória compartilhado
(StaticPool), com todas as tabelas criadas a partir do metadata dos models.
"""

import os

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-with-at-least-32-chars!!")
os.environ.setdefault("APP_DEBUG", "false")

import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.database import Base
import app.models  # noqa: F401  — registra TODOS os models no Base.metadata


@pytest_asyncio.fixture
async def engine():
    eng = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    await eng.dispose()


@pytest_asyncio.fixture
async def db(engine) -> AsyncSession:
    maker = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    async with maker() as session:
        yield session
