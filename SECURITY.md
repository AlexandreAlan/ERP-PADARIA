# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |

## Reporting a Vulnerability

**Please do not open a public issue for security vulnerabilities.**

If you discover a security vulnerability in ERP Padaria, report it responsibly:

1. **Email**: Send details to `alexandre.basto444@gmail.com` with the subject `[SECURITY] ERP-PADARIA`.
2. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (optional)

You will receive an acknowledgement within **48 hours** and a resolution timeline within **7 days**.

## Security Design

ERP Padaria follows security-by-default principles:

- **JWT Authentication** — short-lived access tokens (8h) + refresh tokens (7 days)
- **Bcrypt password hashing** — cost factor ≥ 12
- **Role-based access control** — five profiles: `super_admin`, `admin`, `gerente`, `caixa`, `estoquista`
- **Non-root Docker container** — backend runs as UID 10001
- **CORS** — explicit allowlist via `CORS_ORIGINS` env var
- **Immutable audit log** — all sensitive operations recorded and cannot be deleted via API
- **Secrets in `.env`** — never committed to version control (`.gitignore` enforced)

## Production Hardening Checklist

- [ ] Set `APP_DEBUG=false`
- [ ] Generate a strong `JWT_SECRET_KEY` (≥ 64 random bytes)
- [ ] Restrict `CORS_ORIGINS` to your domain only
- [ ] Use a dedicated PostgreSQL user with minimal privileges
- [ ] Run behind HTTPS reverse proxy (Nginx + Let's Encrypt)
- [ ] Enable daily database backups
