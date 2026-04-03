"""
Proxy routes para o micro-serviço WhatsApp (porta 3001).
Requer perfil admin ou gerente.
"""
import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form
from fastapi.responses import StreamingResponse

from app.dependencies.auth import require_admin_gerente
from app.models.usuario import Usuario

router = APIRouter()

WA_BASE = "http://localhost:3001"
TIMEOUT = 30.0


async def _get(path: str) -> dict:
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        try:
            r = await client.get(f"{WA_BASE}{path}")
            r.raise_for_status()
            return r.json()
        except httpx.ConnectError:
            raise HTTPException(status_code=503, detail="Serviço WhatsApp indisponível (porta 3001)")
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=e.response.text)


async def _post(path: str, json: dict) -> dict:
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        try:
            r = await client.post(f"{WA_BASE}{path}", json=json)
            r.raise_for_status()
            return r.json()
        except httpx.ConnectError:
            raise HTTPException(status_code=503, detail="Serviço WhatsApp indisponível (porta 3001)")
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=e.response.text)


@router.get("/status")
async def status(
    current_user: Usuario = Depends(require_admin_gerente),
):
    return await _get("/status")


@router.get("/qr")
async def qr_code(
    current_user: Usuario = Depends(require_admin_gerente),
):
    return await _get("/qr")


@router.get("/contacts")
async def contacts(
    current_user: Usuario = Depends(require_admin_gerente),
):
    return await _get("/contacts")


@router.get("/chats")
async def chats(
    current_user: Usuario = Depends(require_admin_gerente),
):
    return await _get("/chats")


@router.get("/messages/{chat_id:path}")
async def messages(
    chat_id: str,
    current_user: Usuario = Depends(require_admin_gerente),
):
    return await _get(f"/messages/{chat_id}")


@router.post("/send/text")
async def send_text(
    payload: dict,
    current_user: Usuario = Depends(require_admin_gerente),
):
    return await _post("/send/text", payload)


@router.post("/send/audio")
async def send_audio(
    to: str = Form(...),
    audio: UploadFile = File(...),
    current_user: Usuario = Depends(require_admin_gerente),
):
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        try:
            content = await audio.read()
            files = {"audio": (audio.filename, content, audio.content_type)}
            data = {"to": to}
            r = await client.post(f"{WA_BASE}/send/audio", data=data, files=files)
            r.raise_for_status()
            return r.json()
        except httpx.ConnectError:
            raise HTTPException(status_code=503, detail="Serviço WhatsApp indisponível (porta 3001)")
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
