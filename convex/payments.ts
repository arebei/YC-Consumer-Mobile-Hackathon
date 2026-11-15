import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

// The shop's redemption fee, invoiced through Whop's sandbox. Spec section 8.
// Checked against docs.whop.com and https://api.whop.com/api/v1/openapi.json (version 2026-11-14-1):
// - `initial_price` is in currency units ("5.00 means $5.00"), so the fee is feeCents / 100.
// - An inline variant needs no product.
// - The issued invoice's `checkout_link` is a signed token, not a URL: the docs say to pass it as
//   `link` to POST /checkout_sessions to open a checkout. That endpoint is not in the public spec,
//   so it is tried best effort; the fee is "invoiced" either way.

// Convex exposes deployment env vars on process.env; declared here because @types/node is not installed.
declare const process: { env: Record<string, string | undefined> };

const DEFAULT_BASE = "https://sandbox-api.whop.com/api/v1";
const API_VERSION = "2026-11-14-1";
const CHECK_EVERY_MS = 15_000;
const MAX_CHECKS = 40;

const feeStatus = v.union(v.literal("none"), v.literal("pending"), v.literal("invoiced"), v.literal("charged"), v.literal("failed"));

export const loadFee = internalQuery({
  args: { rewardId: v.id("rewards") },
  handler: async (ctx, { rewardId }) => {
    const reward = await ctx.db.get(rewardId);
    if (!reward) return null;
    const shop = await ctx.db.get(reward.shopId);
    if (!shop) return null;
    return {
      feeStatus: reward.feeStatus, code: reward.code, whopInvoiceId: reward.whopInvoiceId ?? null,
      shopId: shop._id, shopName: shop.name, feeCents: shop.feeCents,
    };
  },
});

export const saveFee = internalMutation({
  args: {
    rewardId: v.id("rewards"), feeStatus,
    feeUrl: v.optional(v.string()), whopInvoiceId: v.optional(v.string()), feeError: v.optional(v.string()),
  },
  handler: async (ctx, { rewardId, ...fields }) => {
    const patch: Record<string, string> = { feeStatus: fields.feeStatus };
    if (fields.feeUrl !== undefined) patch.feeUrl = fields.feeUrl;
    if (fields.whopInvoiceId !== undefined) patch.whopInvoiceId = fields.whopInvoiceId;
    if (fields.feeError !== undefined) patch.feeError = fields.feeError;
    await ctx.db.patch(rewardId, patch);
  },
});

type WhopResult = { ok: true; data: any } | { ok: false; error: string };

async function whop(path: string, method: "GET" | "POST", body?: unknown, idempotencyKey?: string): Promise<WhopResult> {
  const base = process.env.WHOP_API_BASE || DEFAULT_BASE;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${process.env.WHOP_API_KEY}`,
    "Api-Version-Date": API_VERSION,
    Accept: "application/json",
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  const res = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  if (!res.ok) return { ok: false, error: `${res.status} ${text.slice(0, 300)}` };
  try {
    return { ok: true, data: text ? JSON.parse(text) : {} };
  } catch {
    return { ok: false, error: `${res.status} not JSON: ${text.slice(0, 300)}` };
  }
}

export const chargeShopFee = internalAction({
  args: { rewardId: v.id("rewards"), retry: v.optional(v.number()) },
  handler: async (ctx, { rewardId, retry }): Promise<null> => {
    const info = await ctx.runQuery(internal.payments.loadFee, { rewardId });
    if (!info || info.feeStatus !== "pending") return null;
    if (!process.env.WHOP_API_KEY || !process.env.WHOP_ACCOUNT_ID || !process.env.WHOP_SHOP_EMAIL) {
      console.log(`Whop not configured (need WHOP_API_KEY, WHOP_ACCOUNT_ID, WHOP_SHOP_EMAIL); fee for ${rewardId} stays pending.`);
      return null;
    }
    const suffix = retry === undefined ? "" : `-r${retry}`;
    const fail = async (step: string, error: string) => {
      console.error(`Whop ${step} failed for reward ${rewardId}: ${error}`);
      await ctx.runMutation(internal.payments.saveFee, { rewardId, feeStatus: "failed", feeError: `${step}: ${error}`.slice(0, 400) });
      return null;
    };

    try {
      const created = await whop("/invoices", "POST", {
        account_id: process.env.WHOP_ACCOUNT_ID,
        customer_name: info.shopName,
        email_address: process.env.WHOP_SHOP_EMAIL,
        items: [{
          quantity: 1,
          variant: { currency: "usd", title: `Lasso redemption fee: ${info.shopName}`, initial_price: info.feeCents / 100, billing_type: "one_time" },
        }],
        memo: `Reward code ${info.code} redeemed`,
        metadata: { rewardId, shopId: info.shopId },
      }, `lasso-invoice-${rewardId}${suffix}`);
      if (!created.ok) return await fail("create", created.error);
      const invoiceId: string = created.data.id;
      console.log(`Whop invoice ${invoiceId} created: status ${created.data.status}, total ${JSON.stringify(created.data.total)}`);

      const issued = await whop(`/invoices/${invoiceId}/issue`, "POST", {}, `lasso-issue-${rewardId}${suffix}`);
      if (!issued.ok) return await fail("issue", issued.error);
      const token: string | null = issued.data.checkout_link ?? null;
      console.log(`Whop invoice ${invoiceId} issued: status ${issued.data.status}, checkout_link ${token ? "present" : "missing"}`);

      // Best effort: turn the signed checkout_link into a hosted checkout page.
      let feeUrl: string | undefined;
      if (token) {
        const session = await whop("/checkout_sessions", "POST", { link: token }, `lasso-session-${rewardId}${suffix}`);
        if (session.ok) {
          const d = session.data;
          feeUrl = d.purchase_url ?? d.url ?? d.checkout_url ?? d.link ?? undefined;
          console.log(`Whop checkout session for ${invoiceId}: keys ${Object.keys(d).join(",")}; url ${feeUrl ? "found" : "missing"}`);
        } else {
          console.warn(`Whop checkout session for ${invoiceId} failed (fee still invoiced): ${session.error}`);
        }
      }

      await ctx.runMutation(internal.payments.saveFee, { rewardId, feeStatus: "invoiced", whopInvoiceId: invoiceId, ...(feeUrl ? { feeUrl } : {}) });
      await ctx.scheduler.runAfter(CHECK_EVERY_MS, internal.payments.checkFee, { rewardId, attempt: 1 });
    } catch (e) {
      return await fail("request", e instanceof Error ? e.message : String(e));
    }
    return null;
  },
});

export const checkFee = internalAction({
  args: { rewardId: v.id("rewards"), attempt: v.number() },
  handler: async (ctx, { rewardId, attempt }): Promise<null> => {
    const info = await ctx.runQuery(internal.payments.loadFee, { rewardId });
    if (!info || info.feeStatus !== "invoiced" || !info.whopInvoiceId) return null;
    try {
      const res = await whop(`/invoices/${info.whopInvoiceId}`, "GET");
      if (res.ok && res.data.status === "paid") {
        await ctx.runMutation(internal.payments.saveFee, { rewardId, feeStatus: "charged" });
        console.log(`Whop invoice ${info.whopInvoiceId} paid.`);
        return null;
      }
      if (!res.ok) console.warn(`Whop check ${attempt} for ${info.whopInvoiceId}: ${res.error}`);
    } catch (e) {
      console.warn(`Whop check ${attempt} for ${info.whopInvoiceId} threw: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (attempt < MAX_CHECKS) await ctx.scheduler.runAfter(CHECK_EVERY_MS, internal.payments.checkFee, { rewardId, attempt: attempt + 1 });
    return null;
  },
});

/** Ops helper for the demo: `npx convex run payments:retry '{"rewardId":"..."}'` re-sends a failed or stuck fee. */
export const retry = internalMutation({
  args: { rewardId: v.id("rewards") },
  handler: async (ctx, { rewardId }) => {
    const reward = await ctx.db.get(rewardId);
    if (!reward || reward.redeemedAt === undefined) return "not redeemed";
    if (reward.feeStatus === "invoiced" || reward.feeStatus === "charged") return `already ${reward.feeStatus}`;
    await ctx.db.patch(rewardId, { feeStatus: "pending", feeError: undefined });
    await ctx.scheduler.runAfter(0, internal.payments.chargeShopFee, { rewardId, retry: Date.now() });
    return "scheduled";
  },
});
