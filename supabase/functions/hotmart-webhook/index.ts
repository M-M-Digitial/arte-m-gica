import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.102.1";

const ACTIVATE = new Set(["PURCHASE_APPROVED", "PURCHASE_COMPLETE", "SUBSCRIPTION_REACTIVATION"]);
const DEACTIVATE: Record<string, string> = {
  PURCHASE_CANCELED: "canceled",
  SUBSCRIPTION_CANCELLATION: "canceled",
  PURCHASE_REFUNDED: "refunded",
  PURCHASE_CHARGEBACK: "chargeback",
  PURCHASE_EXPIRED: "expired",
  PURCHASE_DELAYED: "past_due",
  PURCHASE_PROTEST: "past_due",
};

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function text(value: unknown, maxLength = 500) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function safeEqual(received: string, expected: string) {
  const left = new TextEncoder().encode(received);
  const right = new TextEncoder().encode(expected);
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return difference === 0;
}

function validDate(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const hotmartToken = Deno.env.get("HOTMART_HOTTOK") ?? "";
  if (!hotmartToken) {
    console.error("HOTMART_HOTTOK is not configured");
    return new Response("webhook not configured", { status: 503 });
  }
  const receivedToken = req.headers.get("x-hotmart-hottok") ?? "";
  if (!safeEqual(receivedToken, hotmartToken)) return new Response("unauthorized", { status: 401 });

  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > 1_000_000) return new Response("payload too large", { status: 413 });

  let payload: JsonRecord;
  try {
    payload = record(await req.json());
  } catch {
    return new Response("bad request", { status: 400 });
  }

  const event = text(payload.event, 100);
  const data = record(payload.data);
  const buyer = record(data.buyer);
  const subscriberData = record(data.subscriber);
  const purchase = record(data.purchase);
  const purchaseBuyer = record(purchase.buyer);
  const product = record(data.product);
  const subscription = record(data.subscription);
  const subscriptionPlan = record(subscription.plan);
  const subscriptionSubscriber = record(subscription.subscriber);
  const email = text(buyer.email || subscriberData.email || purchaseBuyer.email, 320).toLowerCase();

  if (!email || !email.includes("@")) {
    console.error("Hotmart payload without a valid email", event);
    return new Response("no email", { status: 200 });
  }

  let status: string;
  let validUntil: string | null = null;
  if (ACTIVATE.has(event)) {
    status = "active";
    const hasRecurringSubscription = Boolean(
      text(subscriptionPlan.name) || text(subscriptionSubscriber.code) || text(subscription.status),
    );
    if (hasRecurringSubscription) {
      validUntil = validDate(purchase.date_next_charge)
        ?? new Date(Date.now() + 40 * 24 * 60 * 60 * 1_000).toISOString();
    }
    // Compras sem assinatura recorrente são vitalícias: valid_until permanece null.
  } else if (event in DEACTIVATE) {
    status = DEACTIVATE[event];
  } else {
    return new Response("ignored", { status: 200 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) return new Response("service unavailable", { status: 503 });
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const transaction = text(purchase.transaction) || null;
  const subscriber = text(subscriptionSubscriber.code) || null;
  const planName = text(subscriptionPlan.name) || text(product.name) || null;
  const minimizedAudit = {
    event,
    event_id: text(payload.id) || null,
    product: {
      id: text(product.id) || null,
      name: text(product.name) || null,
    },
    purchase: {
      transaction,
      status: text(purchase.status) || null,
      approved_date: validDate(purchase.approved_date),
      order_date: validDate(purchase.order_date),
    },
    subscription: {
      subscriber,
      plan: text(subscriptionPlan.name) || null,
    },
  };

  const { error } = await supabase.from("assinaturas").upsert(
    {
      email,
      status,
      plano: planName,
      origem: "hotmart",
      hotmart_transaction: transaction,
      hotmart_subscriber: subscriber,
      valid_until: validUntil,
      raw: minimizedAudit,
    },
    { onConflict: "email" },
  );
  if (error) {
    console.error("Hotmart subscription upsert failed", error.code);
    return new Response("db error", { status: 500 });
  }

  const maskedEmail = email.replace(/^(.{1,2}).*(@.*)$/, "$1***$2");
  console.log(`Hotmart access ${maskedEmail} -> ${status} (${event})`);
  return new Response("ok", { status: 200 });
});
