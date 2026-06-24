# Sicarios Cartel — PRD

## Original Problem Statement
Romanian GTA-RP cartel management site: weekly task, pontaj (attendance), loterie, jafuri (robberies), fonduri (funds), members, reports, login with Discord. Pontaj = hours/day. Jafuri = magazin/banca, amount, location, details. Loterie = winner, amount won, tickets sold. Fonduri = weekly total from jafuri + loterie. Discord client id 837668671341068298, guild 1519343688331952278.

## Architecture
- Backend: FastAPI + MongoDB (motor). JWT auth. Routes under /api.
- Frontend: React + Tailwind + shadcn, dark cartel theme (Bebas Neue / IBM Plex Sans), recharts.
- Auth: Discord OAuth2 (real, restricted to guild 1519343688331952278) + quick demo login. First registered user => admin (Boss).

## User Personas
- Boss/Admin: manages tasks, lottery, funds, reports, member roles.
- Member (Sicario): logs own pontaj and jafuri, views dashboards.

## Core Requirements (static)
- Role-based access: only admin edits funds/tasks/reports/lottery + manages roles.
- Weekly scoping (ISO week) across all modules.

## Implemented (2026-06-24)
- Discord OAuth2 login (guild-restricted) + demo login; JWT sessions.
- Modules: Dashboard, Task Saptamanal, Pontaj, Jafuri, Loterie (admin-only create), Fonduri (auto weekly aggregation), Rapoarte (charts + rankings), Membri (role mgmt).
- Funds = jafuri_total + loterie_revenue per week. Full CRUD with permission checks.
- Verified: 17/17 backend tests + 14/14 frontend flows passed.

## Backlog / Next
- P1: Discord avatar/role sync from guild; restrict demo login or remove for production.
- P2: Loterie Field(ge=0) validators; export reports (CSV); audit log of admin actions.
- P2: Migrate FastAPI on_event -> lifespan; rotate JWT_SECRET for production.
