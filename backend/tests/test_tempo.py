"""Fronteiras de dia no fuso do negócio: uma venda feita às 22h de Brasília
(01h UTC do dia seguinte) tem que continuar dentro do filtro de "hoje"."""

from datetime import date, datetime

from app.utils.tempo import limites_do_dia_local


def test_limites_cobrem_o_dia_inteiro_em_utc():
    inicio, fim = limites_do_dia_local(date(2026, 8, 1), date(2026, 8, 1))

    # Meia-noite em Brasília (UTC-3) é 03:00 UTC do mesmo dia.
    assert inicio == datetime(2026, 8, 1, 3, 0, 0)
    # 23:59:59.999999 em Brasília é 02:59:59.999999 UTC do dia seguinte.
    assert fim == datetime(2026, 8, 2, 2, 59, 59, 999999)


def test_venda_das_22h_brasilia_fica_dentro_do_filtro_de_hoje():
    # 22h de Brasília em 01/08 = 01:00 UTC de 02/08 — é isso que datetime.utcnow() guardaria.
    venda_utc = datetime(2026, 8, 2, 1, 0, 0)

    inicio, fim = limites_do_dia_local(date(2026, 8, 1), date(2026, 8, 1))
    assert inicio <= venda_utc <= fim


def test_periodo_de_varios_dias():
    inicio, fim = limites_do_dia_local(date(2026, 8, 1), date(2026, 8, 5))
    assert inicio == datetime(2026, 8, 1, 3, 0, 0)
    assert fim == datetime(2026, 8, 6, 2, 59, 59, 999999)
