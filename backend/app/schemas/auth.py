from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: str
    senha: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    usuario_id: int
    usuario_nome: str
    perfil: str


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenData(BaseModel):
    usuario_id: int
    perfil: str
