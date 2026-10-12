# GearHub Industrial — Full-stack E-commerce Starter

A bilingual (Myanmar / English) industrial equipment store with:
- Product catalog, search, category filtering and price sorting
- Shopping cart stored in the customer's browser
- Order submission and SQLite persistence
- Bank/mobile transfer instructions and transaction reference capture
- Admin login with hashed password and server-side session
- Admin dashboard for orders, payment verification, order status, inventory and product creation
- Demo seed catalog in Burmese and English

## Requirements
- Node.js 20 or newer
- npm

## Run locally
1. Extract the ZIP.
2. In this folder run `npm install`.
3. Copy `.env.example` to `.env`.
4. Edit `.env` and set a strong unique `SESSION_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and your actual bank/mobile wallet details.
5. Run `npm start`.
6. Open `http://localhost:3000` for the store and `http://localhost:3000/admin.html` for admin login.

The admin account is created on first startup from `ADMIN_USERNAME` and `ADMIN_PASSWORD` if that username does not already exist. If you change the environment password after the admin is created, the existing database password is not automatically changed. For local development, delete `data/gearhub.sqlite` to recreate the database and seed data; this deletes local orders too. For a password rotation, use the configured email reset flow; it revokes existing admin sessions.

## Configure transfer payment
Update these `.env` values with verified business details:
- `BANK_NAME`
- `BANK_ACCOUNT_NAME`
- `BANK_ACCOUNT_NUMBER`
- `PAYMENT_INSTRUCTIONS`

The checkout records a transaction reference and creates the order with `payment_status=pending`. An admin must compare the transfer against their bank/mobile wallet and mark it `paid` in the dashboard. The application does not connect directly to a bank or wallet and does not verify payments automatically.

## Database
SQLite file: `data/gearhub.sqlite` (created automatically).
Tables: `admins`, `products`, `orders`.
Order item prices and names are snapshotted at purchase time in `items_json`.

## Production deployment and hardening

See [DEPLOYMENT.md](DEPLOYMENT.md) for the existing Render service's durable disk
configuration, automatic and off-site backups, monitoring, restore drill and
required launch checks. Start with `.env.example`; never commit credentials.
Run `npm test` for security, stock, retry, reset and recovery regression checks.
Run `npm run check:production` in the configured production environment before
publishing. Use one persistent Node instance for the SQLite shop.

## Important behavior
- Prices and stock are enforced server-side when an order is placed.
- The order submission runs in a SQLite transaction and reduces stock.
- Admin API endpoints require a logged-in session.
- Public order creation currently uses a zero delivery fee. Configure delivery pricing before real sales.
- Admin dashboard metrics are derived from persisted orders; only orders marked paid count toward paid sales.

## Repository source of truth

`server.js` is the Node entry point and serves only `public/` plus the configured
public product-upload directory. Storefront/admin HTML, CSS and JavaScript live
in `public/`. The old root-level copies were unused by this server, package
scripts and documentation, and have been removed. Private receipts and backup
archives live under `DATA_DIR` and are never served by the static middleware.

GitHub Actions runs Node 22 `npm ci`, `npm run check` and `npm test` for pushes
and pull requests to main. These checks use temporary fixture databases and
mock delivery providers; they do not need production secrets or send real email.
See `LAUNCH_CHECKLIST.md` for owner-supplied content and deployment gates.
