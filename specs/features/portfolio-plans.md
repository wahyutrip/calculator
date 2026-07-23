# Feature — Saved Plans (Portfolio)

Persistence for the MVP. Everything lives in the browser; no account, no server.

Routes: `/portfolio`, `/plan/[id]` · Storage: `localStorage`

---

## 1. Why localStorage, and what that costs

The MVP has no accounts, so there is nowhere on a server to attach data to. That
is a deliberate trade for a frictionless first use, and it has consequences that
must be visible **to the user**, not just documented here:

- Plans live on **one browser on one device**. Clearing site data deletes them.
- Private/incognito windows lose everything on close.
- iOS Safari evicts localStorage for sites unused for ~7 days — but **not** for
  sites installed to the home screen. This is a concrete reason to promote
  installing the PWA, and the empty state says so.

`/portfolio` therefore carries a permanent, quiet line:

> *Rencana disimpan di browser ini saja. Install aplikasi agar data tidak hilang.*

---

## 2. Data model

```ts
interface SavedPlan {
  id: string;              // crypto.randomUUID()
  ticker: string | null;
  name: string;            // defaults to `${ticker} ${date}`, editable
  status: 'draft' | 'filled';
  input: PlanInput;        // the exact inputs — never the derived output
  existing?: ExistingPosition;  // set when status === 'filled'
  createdAt: string;       // ISO 8601 UTC
  updatedAt: string;
}

interface PlanStoreV1 {
  version: 1;
  plans: SavedPlan[];
}
```

**Only inputs are stored, never computed results.** Results are derived on read.
Storing them would let a stored figure drift from the engine after any fix, and a
saved plan showing numbers the current engine disagrees with is worse than no
saved plan.

---

## 3. Storage contract

```ts
interface PlanRepository {
  list(): Promise<SavedPlan[]>;
  get(id: string): Promise<SavedPlan | null>;
  save(plan: SavedPlan): Promise<SavedPlan>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
}
```

The MVP ships `LocalStoragePlanRepository`. Phase 2 adds `ApiPlanRepository`
against the same interface, so no component changes when the backend lands.

The interface is **async even though localStorage is synchronous.** Making it
sync now would force every call site to be rewritten when the API arrives; the
cost today is one `await`.

### 3.1 Keys and versioning

| Key | Contents |
|---|---|
| `mm:plans:v1` | `PlanStoreV1` as JSON |
| `mm:plans:v1:corrupt` | Quarantined blob that failed to parse or validate |
| `mm:prefs:v1` | Theme, recent tickers, last-used risk and fee presets |

Read path, in order:

1. Read the key. Absent → return an empty store. Not an error.
2. `JSON.parse`. Throws → quarantine and return empty.
3. Validate with the zod schema. Fails → quarantine and return empty.
4. `version < CURRENT` → run migrations in sequence, write back, continue.

**Quarantine, never discard.** A corrupt blob is moved to
`mm:plans:v1:corrupt` (overwriting any previous one) before the store resets.
Someone's trading plans are worth more than a clean key, and a support request
becomes recoverable instead of a shrug.

Writes are validated *before* being written. Persisting a shape the reader will
reject is a self-inflicted corruption.

### 3.2 Quota

localStorage is ~5MB. A plan is well under 1KB, so the practical ceiling is
thousands of plans. Handle it anyway: `QuotaExceededError` on write surfaces
*"Penyimpanan browser penuh. Hapus beberapa rencana lama."* and leaves the
existing store untouched — a failed write must never truncate what is already
saved.

### 3.3 Cross-tab

A `storage` event listener keeps open tabs consistent. Without it, two tabs
silently overwrite each other and the user watches a plan vanish.

---

## 4. Screens

### `/portfolio`

A list, newest first. Each row: ticker, name, status pill, total lots, average,
total modal, date.

Row actions: **Buka** · **Duplikat** · **Tandai terisi** · **Average down/up** ·
**Hapus**.

- **Tandai terisi** converts a plan to a held position, seeding
  `existing` from the plan's *actual* (whole-lot) totals — the fractional
  planned figures were never bought. It asks for confirmation and allows editing
  the lots and average, because real fills differ from plans.
- **Hapus** requires confirmation and offers a 5-second **Urungkan** on the
  toast. Deletion is the only destructive action here and it is one tap.

Empty state points back to the calculator and explains the storage caveat.

### `/plan/[id]`

The calculator with the plan's inputs restored. The header shows the plan name
(editable inline) and status. Editing marks it dirty; **Simpan** updates in
place, **Simpan sebagai baru** forks it.

An unknown id renders a not-found state with a link to `/portfolio` — never a
blank calculator, which would look like the plan was silently wiped.

---

## 5. Tests

- Round-trip: save → reload → identical inputs.
- Corrupt blob → quarantined, store resets, app still loads.
- Unknown future `version` → treated as corrupt rather than parsed optimistically.
- `QuotaExceededError` → existing plans intact, error surfaced.
- Cross-tab `storage` event → second tab reflects the change.
- Mark-filled derives `existing` from actual lots, not planned.
- E2E: save → hard reload → the plan is present and reopens with the same result.
