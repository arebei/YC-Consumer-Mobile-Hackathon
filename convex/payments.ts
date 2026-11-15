import { v } from "convex/values";
import { internalAction } from "./_generated/server";

// B0 stubs. The real Whop sandbox calls land in milestone B5.
export const chargeShopFee = internalAction({
  args: { rewardId: v.id("rewards") },
  handler: async () => null,
});

export const checkFee = internalAction({
  args: { rewardId: v.id("rewards"), attempt: v.number() },
  handler: async () => null,
});
