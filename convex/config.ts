import { query } from "./_generated/server";
import {
  CLOSE_RADIUS_M, DEMO_MODE, MAX_FLAG_CHARS, MIN_LOOP_M, REDEEM_RADIUS_M, SHOP_MIN_BLOCKS, VENUE,
} from "./lib/config";

// `public` is a reserved word in strict-mode JS, so the function is declared under another
// name and exported as `public`. The client calls it as api.config.public.
const publicConfig = query({
  args: {},
  handler: async () => ({
    closeRadiusM: CLOSE_RADIUS_M,
    minLoopM: MIN_LOOP_M,
    redeemRadiusM: REDEEM_RADIUS_M,
    shopMinBlocks: SHOP_MIN_BLOCKS,
    demoMode: DEMO_MODE,
    center: { lat: VENUE.lat, lng: VENUE.lng },
    maxFlagChars: MAX_FLAG_CHARS,
  }),
});

export { publicConfig as public };
