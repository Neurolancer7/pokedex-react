"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

// Action to fetch and cache Pokemon data from PokeAPI
export const fetchAndCachePokemon = action({
  args: { 
    limit: v.optional(v.number()),
    offset: v.optional(v.number()) 
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 151; // First generation by default
    const offset = args.offset || 0;
    
    try {
      // Fetch Pokemon list
      const listResponse = await fetch(
        `https://pokeapi.co/api/v2/pokemon?limit=${limit}&offset=${offset}`
      );
      // Add response.ok check
      if (!listResponse.ok) {
        throw new Error(`PokéAPI list request failed: ${listResponse.status} ${listResponse.statusText}`);
      }
      const listData = await listResponse.json();
      
      // Cache types first
      await cacheTypes(ctx);
      
      // Process each Pokemon
      for (const pokemon of listData.results) {
        const pokemonId = parseInt(pokemon.url.split('/').slice(-2, -1)[0]);
        
        // Check if already cached
        const existing = await ctx.runQuery(internal.pokemonInternal.getByIdInternal, { pokemonId });
        if (existing) continue;
        
        // Fetch detailed Pokemon data
        const pokemonResponse = await fetch(pokemon.url);
        if (!pokemonResponse.ok) {
          throw new Error(`PokéAPI pokemon request failed (id ${pokemonId}): ${pokemonResponse.status} ${pokemonResponse.statusText}`);
        }
        const pokemonData = await pokemonResponse.json();
        
        // Fetch species data
        const speciesResponse = await fetch(pokemonData.species.url);
        if (!speciesResponse.ok) {
          throw new Error(`PokéAPI species request failed (id ${pokemonId}): ${speciesResponse.status} ${speciesResponse.statusText}`);
        }
        const speciesData = await speciesResponse.json();
        
        // Cache Pokemon
        await ctx.runMutation(internal.pokemonInternal.cachePokemon, {
          pokemonData,
          speciesData,
        });
        
        // Add small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      return { success: true, cached: listData.results.length };
    } catch (error) {
      console.error("Error fetching Pokemon data:", error);
      // Provide clean error message
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to fetch Pokemon data: ${message}`);
    }
  },
});

async function cacheTypes(ctx: any) {
  const typesResponse = await fetch("https://pokeapi.co/api/v2/type");
  // Add response.ok check for types endpoint
  if (!typesResponse.ok) {
    throw new Error(`PokéAPI types request failed: ${typesResponse.status} ${typesResponse.statusText}`);
  }
  const typesData = await typesResponse.json();
  
  const typeColors: Record<string, string> = {
    normal: "#A8A878",
    fire: "#F08030",
    water: "#6890F0",
    electric: "#F8D030",
    grass: "#78C850",
    ice: "#98D8D8",
    fighting: "#C03028",
    poison: "#A040A0",
    ground: "#E0C068",
    flying: "#A890F0",
    psychic: "#F85888",
    bug: "#A8B820",
    rock: "#B8A038",
    ghost: "#705898",
    dragon: "#7038F8",
    dark: "#705848",
    steel: "#B8B8D0",
    fairy: "#EE99AC",
  };
  
  for (const type of typesData.results) {
    await ctx.runMutation(internal.pokemonInternal.cacheType, {
      name: type.name,
      color: typeColors[type.name] || "#68A090",
    });
  }
}