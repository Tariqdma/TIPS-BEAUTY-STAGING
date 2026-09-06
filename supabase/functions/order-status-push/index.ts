import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type DeliveryStatus = "shipped" | "delivered";
type PushToken = { id: string; expo_push_token: string };

const corsHeaders = { "Content-Type": "application/json" };
const copy: Record<DeliveryStatus, { title: string; body: (number: string) => string }> = {
  shipped: { title: "طلبك في الطريق", body: (number) => `طلبك ${number} أصبح في الطريق إليك.` },
  delivered: { title: "تم توصيل طلبك", body: (number) => `تم توصيل طلبك ${number} بنجاح. نتمنى لك تجربة جميلة.` },
};

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  const authorization = request.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Missing authorization" }), { status: 401, headers: corsHeaders });
  const accessToken = authorization.slice(7);
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const service = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });

  try {
    const { data: { user }, error: userError } = await service.auth.getUser(accessToken);
    if (userError || !user) return new Response(JSON.stringify({ error: "Invalid user session" }), { status: 401, headers: corsHeaders });
    const body = await request.json() as { order_id?: string; status?: string };
    if (!body.order_id || !["shipped", "delivered"].includes(body.status ?? "")) return new Response(JSON.stringify({ error: "Unsupported event" }), { status: 400, headers: corsHeaders });
    const status = body.status as DeliveryStatus;
    const { data: order, error: orderError } = await service.from("orders").select("id,order_number,customer_id,driver_id,status").eq("id", body.order_id).maybeSingle();
    if (orderError || !order || order.status !== status) return new Response(JSON.stringify({ error: "Order state does not match event" }), { status: 409, headers: corsHeaders });

    const [{ data: profile }, { data: driver }] = await Promise.all([
      service.from("profiles").select("role").eq("id", user.id).maybeSingle(),
      service.from("drivers").select("id").eq("user_id", user.id).maybeSingle(),
    ]);
    const permitted = profile?.role === "admin" || (driver?.id && driver.id === order.driver_id);
    if (!permitted) return new Response(JSON.stringify({ error: "Caller is not assigned to this order" }), { status: 403, headers: corsHeaders });

    const { data: tokens, error: tokenError } = await service.from("customer_push_tokens").select("id,expo_push_token").eq("customer_id", order.customer_id).eq("is_active", true);
    if (tokenError) throw tokenError;
    if (!tokens?.length) return new Response(JSON.stringify({ queued: 0, reason: "No registered device" }), { status: 202, headers: corsHeaders });

    const { data: previous } = await service.from("push_notification_deliveries").select("push_token_id").eq("order_id", order.id).eq("event_type", status);
    const previouslySent = new Set((previous ?? []).map((item) => item.push_token_id));
    const targets = (tokens as PushToken[]).filter((token) => !previouslySent.has(token.id));
    if (!targets.length) return new Response(JSON.stringify({ queued: 0, reason: "Already submitted" }), { status: 202, headers: corsHeaders });

    const message = copy[status];
    const expoResponse = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { Accept: "application/json", "Accept-Encoding": "gzip, deflate", "Content-Type": "application/json" },
      body: JSON.stringify(targets.map((token) => ({ to: token.expo_push_token, sound: "default", title: message.title, body: message.body(order.order_number ?? ""), channelId: "orders", data: { orderId: order.id, url: "/orders" } }))),
    });
    const expoPayload = await expoResponse.json().catch(() => ({ errors: [{ message: "Invalid Expo response" }] }));
    if (!expoResponse.ok) throw new Error(expoPayload?.errors?.[0]?.message ?? "Expo Push Service request failed");

    const ticketData = Array.isArray(expoPayload.data) ? expoPayload.data : [];
    const logs = targets.map((token, index) => {
      const ticket = ticketData[index] ?? {};
      const deviceNotRegistered = ticket.details?.error === "DeviceNotRegistered";
      return { order_id: order.id, customer_id: order.customer_id, push_token_id: token.id, event_type: status, status: ticket.status === "ok" ? "submitted" : "failed", expo_ticket_id: ticket.id ?? null, error_message: ticket.message ?? null, response_payload: ticket };
    });
    await service.from("push_notification_deliveries").upsert(logs, { onConflict: "order_id,event_type,push_token_id", ignoreDuplicates: true });
    const invalidIds = targets.filter((_token, index) => ticketData[index]?.details?.error === "DeviceNotRegistered").map((token) => token.id);
    if (invalidIds.length) await service.from("customer_push_tokens").update({ is_active: false, invalidated_at: new Date().toISOString() }).in("id", invalidIds);
    return new Response(JSON.stringify({ queued: targets.length }), { status: 202, headers: corsHeaders });
  } catch (error) {
    console.error("order-status-push", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unexpected error" }), { status: 500, headers: corsHeaders });
  }
});
