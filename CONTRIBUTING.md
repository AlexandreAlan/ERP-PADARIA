# Contributing to ERP Padaria

Thank you for considering contributing! This document covers how to get started, our coding standards, and the pull request process.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Branching Strategy](#branching-strategy)
- [Commit Convention](#commit-convention)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)

---

## Code of Conduct

Be respectful and constructive. We welcome contributors of all backgrounds and skill levels.

---

## Getting Started

1. Fork the repository on GitHub.
2. Clone your fork:
   ```bash
   git clone https://github.com/<your-user>/ERP-PADARIA.git
   cd ERP-PADARIA
   ```
3. Add the upstream remote:
   ```bash
   git remote add upstream https://github.com/AlexandreAlan/ERP-PADARIA.git
   ```

---

## Development Setup

### Backend (FastAPI)

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # edit as needed
python seed_dev.py              # creates SQLite DB with sample data
uvicorn app.main:app --reload --port 8000
```

### Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev                     # starts at http://localhost:5173
```

### Type checking

```bash
cd frontend && npx tsc --noEmit
```

---

## Branching Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Stable, production-ready code |
| `feat/<name>` | New features |
| `fix/<name>` | Bug fixes |
| `refactor/<name>` | Refactoring without behaviour change |
| `docs/<name>` | Documentation only |

Always branch from `main` and open a PR back to `main`.

---

## Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>
```

**Types:** `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `security`

**Examples:**
```
feat(pdv): adiciona desconto percentual por item
fix(caixa): corrige cálculo de troco com múltiplos pagamentos
security: aumenta custo do bcrypt para 14
docs(readme): adiciona seção de deploy Docker
```

One commit per logical change. Do not group unrelated changes in a single commit.

---

## Pull Request Process

1. Ensure your branch is up to date with `main`:
   ```bash
   git fetch upstream && git rebase upstream/main
   ```
2. Run the frontend type check: `cd frontend && npx tsc --noEmit`
3. Open a PR against `main` with:
   - A clear title following the commit convention
   - Description of **what** changed and **why**
   - Any relevant screenshots for UI changes
4. Address review comments; the PR will be merged once approved.

---

## Reporting Bugs

Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.md) and include:

- Steps to reproduce
- Expected vs. actual behaviour
- Environment (OS, Python version, Node version, browser)
- Relevant logs or screenshots

---

## Requesting Features

Use the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.md) with:

- The problem you're solving
- Proposed solution
- Alternatives considered
