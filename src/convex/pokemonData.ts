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
      // If a range is provided (limit/offset), build the list of IDs directly to avoid the list endpoint round trip
      const ids: number[] = Array.from({ length: limit }, (_, i) => offset + i + 1).filter((id) => id <= 1025);

      // If no ids (edge), return early
      if (ids.length === 0) {
        return { success: true, cached: 0 };
      }

      // Cache types first
      await cacheTypes(ctx);

      // Choose concurrency based on region; Paldea (>= 906) gets higher concurrency
      const isPaldeaOnly = ids.every((id) => id >= 906);
      const CONCURRENCY = isPaldeaOnly ? 16 : 8;
      const BATCH_DELAY_MS = isPaldeaOnly ? 50 : 150;

      for (let i = 0; i < ids.length; i += CONCURRENCY) {
        const batch = ids.slice(i, i + CONCURRENCY);

        await Promise.all(
          batch.map(async (pokemonId) => {
            // Skip if already cached
            const existing = await ctx.runQuery(internal.pokemonInternal.getByIdInternal, { pokemonId });
            if (existing) return;

            // Construct endpoints directly by id and fetch both in parallel
            const pokemonUrl = `https://pokeapi.co/api/v2/pokemon/${pokemonId}`;
            const speciesUrl = `https://pokeapi.co/api/v2/pokemon-species/${pokemonId}`;

            const [pokemonResponse, speciesResponse] = await Promise.all([
              fetch(pokemonUrl),
              fetch(speciesUrl),
            ]);

            if (!pokemonResponse.ok) {
              throw new Error(`PokéAPI pokemon request failed (id ${pokemonId}): ${pokemonResponse.status} ${pokemonResponse.statusText}`);
            }
            if (!speciesResponse.ok) {
              throw new Error(`PokéAPI species request failed (id ${pokemonId}): ${speciesResponse.status} ${speciesResponse.statusText}`);
            }

            const [pokemonData, speciesData] = await Promise.all([
              pokemonResponse.json(),
              speciesResponse.json(),
            ]);

            // Cache Pokemon
            await ctx.runMutation(internal.pokemonInternal.cachePokemon, {
              pokemonData,
              speciesData,
            });
          })
        );

        // Tiny delay between batches to avoid spikes
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
      }
      
      return { success: true, cached: ids.length };
    } catch (error) {
      console.error("Error fetching Pokemon data:", error);
      // Provide clean error message
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to fetch Pokemon data: ${message}`);
    }
  },
});

export const fetchHisuiPokemon = action({
  args: {},
  handler: async (ctx) => {
    try {
      // Ensure types are cached
      await cacheTypes(ctx);

      // Fetch the Hisui Pokédex
      const hisuiDex = await fetch("https://pokeapi.co/api/v2/pokedex/hisui");
      if (!hisuiDex.ok) {
        throw new Error(`PokéAPI hisui pokedex request failed: ${hisuiDex.status} ${hisuiDex.statusText}`);
      }
      const dexData = await hisuiDex.json();

      // Entries reference species; we need the correct Pokémon form (prefer "-hisui" variants if present)
      const speciesEntries: Array<{ pokemon_species: { name: string; url: string } }> =
        Array.isArray(dexData?.pokemon_entries) ? dexData.pokemon_entries : [];

      // Limit concurrent requests to avoid spikes
      const CONCURRENCY = 8;
      for (let i = 0; i < speciesEntries.length; i += CONCURRENCY) {
        const batch = speciesEntries.slice(i, i + CONCURRENCY);

        await Promise.all(
          batch.map(async (entry) => {
            try {
              const speciesName = entry.pokemon_species?.name;
              if (!speciesName) return;

              // Fetch species to discover varieties (including hisuian forms)
              const speciesResp = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${speciesName}`);
              if (!speciesResp.ok) {
                throw new Error(`Species fetch failed (${speciesName}): ${speciesResp.status} ${speciesResp.statusText}`);
              }
              const speciesData = await speciesResp.json();

              // Pick a hisuian form if available; otherwise default species pokemon
              const varieties: Array<{ is_default: boolean; pokemon: { name: string } }> =
                Array.isArray(speciesData?.varieties) ? speciesData.varieties : [];
              const hisuianVariety =
                varieties.find((v) => v.pokemon?.name?.includes("-hisui")) ||
                varieties.find((v) => v.pokemon?.name?.includes("-hisuyan")) || // safety for typos/alt spellings
                null;

              const targetPokemonName =
                hisuianVariety?.pokemon?.name ||
                varieties.find((v) => v.is_default)?.pokemon?.name ||
                speciesName;

              // Fetch the actual Pokémon entry by name to get stats/moves/sprites
              const pokemonResp = await fetch(`https://pokeapi.co/api/v2/pokemon/${targetPokemonName}`);
              if (!pokemonResp.ok) {
                throw new Error(`Pokémon fetch failed (${targetPokemonName}): ${pokemonResp.status} ${pokemonResp.statusText}`);
              }
              const pokemonData = await pokemonResp.json();

              // Cache
              await ctx.runMutation(internal.pokemonInternal.cachePokemon, { pokemonData, speciesData });
            } catch (innerErr) {
              console.error("Hisui batch item error:", innerErr);
              // continue with other entries
            }
          }),
        );

        // Gentle delay between batches
        await new Promise((r) => setTimeout(r, 120));
      }

      return { success: true, message: "Hisui Pokémon cached" };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("fetchHisuiPokemon error:", error);
      throw new Error(`Failed to fetch Hisui Pokémon: ${message}`);
    }
  },
});

async function cacheTypes(ctx: any) {
  try {
    const typesResponse = await fetch("https://pokeapi.co/api/v2/type");
    // Add response.ok check for types endpoint
    if (!typesResponse.ok) {
      throw new Error(
        `PokéAPI types request failed: ${typesResponse.status} ${typesResponse.statusText}`
      );
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
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error in cacheTypes";
    console.error("cacheTypes error:", err);
    throw new Error(message);
  }
}