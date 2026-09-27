# Finance multi-currency backend handoff

## Status and deployment dependency

The frontend supports `EUR`, `MAD`, and `USD` as explicit stored currencies and
never converts or combines them. The currently deployed backend still implements
the EUR-only contract described in `ILTO_BE/docs/finances-module.md`. Deploy the
backend contract below before deploying this frontend: the updated category and
bill forms send `currency`, and the existing backend will reject that unknown
field with 422.

The frontend privacy mask is a presentation preference only. It stores only the
selected ISO currency codes, a default entry currency, and a boolean in browser
local storage. It does not stop authenticated API responses from reaching the
browser and is not a backend authorization or encryption feature.

## Required DTO contract

Define one strict currency enum:

```text
FinanceCurrency = "EUR" | "MAD" | "USD"

PaymentType = "cash" | "bank_transfer" | "card" | "mobile_payment" |
              "direct_debit" | "other"
```

Add a non-null `currency: FinanceCurrency` field to every monetary Finance DTO:

- `BudgetCategory`
- `Transaction` (expand the existing EUR-only validation)
- `Bill`
- `TradeEntry`
- `NetWorthSnapshot`

`currency` is writable for category, transaction, and bill POST/PATCH requests.
It remains imported/read-only with trades and net-worth snapshots. Keep all
existing server-owned field rules: clients still cannot send category
`spent_this_month`, IDs, or derived net worth.

PATCH continues to accept any subset, including `{}`. Explicit null remains
invalid. Unknown fields remain 422.

Add required `payment_type: PaymentType` to transaction responses and
POST/PATCH inputs. It is user-entered metadata; the backend must not infer it
from transaction type, category, or description.

## Currency integrity rules

- Do not add exchange rates or silently convert values.
- A transaction currency must equal its referenced budget category currency.
  Reject a mismatch with 422.
- `spent_this_month` must sum only positive expense transactions in the category
  whose transaction currency equals the category currency and whose timestamp is
  in the current UTC month.
- Reject a category currency change with 409 while transactions reference that
  category. The owner must move/delete those transactions explicitly; do not
  relabel or convert stored amounts.
- Bill currencies are independent because bill `category` is free text.
- Trades and net-worth snapshots may coexist in multiple currencies, but the API
  returns their explicit currency and performs no cross-currency aggregate.
- Keep decimal precision and range rules unchanged.

## Database migration

Create a new reviewed Alembic migration after `0003_finances`:

1. Add `currency` to budget categories, bills, trades, and net-worth snapshots.
2. Backfill every existing row with `EUR`.
3. Keep/backfill existing transaction currency as `EUR`.
4. Add non-null transaction `payment_type`, backfilling existing rows as
   `other`, with a check limiting values to the six contract values.
5. Add non-null constraints and checks limiting currencies to `EUR`, `MAD`,
   `USD`.
6. Add any useful `(user_id, currency, date)` indexes used by reads/derivations.
7. Preserve PostgreSQL `NUMERIC`; do not change monetary columns to floats.

Do not auto-apply the migration at API startup. Apply it using the backend's
normal reviewed deployment process and dedicated database.

## Intelligence and trigger synchronization

Finance-derived intelligence must also remain currency-safe:

- `/intelligence/budget-vs-velocity` points should include `currency` and produce
  separate points/series per currency. `budget_pct` may only use categories and
  spending from that currency.
- `/intelligence/net-worth` points should include `currency`; never add snapshots
  from different currencies.
- Financial trigger conditions for `budget_remaining` and `net_worth` should use
  the ISO code (`EUR`, `MAD`, or `USD`) as `condition.unit`. Evaluation must use
  data in that same currency. Existing `%` budget rules remain currency-neutral.
- Trigger logs should preserve the evaluated currency in their summaries.

## Backend tests required

- Accept EUR, MAD, and USD in every applicable DTO; reject any other code and
  explicit null with 422.
- Verify exact POST/PATCH bodies and saved responses include currency.
- Accept all six payment types; reject unknown values and explicit null with
  422, and verify partial PATCH does not replace an omitted payment type.
- Verify transaction/category currency mismatch returns 422.
- Verify category currency changes with dependent transactions return 409.
- Verify `spent_this_month` is UTC-month scoped and currency matched.
- Verify read-only trade/net-worth data returns currency without conversion.
- Verify mixed-currency intelligence output is separated, never summed.
- Verify all records remain scoped to the signed-in owner.
- Re-run existing 404, 409, 422, 503, ordering, empty-array, and session tests.

## User time-zone preference

The frontend now accepts one IANA time-zone identifier (for example
`Africa/Casablanca`) and uses it for the live clock, instant display, and
`datetime-local` to UTC conversion. Until backend synchronization is added, it
is stored only in browser local storage.

Add an owner-protected, user-scoped preference contract:

```text
GET   /api/v1/preferences
      -> 200 { "time_zone": "Africa/Casablanca" }

PATCH /api/v1/preferences
      body exactly { "time_zone": "America/New_York" }
      -> 200 { "time_zone": "America/New_York" }
```

- Store an IANA zone name per signed-in user; never store only a current UTC
  offset because daylight-saving and government rules change.
- Validate the identifier with the runtime's IANA/tzdata database. Reject
  unknown values, null, extra fields, and non-strings with 422.
- Default an existing user with no stored preference to `UTC` (or perform an
  explicit migration/backfill to `UTC`). Do not infer a zone from IP address.
- Keep all domain timestamps as timezone-aware UTC instants. The preference is
  for entry/presentation and calendar-boundary logic that explicitly requires
  a user's zone; do not rewrite stored timestamps when the preference changes.
- Scope both reads and writes to the authenticated user and preserve the owner
  session/CORS/Origin contract.
- Add isolation tests proving one user cannot read or mutate another user's
  preference, plus 401, 422, persistence, and IANA daylight-saving cases.

Once these endpoints are deployed, the frontend needs a small follow-up to load
the server preference after session establishment and PATCH it from Settings,
using local storage only as an offline/browser bootstrap cache.

## Recommended rollout order

1. Implement and test the backend migration, models, schemas, derivations, and
   intelligence output.
2. Apply the migration to the target backend database and deploy the API.
3. Verify an authenticated disposable EUR, MAD, and USD
   category/transaction/bill cycle, all payment types, and the user preference,
   then delete only those exact Finance records in dependency order.
4. Deploy the frontend.
5. Verify the frontend through the same-origin `/api/v1` proxy: create each
   currency, confirm summaries change when the preferred currency changes, and
   confirm a refresh preserves server records.
