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

The admin account is created on first startup from `ADMIN_USERNAME` and `ADMIN_PASSWORD` if that username does not already exist. If you change the environment password after the admin is created, the existing database password is not automatically changed. For local development, delete `data/gearhub.sqlite` to recreate the database and seed data; this deletes local orders too. For a production password rotation, implement a secure password-change flow or update the admin hash through a controlled maintenance script.

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

## Production checklist — required before public launch
This is a functional starter, not a fully audited production service.
1. Deploy behind HTTPS and set `NODE_ENV=production`, a secure `PUBLIC_ORIGIN`, and a long random `SESSION_SECRET`.
2. Replace the default/sample catalog, stock, prices, and placeholder bank details.
3. Replace Express's default in-memory session store with a persistent production session store (e.g. Redis or SQLite-backed sessions) so sessions survive restarts and scale safely.
4. Add CSRF protection to session-authenticated state-changing admin routes and a tailored Content Security Policy; the current Helmet CSP is disabled to allow the simple inline-free frontend assets and should be tightened for your deployment.
5. Add database backups, monitoring, automated tests, operational logging and a tested recovery process.
6. Review cancellation/refund stock rules and require appropriate authorization for payment status and order status transitions.
7. Add privacy policy, terms, shipping fees/zones, warranty/returns, support contacts, SEO, and any tax/accounting requirements.
8. Consider a real bank/wallet payment provider integration if automatic payment confirmation is required.
9. Set upload size/type rules and scan files if adding payment-slip uploads. This starter intentionally collects a transaction reference only and does not accept uploaded slips.
10. Test mobile layout, keyboard accessibility, Burmese fonts, all order paths, stock race conditions, and admin permissions before taking live orders.

## Important behavior
- Prices and stock are enforced server-side when an order is placed.
- The order submission runs in a SQLite transaction and reduces stock.
- Admin API endpoints require a logged-in session.
- Public order creation currently uses a zero delivery fee. Configure delivery pricing before real sales.
- Admin dashboard metrics are derived from persisted orders; only orders marked paid count toward paid sales.
