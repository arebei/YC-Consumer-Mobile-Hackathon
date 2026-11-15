/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as cells from "../cells.js";
import type * as config from "../config.js";
import type * as events from "../events.js";
import type * as grid from "../grid.js";
import type * as leaderboard from "../leaderboard.js";
import type * as lib_capture from "../lib/capture.js";
import type * as lib_config from "../lib/config.js";
import type * as lib_flag from "../lib/flag.js";
import type * as lib_grid from "../lib/grid.js";
import type * as lib_ledger from "../lib/ledger.js";
import type * as lib_loop from "../lib/loop.js";
import type * as lib_rules from "../lib/rules.js";
import type * as lib_validators from "../lib/validators.js";
import type * as offers from "../offers.js";
import type * as payments from "../payments.js";
import type * as players from "../players.js";
import type * as rewards from "../rewards.js";
import type * as season from "../season.js";
import type * as shops from "../shops.js";
import type * as stats from "../stats.js";
import type * as vouchers from "../vouchers.js";
import type * as walks from "../walks.js";
import type * as wallet from "../wallet.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  cells: typeof cells;
  config: typeof config;
  events: typeof events;
  grid: typeof grid;
  leaderboard: typeof leaderboard;
  "lib/capture": typeof lib_capture;
  "lib/config": typeof lib_config;
  "lib/flag": typeof lib_flag;
  "lib/grid": typeof lib_grid;
  "lib/ledger": typeof lib_ledger;
  "lib/loop": typeof lib_loop;
  "lib/rules": typeof lib_rules;
  "lib/validators": typeof lib_validators;
  offers: typeof offers;
  payments: typeof payments;
  players: typeof players;
  rewards: typeof rewards;
  season: typeof season;
  shops: typeof shops;
  stats: typeof stats;
  vouchers: typeof vouchers;
  walks: typeof walks;
  wallet: typeof wallet;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
