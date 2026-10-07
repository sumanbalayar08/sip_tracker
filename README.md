# SIP Tracker

Next.js app that tracks mutual fund SIPs (invested, current value, gain, XIRR vs FD rate), using a Google Sheet as the database. Deploys to Vercel.

## Setup

1. **Google service account**
   - GCP console → create a project → enable **Google Sheets API**.
   - IAM → Service accounts → create one → Keys → Add key → JSON.
2. **Sheet**: create an empty Google Sheet and share it with the service-account email as **Editor**.
3. **Env**: `cp .env.example .env.local` and fill it in.
4. Install and create the tabs:
   ```bash
   pnpm install
   pnpm sheet:init   # creates funds / transactions / nav_history / snapshots / settings tabs, seeds NIBLSF + NFCF
   pnpm dev
   ```

## Using it (milestone 1)

Edit the sheet directly, then press **Refresh from sheet** in the app.

| Tab | What to put there |
|---|---|
| `funds` | One row per fund. Update `current_nav` and `nav_date` monthly. Optionally set `units_held` from MeroShare; if blank, units are summed from transactions. |
| `transactions` | One row per event. `type`: `SIP`, `DIV_CASH`, `DIV_REINVEST`, `REDEEM`. `amount` in Rs. `nav` at purchase (units = amount / nav if `units` is blank). Dates as `YYYY-MM-DD`. |
| `settings` | `fd_rate` (e.g. `0.0414`). |

XIRR treats SIPs as money in, cash dividends and redemptions as money out, and current value (units × NAV on `nav_date`) as the final inflow.

## Deploy (Vercel)

Import the repo in Vercel and add the same env vars from `.env.example`. For `GOOGLE_SA_KEY` on Vercel, the base64 form avoids newline issues.

## Scripts

- `pnpm dev` / `pnpm build`
- `pnpm test` – unit tests for XIRR, dates, metrics
- `pnpm sheet:init` – create/verify sheet tabs (safe to re-run)

## Roadmap

1. ✅ Sheets client, schema bootstrap, password login, read-only dashboard
2. Add/edit transactions in-app, bulk SIP generator, NAV updates
3. Charts (value vs invested)
4. Monthly snapshots via Vercel Cron, yearly review page
