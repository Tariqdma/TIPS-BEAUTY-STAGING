# Supabase database

The production project is `eaomyiihsuikinkdhwzy`.

Applied migrations:

- `secure_store_schema_and_delivery_foundation`
- `secure_order_creation_and_tracking`
- `restrict_anonymous_table_grants`

These migrations secure row-level access, add delivery zones, drivers, order status history, order numbers, and the `create_order` RPC that validates stock and recalculates totals server-side.

## Required dashboard setting

Enable leaked-password protection in Supabase Dashboard under Authentication settings. This is an Auth project setting rather than a SQL migration.

## Runtime expectations

- Customers must be authenticated before checkout and order tracking.
- Public access is limited to products, active promotions, reviews, and active delivery zones.
- Admin operations require `profiles.role = 'admin'` and are enforced by RLS.
- Payment providers other than cash on delivery remain placeholders until their server-side integrations and webhooks are configured.
