/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as lib_config from "../lib/config.js";
import type * as lib_flag from "../lib/flag.js";
import type * as lib_grid from "../lib/grid.js";
import type * as lib_loop from "../lib/loop.js";
import type * as lib_rules from "../lib/rules.js";
import type * as lib_validators from "../lib/validators.js";
import type * as players from "../players.js";
import type * as walks from "../walks.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "lib/config": typeof lib_config;
  "lib/flag": typeof lib_flag;
  "lib/grid": typeof lib_grid;
  "lib/loop": typeof lib_loop;
  "lib/rules": typeof lib_rules;
  "lib/validators": typeof lib_validators;
  players: typeof players;
  walks: typeof walks;
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
