BEGIN;

CREATE OR REPLACE FUNCTION public.get_storefront_collections()
RETURNS TABLE(
  id uuid,
  slug text,
  name_ar text,
  description_ar text,
  icon text,
  display_order integer,
  product_ids uuid[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.slug,
    c.name_ar,
    c.description_ar,
    c.icon,
    c.display_order,
    COALESCE(
      CASE c.rule_type
        WHEN 'manual' THEN (
          SELECT array_agg(cpm.product_id ORDER BY cpm.display_order)
          FROM public.storefront_collection_products cpm
          JOIN public.products p ON p.id = cpm.product_id
          WHERE cpm.collection_id = c.id AND COALESCE(p.stock, 0) > 0
        )
        WHEN 'newest' THEN (
          SELECT array_agg(s.id ORDER BY s.created_at DESC)
          FROM (
            SELECT p.id, p.created_at FROM public.products p
            WHERE COALESCE(p.stock, 0) > 0
            ORDER BY p.created_at DESC
            LIMIT GREATEST(1, COALESCE((c.rule_config->>'limit')::integer, 12))
          ) s
        )
        WHEN 'best_sellers' THEN COALESCE((
          SELECT array_agg(s.product_id ORDER BY s.order_count DESC, s.latest_order DESC)
          FROM (
            SELECT (item->>'id')::uuid AS product_id, COUNT(*) AS order_count, MAX(o.created_at) AS latest_order
            FROM public.orders o
            CROSS JOIN LATERAL jsonb_array_elements(COALESCE(o.items, '[]'::jsonb)) item
            JOIN public.products p ON p.id = (item->>'id')::uuid
            WHERE o.status IN ('confirmed', 'preparing', 'shipped', 'delivered') AND COALESCE(p.stock, 0) > 0
            GROUP BY (item->>'id')::uuid
            ORDER BY order_count DESC, latest_order DESC
            LIMIT 12
          ) s
        ), (
          SELECT array_agg(s.id ORDER BY s.created_at DESC)
          FROM (SELECT id, created_at FROM public.products WHERE COALESCE(stock, 0) > 0 ORDER BY created_at DESC LIMIT 12) s
        ))
        WHEN 'discount' THEN (
          SELECT array_agg(s.id ORDER BY s.discount_percentage DESC, s.created_at DESC)
          FROM (
            SELECT p.id, p.discount_percentage, p.created_at FROM public.products p
            WHERE COALESCE(p.stock, 0) > 0 AND COALESCE(p.discount_percentage, 0) >= COALESCE((c.rule_config->>'minimum_discount')::numeric, 1)
            ORDER BY p.discount_percentage DESC, p.created_at DESC LIMIT 12
          ) s
        )
        WHEN 'price_under' THEN (
          SELECT array_agg(s.id ORDER BY s.final_price ASC, s.created_at DESC)
          FROM (
            SELECT p.id, p.created_at, p.price * (1 - COALESCE(p.discount_percentage, 0) / 100) AS final_price
            FROM public.products p
            WHERE COALESCE(p.stock, 0) > 0 AND p.price * (1 - COALESCE(p.discount_percentage, 0) / 100) <= COALESCE((c.rule_config->>'price')::numeric, 10000)
            ORDER BY final_price ASC, p.created_at DESC LIMIT 12
          ) s
        )
        WHEN 'category' THEN (
          SELECT array_agg(s.id ORDER BY s.created_at DESC)
          FROM (
            SELECT p.id, p.created_at FROM public.products p
            WHERE COALESCE(p.stock, 0) > 0 AND p.category = c.rule_config->>'category'
            ORDER BY p.created_at DESC LIMIT 12
          ) s
        )
      END,
      '{}'::uuid[]
    ) AS product_ids
  FROM public.storefront_collections c
  WHERE c.is_active
  ORDER BY c.display_order, c.created_at;
$$;

REVOKE ALL ON FUNCTION public.get_storefront_collections() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_storefront_collections() TO anon, authenticated;

COMMIT;
