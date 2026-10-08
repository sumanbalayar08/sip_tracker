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

## The sheet

Edit the sheet directly, then press **Refresh from sheet** in the app.

| Tab | What goes there |
|---|---|
| `funds` | One row per fund. `active` = TRUE for funds you hold, FALSE for funds you only compare against. Update `current_nav` and `nav_date` monthly; set `units_held` from MeroShare (if blank, units are summed from transactions). |
| `NIBLSF`, `NFCF`, … | One transactions tab per fund you hold, named by its code. Columns: `id, date, type, amount, nav, units, note`. `type`: `SIP`, `DIV_CASH`, `DIV_REINVEST`, `REDEEM`. |
| `nav_history` | Month-end NAVs (`fund_code, date, nav`) for the Compare page. Purchase NAVs from your fund tabs are added automatically. |
| `dividends` | Cash dividends per fund (`fund_code, book_close_date, cash_pct`) for the Compare page. |
| `settings` | `fd_rate`, `inflation`, `step_up`, `scenarios` (e.g. `0.08,0.10,0.12`), `horizon_years`, and optional `monthly_sip_<CODE>` to override the SIP the Projection page assumes. |
| `snapshots` | Reserved for monthly snapshots (not used yet). |

XIRR treats SIPs as money in, cash dividends and redemptions as money out, and current value (units × NAV on `nav_date`) as the final inflow.

## Pages

- **Overview**: value, invested, gain and XIRR per fund and in total.
- **Projection**: 20–35 year projection from today's value and SIPs, with three return scenarios, yearly SIP step-up and inflation ("today's money").
- **Compare**: replays your SIP dates and amounts into other funds using `nav_history` and `dividends`, to show what you'd have now.

## Deploy (Vercel)

Import the repo in Vercel and add the same env vars from `.env.example`. For `GOOGLE_SA_KEY` on Vercel, the base64 form avoids newline issues.

## Scripts

- `pnpm dev` / `pnpm build`
- `pnpm test` – unit tests for XIRR, dates, metrics
- `pnpm sheet:init` – create/verify tabs, including one tab per fund you hold (safe to re-run)
- `pnpm sheet:split` – move rows from the old single `transactions` tab into per-fund tabs
- `pnpm sheet:seed-compare` – load comparison funds, monthly NAVs and dividends from `data/compare-seed.json`

For local work without Google access, set `SHEETS_FIXTURE=path/to/workbook.json` (dev only).

## Roadmap

1. ✅ Sheets client, schema bootstrap, password login, read-only dashboard
2. ✅ Per-fund tabs, projection, fund comparison
3. Add/edit transactions and NAVs in-app
4. Monthly snapshots via Vercel Cron, yearly review page
