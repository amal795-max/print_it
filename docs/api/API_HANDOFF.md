# Print It — Frontend / Backend API Handoff (Contract v1.3, REVIEW)

**Source of truth:** `docs/api/openapi.yaml` (OpenAPI `1.3.0`). The HTTP base path stays `/api/v1`.

> Contract revision for team review; not a claim that routes are implemented or tested. v1.3 is **breaking** relative to the merged v1.2 contract. Agree the change with the frontend and backend before treating it as the adopted contract. In particular, verify Auth with its backend owner.

## What changed from v1.2?

Read `docs/api/FRONTEND_CHANGELOG_v1_3_AR.md` for the full field-level comparison. Summary:

- Money fields use PostgreSQL `NUMERIC(12,2)` and **JSON decimal strings** (e.g. `"150.00"`, denominated in `SYP`), replacing integer `*Minor` amounts. Backend computes/validates all prices; never trust price amounts sent by the browser.
- Product variants are `IN_STOCK` or `MADE_TO_ORDER`; product pictures are shared across its variants. `GET /products` can return `startingPrice`. Cart state remains in the browser, not a backend table or endpoint.
- Custom requests start at `SUBMITTED` with text, optional measurements and 1–5 attached photos (JPEG/PNG/WebP; up to 10 MiB per photo). No draft or device-specific fields. States: `SUBMITTED`, `UNDER_REVIEW`, `NEEDS_INFO`, `REJECTED`, `QUOTED`.
- Each Custom Request may have **one Quote** (7-day default validity); its `unitPrice` includes design and manufacture. Quote `total` equals `unitPrice × quantity` and excludes shipping; `estimatedCost` is internal to admins.
- Fixed shipping is added **once at Order creation** and displayed in the Order before mock payment. `Order.total = subtotal + shippingFee`.
- Shipping address is a single `shippingAddress` object for both Catalog checkout and Custom Quote acceptance. **Required:** `recipientName`, `phone`, `city`, `details`. **Optional:** `latitude` and `longitude`, which must be supplied **together** or **both omitted**. The client must NOT send the previous address keys `fullName`, `region`, `street`, `postalCode` or `deliveryNotes` (nor `district`). Map coordinates do not change the fixed shipping fee. The backend validates the address DTO before storing it as a JSONB snapshot on the Order.
- Custom Reorder is a **new request** with optional `sourceRequestId` based on a previous Custom Order that is `DELIVERED` or `CANCELLED`. The customer may review/modify the quantity; a new quote is required. Old request, quote and order stay unchanged.
- An Order Item references **exactly one** of a catalog variant or a custom quote, and its own snapshot quantity and unit price. One review per Order Item after delivery. No order status history endpoint/table.
- Mock payment can be retried after failure. Successful payment and conditional IN_STOCK deduction must be atomic, using idempotency and a single successful attempt per Order.

## Authentication: contract vs implementation

Proposed endpoints include register, verify OTP, resend OTP, login, me, logout, and CSRF token. Sessions use cookies, not JWT. **The following are not verified as implemented**: exact `Set-Cookie` name and attributes, CORS origin/credentials, CSRF issue/validation/403 response, OTP resend endpoint, Redis backing, and exact DTO/error responses. Coordinate with the Auth teammate before the frontend treats these as working routes.

For cross-origin browser calls using cookie sessions, the frontend will generally need `credentials: 'include'` and a compatible server CORS/cookie setup. Confirm actual local frontend/backend origins and deployment setup together.

## Implementation / review boundaries

- `docs/architecture/Print_It_ERD_v1_3_Editable.drawio` is the proposed logical diagram.
- `docs/architecture/schema_review.sql` is **review DDL** and **has not been run as a migration**. Select the ORM, then convert and test with PostgreSQL.
- Monetary representation, application validation, status transitions, ownership checks, concurrency and idempotency need service-layer tests. Static document checks are not runtime tests.
- Agree the fixed shipping amount (configured on backend), final cookie/CSRF behavior, upload storage, and ORM before declaring implementation-ready.

## Suggested review checklist

1. Backend: confirm table names/constraints and which DTOs/controllers will implement v1.3.
2. Auth owner: confirm actual endpoints, `Set-Cookie`, OTP, CSRF and CORS; update OpenAPI if different.
3. Frontend: acknowledge breaking changes, especially string money, custom quote totals, Order shipping and Reorder.
4. After approval: merge the docs PR. Keep `/api/v1` path unchanged. Implement and test DB migrations/API in code PRs, separately from docs approval.
