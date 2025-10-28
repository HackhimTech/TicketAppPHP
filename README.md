# TicketApp — PHP + Twig implementation

## What this is

A full implementation of the Stage 2 Ticket Web App using PHP + Twig and file-based storage. Includes:

- Landing page (wave hero + circles)
- Authentication (login/signup)
- Dashboard (stats + recent tickets)
- Ticket Management (Create, Read, Update, Delete)
- Client-side and server-side validation
- Session simulation: `localStorage.ticketapp_session` stores API session returned by server

## Requirements

- PHP 8+
- Composer

## Install & run

1. `composer install`
2. `php -S localhost:8000 -t public`
3. Open `http://localhost:8000/`

## Example account

- username: `demo`
- password: `demo123`

## Notes

- API endpoints: `public/api.php?action=login|signup|logout|tickets|ticket&id=...`
- Session token must be passed in `X-Session-Token` header for protected endpoints; frontend does this automatically.
- Storage files in `storage/` — `users.json`, `tickets.json`, `sessions.json`.
- This is a demo/local app — not suitable for production (passwords in plain text, no DB, no CSRF protection).
