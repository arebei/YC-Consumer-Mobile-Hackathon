import { v } from "convex/values";
export const latLng = v.object({ lat: v.number(), lng: v.number() });
export const point = v.object({ lat: v.number(), lng: v.number(), t: v.number(), acc: v.number() });
