"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

export const updateProfile = action({
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

      await ctx.runMutation(internal.users.updateProfileInternal, {
        userId,
        name: args.name,
        image: args.image,
      });

      return null;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unknown error in usersActions.updateProfile";
      console.error("usersActions.updateProfile error:", err);
      throw new Error(message);
    }
  },
});