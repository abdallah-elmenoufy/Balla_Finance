# 💰 Balla Finance

Personal finance tracker tailored for managing money across Egyptian accounts,
BNPL installments (أقساط), and family امانة — built to replace scattered Excel
sheets and WhatsApp threads.

Everything runs **locally on your Mac**. Your data never leaves your machine —
it all lives in one SQLite file: `data/balla.db`.

## What it does

- **Accounts** — mobile wallets, banks, debit/credit cards, BNPL providers
  (Valu, Souhoola, Tru…), cash. Create/archive/delete freely. Multi-currency
  (EGP, USD, SAR, AED, … add more in Settings).
- **Transactions** — expenses, income, transfers between accounts (including
  cross-currency with the rate you actually got), and the امانة types:
  - **امانة In** — someone sends/leaves money with you
  - **Paid for person** — you pay a payee on someone's behalf
  - **Expense on behalf of** — your expense form has an "on behalf of" field
- **امانة People ledger** — every person has a running per-currency balance:
  green = money they left with you (لهم), red = they owe you (عليهم).
  Export a clean **statement (كشف حساب)** as a PNG for WhatsApp or print to PDF.
- **BNPL أقساط** — a purchase creates a full installment schedule with due
  dates; pay each installment from any account; overdue ones turn red on the
  dashboard.
- **Reports** — monthly income / your own spending / paid-for-others, by category.
- **PIN lock** — so guests on your Wi-Fi can't open it. **Backup** — one-click
  download of the database file from Settings.

## First run

```bash
cd ~/Documents/Balla_Finance
npm run build     # only needed once, or after code changes
npm start
```

Open **http://localhost:3210** — you'll be asked to set your PIN, then create
your accounts with today's real balances as *opening balances*.

## Access from your phone / other devices at home

The server listens on your whole home network. Find your Mac's IP
(System Settings → Network, e.g. `192.168.1.10`) and open:

```
http://192.168.1.10:3210
```

Tip: give your Mac a static IP in your router settings so the address never
changes, and "Add to Home Screen" in Safari on your phone for an app-like icon.

## Start automatically when the Mac boots

```bash
cp com.balla.finance.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.balla.finance.plist
```

To stop auto-start: `launchctl unload ~/Library/LaunchAgents/com.balla.finance.plist`

## Backups (important!)

Your entire financial history is the single file `data/balla.db`.

- Easiest: **Settings → 💾 Download backup** — save it to iCloud/Drive regularly.
- To restore: stop the server, replace `data/balla.db` with your backup, start again.

## Reset everything

Stop the server, delete `data/balla.db` (and `balla.db-wal` / `balla.db-shm` if
present), start again — you'll get the fresh setup screen.

## Tech notes (for future changes)

- Next.js 15 (App Router, TypeScript) + Tailwind CSS 4 + better-sqlite3.
- Schema + seeds: `src/lib/db.ts` (tables auto-create on first run).
- All balances are **derived** from transactions — nothing stored, so edits and
  deletes can never corrupt totals. Money is stored as integer minor units.
- Balance/ledger/report queries: `src/lib/queries.ts`. Server actions:
  `src/app/actions/*`. Pages: `src/app/(app)/*`.
- Dev mode: `npm run dev` (also on port 3210).
