"""Pequenas migrações aditivas, aplicadas sozinhas na inicialização.

O projeto não usa Alembic de verdade (só `Base.metadata.create_all`, que cria
tabelas novas mas nunca altera uma já existente) — então uma coluna nova
precisa de um ALTER TABLE em quem já está rodando em produção. Isso aqui é
minúsculo de propósito: só ADD COLUMN idempotente, verificado contra o schema
real antes de tentar. Compatível com Postgres (Docker) e SQLite (instalação
local via .bat/.sh). Cresce por item quando um campo novo entrar num model
existente; nunca reescreve o histórico.
"""

from sqlalchemy import inspect, text
from sqlalchemy.ext.asyncio import AsyncEngine

# (tabela, coluna, tipo DDL) — sintaxe de ADD COLUMN compatível com Postgres e SQLite
_COLUNAS_ADITIVAS: list[tuple[str, str, str]] = [
    ("produtos", "fabricante", "VARCHAR(100)"),
]


def _tabelas_e_colunas(sync_conn) -> tuple[set[str], dict[str, set[str]]]:
    insp = inspect(sync_conn)
    tabelas = set(insp.get_table_names())
    colunas = {
        tabela: {c["name"] for c in insp.get_columns(tabela)}
        for tabela in {t for t, _, _ in _COLUNAS_ADITIVAS} & tabelas
    }
    return tabelas, colunas


async def aplicar_migracoes_aditivas(engine: AsyncEngine) -> None:
    async with engine.begin() as conn:
        tabelas, colunas = await conn.run_sync(_tabelas_e_colunas)

        for tabela, coluna, tipo_sql in _COLUNAS_ADITIVAS:
            if tabela not in tabelas:
                continue  # tabela ainda não existe: create_all já vai criá-la com a coluna
            if coluna in colunas.get(tabela, set()):
                continue  # já aplicada
            await conn.execute(text(f"ALTER TABLE {tabela} ADD COLUMN {coluna} {tipo_sql}"))
