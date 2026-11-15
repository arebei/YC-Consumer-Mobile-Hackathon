import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import { latLng, point } from "./lib/validators";

export default defineSchema({
  players: defineTable({ deviceId: v.string(), name: v.string(), color: v.string(), flag: v.optional(v.string()) })
    .index("by_deviceId", ["deviceId"]),
  cells: defineTable({
    cellId: v.string(), boundary: v.array(latLng),
    ownerId: v.id("players"), strength: v.number(), claimedAt: v.number(),
  }).index("by_cellId", ["cellId"]).index("by_ownerId", ["ownerId"]),
  shops: defineTable({
    name: v.string(), lat: v.number(), lng: v.number(), cellId: v.string(),
    reward: v.string(), feeCents: v.number(),
  }).index("by_cellId", ["cellId"]),
  shopHolds: defineTable({ shopId: v.id("shops"), playerId: v.id("players"), heldMs: v.number() })
    .index("by_shopId", ["shopId"]),
  walks: defineTable({
    playerId: v.id("players"), points: v.array(point), lengthM: v.number(), cellCount: v.number(),
    status: v.union(v.literal("captured"), v.literal("rejected")),
    reason: v.optional(v.string()), createdAt: v.number(),
  }).index("by_playerId", ["playerId"]),
  events: defineTable({
    type: v.literal("steal"), byPlayerId: v.id("players"), fromPlayerId: v.id("players"),
    cellCount: v.number(), strength: v.number(), shopId: v.optional(v.id("shops")),
    byFlag: v.optional(v.string()), createdAt: v.number(),
  }).index("by_fromPlayerId", ["fromPlayerId"]),
  rewards: defineTable({
    shopId: v.id("shops"), playerId: v.id("players"), code: v.string(),
    redeemedAt: v.optional(v.number()),
    feeStatus: v.union(v.literal("none"), v.literal("pending"), v.literal("invoiced"), v.literal("charged"), v.literal("failed")),
    feeUrl: v.optional(v.string()), whopInvoiceId: v.optional(v.string()), feeError: v.optional(v.string()),
  }).index("by_playerId", ["playerId"]).index("by_shopId", ["shopId"]),
  season: defineTable({ endedAt: v.optional(v.number()) }),
});
