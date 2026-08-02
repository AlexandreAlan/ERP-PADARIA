"""
Fronteiras de dia no fuso do negócio (Brasil), convertidas pro UTC ingênuo
que o resto do sistema usa pra guardar timestamp (`datetime.utcnow()`).

Sem isso, "hoje" comparado direto contra UTC perde as vendas feitas entre
~21h e meia-noite (horário de Brasília): nesse intervalo o relógio UTC já
virou o dia seguinte, então uma venda das 22h ficava fora do filtro de
"hoje" até alguém pedir o dia seguinte também.
"""

from datetime import date, datetime
from zoneinfo import ZoneInfo

from app.config import get_settings


def hoje_local() -> date:
    """Que dia é hoje agora mesmo, no fuso do negócio — não no fuso de quem
    roda o processo (o servidor/CI pode estar em UTC)."""
    settings = get_settings()
    agora_utc = datetime.now(ZoneInfo("UTC"))
    return agora_utc.astimezone(ZoneInfo(settings.report_timezone)).date()


def limites_do_dia_local(data_inicio: date, data_fim: date) -> tuple[datetime, datetime]:
    """Meia-noite de `data_inicio` até 23:59:59 de `data_fim`, no fuso do
    negócio, convertidas pro UTC ingênuo (sem tzinfo) — o mesmo formato de
    `Venda.created_at`."""
    settings = get_settings()
    fuso = ZoneInfo(settings.report_timezone)

    inicio_local = datetime.combine(data_inicio, datetime.min.time(), tzinfo=fuso)
    fim_local = datetime.combine(data_fim, datetime.max.time(), tzinfo=fuso)

    inicio_utc = inicio_local.astimezone(ZoneInfo("UTC")).replace(tzinfo=None)
    fim_utc = fim_local.astimezone(ZoneInfo("UTC")).replace(tzinfo=None)
    return inicio_utc, fim_utc
