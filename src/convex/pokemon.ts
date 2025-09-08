import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser } from "./users";
import type { Doc } from "./_generated/dataModel";

// Get paginated list of Pokemon
export const list = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    search: v.optional(v.string()),
    types: v.optional(v.array(v.string())),
    generation: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    const offset = args.offset || 0;

    // Use explicit branching to avoid reassigning different query types
    let results: any[] = [];
    if (args.generation !== undefined) {
      results = await ctx.db
        .query("pokemon")
        .withIndex("by_generation", (q) =>
          q.eq("generation", args.generation as number),
        )
        .collect();
    } else {
      results = await ctx.db.query("pokemon").collect();
    }
    
    // Apply search filter
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      results = results.filter(pokemon => 
        pokemon.name.toLowerCase().includes(searchLower) ||
        pokemon.pokemonId.toString().includes(searchLower)
      );
    }
    
    // Apply type filter
    if (args.types && args.types.length > 0) {
      results = results.filter(pokemon =>
        args.types!.some(type => pokemon.types.includes(type))
      );
    }
    
    // Sort by Pokemon ID
    results.sort((a, b) => a.pokemonId - b.pokemonId);
    
    // Apply pagination
    const paginatedResults = results.slice(offset, offset + limit);
    
    return {
      pokemon: paginatedResults,
      total: results.length,
      hasMore: offset + limit < results.length,
    };
  },
});

// Get single Pokemon by ID
export const getById = query({
  args: { pokemonId: v.number() },
  handler: async (ctx, args) => {
    // Safely get first match instead of unique()
    const pokemonResults = await ctx.db
      .query("pokemon")
      .withIndex("by_pokemon_id", (q) => q.eq("pokemonId", args.pokemonId))
      .collect();
    const pokemon = pokemonResults[0] ?? null;
    
    if (!pokemon) return null;

    // Species may also have duplicates, take first match
    const speciesResults = await ctx.db
      .query("pokemonSpecies")
      .withIndex("by_pokemon_id", (q) => q.eq("pokemonId", args.pokemonId))
      .collect();
    const species = speciesResults[0] ?? null;

    return {
      ...pokemon,
      species,
    };
  },
});

// Get Pokemon types
export const getTypes = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("pokemonTypes").collect();
  },
});

// Add Pokemon to favorites
export const addToFavorites = mutation({
  args: { pokemonId: v.number() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("Must be authenticated to add favorites");
    }
    
    // Check if already favorited
    const existing = await ctx.db
      .query("favorites")
      .withIndex("by_user_and_pokemon", (q) => 
        q.eq("userId", user._id).eq("pokemonId", args.pokemonId)
      )
      .unique();
    
    if (existing) {
      throw new Error("Pokemon already in favorites");
    }
    
    return await ctx.db.insert("favorites", {
      userId: user._id,
      pokemonId: args.pokemonId,
    });
  },
});

// Remove Pokemon from favorites
export const removeFromFavorites = mutation({
  args: { pokemonId: v.number() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("Must be authenticated to remove favorites");
    }
    
    const favorite = await ctx.db
      .query("favorites")
      .withIndex("by_user_and_pokemon", (q) => 
        q.eq("userId", user._id).eq("pokemonId", args.pokemonId)
      )
      .unique();
    
    if (!favorite) {
      throw new Error("Pokemon not in favorites");
    }
    
    return await ctx.db.delete(favorite._id);
  },
});

// Get user's favorites
export const getFavorites = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    
    const favorites = await ctx.db
      .query("favorites")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    
    const pokemonIds = favorites.map(f => f.pokemonId);
    const pokemon = await Promise.all(
      pokemonIds.map(async (id) => {
        const results = await ctx.db
          .query("pokemon")
          .withIndex("by_pokemon_id", (q) => q.eq("pokemonId", id))
          .collect();
        return results[0] ?? null;
      })
    );
    
    // Ensure non-null return type
    const pokemonDocs = pokemon.filter(
      (p): p is Doc<"pokemon"> => p !== null
    );
    
    return pokemonDocs;
  },
});