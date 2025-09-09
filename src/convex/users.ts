import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

/**
 * Get the current signed in user. Returns null if the user is not signed in.
 * Usage: const signedInUser = await ctx.runQuery(api.authHelpers.currentUser);
 * THIS FUNCTION IS READ-ONLY. DO NOT MODIFY.
 */
export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    if (user === null) {
      return null;
    }

    return user;
  },
});

/**
 * Use this function internally to get the current user data. Remember to handle the null user case.
 * @param ctx
 * @returns
 */
export const getCurrentUser = async (ctx: any) => {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    return null;
  }
  return await ctx.db.get(userId);
};

/**
 * Update current user's profile (name and/or image).
 */
export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const userId = await getAuthUserId(ctx);
      if (!userId) {
        throw new Error("Not authenticated");
      }
      const updates: Record<string, unknown> = {};
      if (args.name !== undefined) updates.name = args.name;
      if (args.image !== undefined) updates.image = args.image;

      if (Object.keys(updates).length === 0) {
        return null;
      }

      await ctx.db.patch(userId, updates);
      return null;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unknown error in users.updateProfile";
      console.error("users.updateProfile error:", err);
      throw new Error(message);
    }
  },
});

// Add internal mutation used by the Node action for updating profile
export const updateProfileInternal = internalMutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const updates: Record<string, unknown> = {};
      if (args.name !== undefined) updates.name = args.name;
      if (args.image !== undefined) updates.image = args.image;

      if (Object.keys(updates).length === 0) {
        return null;
      }

      await ctx.db.patch(args.userId, updates);
      return null;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unknown error in users.updateProfileInternal";
      console.error("users.updateProfileInternal error:", err);
      throw new Error(message);
    }
  },
});