import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { useQuery as useConvexQuery, useMutation as useConvexMutation, useAction } from "convex/react";
import { useAuth } from "@/hooks/use-auth";

import { PokemonHeader } from "@/components/PokemonHeader";
import { PokemonSearch } from "@/components/PokemonSearch";
import { PokemonGrid } from "@/components/PokemonGrid";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export default function Pokedex() {
  const { isAuthenticated } = useAuth();
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") === "dark" || 
        (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
    return false;
  });
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedGeneration, setSelectedGeneration] = useState<number>();
  const [showFavorites, setShowFavorites] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Infinite scroll state
  const BATCH_LIMIT = 30; // changed from 20 -> 30
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  // Removed sentinelRef since infinite scroll is disabled; manual Load More only

  const INITIAL_LIMIT = 1025; // Show all; removes need for pagination

  const computedLimit = INITIAL_LIMIT;
  const computedOffset = 0; // Always start at 0 since we load all

  const pokemonData = useConvexQuery(api.pokemon.list, {
    limit: showFavorites ? 0 : BATCH_LIMIT,
    offset: showFavorites ? 0 : offset,
    search: searchQuery || undefined,
    types: selectedTypes.length > 0 ? selectedTypes : undefined,
    generation: selectedGeneration,
  });

  // Prefetch next page to make clicking "Load More" feel instant
  const nextPokemonData = useConvexQuery(api.pokemon.list, {
    limit: showFavorites ? 0 : BATCH_LIMIT,
    offset: showFavorites ? 0 : offset + BATCH_LIMIT,
    search: searchQuery || undefined,
    types: selectedTypes.length > 0 ? selectedTypes : undefined,
    generation: selectedGeneration,
  });

  const favorites = useConvexQuery(
    api.pokemon.getFavorites,
    isAuthenticated ? {} : "skip"
  );

  const addToFavorites = useConvexMutation(api.pokemon.addToFavorites);
  const removeFromFavorites = useConvexMutation(api.pokemon.removeFromFavorites);
  const fetchPokemonData = useAction(api.pokemonData.fetchAndCachePokemon);

  // Theme management
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  const handleThemeToggle = () => {
    setIsDark(!isDark);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleFilterChange = (filters: { types: string[]; generation?: number }) => {
    setSelectedTypes(filters.types);
    setSelectedGeneration(filters.generation);
  };

  const handleFavoriteToggle = async (pokemonId: number) => {
    if (!isAuthenticated) {
      toast.error("Please sign in to manage favorites");
      return;
    }

    try {
      const favoriteIds = Array.isArray(favorites) ? favorites.map((f) => f.pokemonId) : [];
      const isFavorite = favoriteIds.includes(pokemonId);

      if (isFavorite) {
        await removeFromFavorites({ pokemonId });
        toast.success("Removed from favorites");
      } else {
        await addToFavorites({ pokemonId });
        toast.success("Added to favorites");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update favorites";
      toast.error(message);
    }
  };

  const handleDataRefresh = async () => {
    try {
      // Start loading state
      setIsRefreshing(true);
      toast.promise(
        fetchPokemonData({ limit: 1025, offset: 0 }),
        {
          loading: "Fetching Pokémon data...",
          success: (data) => {
            const count = (data as any)?.cached ?? 0;
            return `Pokémon data updated successfully! Cached ${count} entries.`;
          },
          error: (err) => (err instanceof Error ? err.message : "Failed to fetch Pokémon data"),
        }
      );
    } catch (error) {
      console.error("Error refreshing data:", error);
      const message = error instanceof Error ? error.message : "Unexpected error while refreshing data";
      toast.error(message);
    } finally {
      // Ensure loading state is cleared
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    setItems([]);
    setOffset(0);
    setHasMore(true);
    setIsLoadingMore(false);
  }, [searchQuery, selectedGeneration, showFavorites, selectedTypes.join(",")]);

  // Append new page results
  useEffect(() => {
    if (showFavorites) return; // favorites view doesn't paginate
    if (!pokemonData || !pokemonData.pokemon) return;

    setItems((prev) => {
      const next = [...prev];
      const seen = new Set(next.map((p) => p.pokemonId));
      for (const p of pokemonData.pokemon) {
        if (!seen.has(p.pokemonId)) {
          next.push(p);
        }
      }
      return next;
    });

    const total = pokemonData.total ?? 0;
    const currentCount = (items.length || 0) + (pokemonData.pokemon?.length || 0);
    setHasMore(currentCount < total);
    setIsLoadingMore(false);
  }, [pokemonData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Removed IntersectionObserver to disable auto-loading; now only manual "Load More"

  // Removed page reset effect; infinite scroll manages fetching via offset.

  const displayPokemon = showFavorites ? (favorites || []) : items;
  const favoriteIds = Array.isArray(favorites) ? favorites.map((f) => f.pokemonId) : [];
  const isInitialLoading = !showFavorites && pokemonData === undefined && items.length === 0;

  const totalItems = showFavorites ? (favorites?.length ?? 0) : (pokemonData?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalItems / INITIAL_LIMIT));

  const getPageNumbers = (current: number, total: number): Array<number | "ellipsis"> => {
    const pages: Array<number | "ellipsis"> = [];
    const add = (p: number | "ellipsis") => pages.push(p);

    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);

    add(1);
    if (start > 2) add("ellipsis");
    for (let p = start; p <= end; p++) add(p);
    if (end < total - 1) add("ellipsis");
    if (total > 1) add(total);

    if (current === 2) pages.splice(1, 0, 2);
    if (current === total - 1 && total > 2) pages.splice(pages.length - 1, 0, total - 1);

    const seen = new Set<string>();
    return pages.filter((p) => {
      const key = String(p);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <PokemonHeader
        isDark={isDark}
        onThemeToggle={handleThemeToggle}
        showFavorites={showFavorites}
        onFavoritesToggle={() => setShowFavorites(!showFavorites)}
      />

      <main className="container mx-auto px-4 py-8">
        {!showFavorites && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <PokemonSearch
              onSearch={handleSearch}
              onFilterChange={handleFilterChange}
              searchQuery={searchQuery}
              selectedTypes={selectedTypes}
              selectedGeneration={selectedGeneration}
            />
          </motion.div>
        )}

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                {showFavorites ? "Your Favorites" : "Pokémon"}
              </h2>
            </div>
          </div>
        </motion.div>

        {!isInitialLoading && displayPokemon.length === 0 && !pokemonData?.total && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <Alert className="max-w-md mx-auto flex flex-col items-center gap-3 text-left">
              <div className="w-full flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex-1">
                  No Pokémon data found. You can try fetching the data again.
                </AlertDescription>
              </div>
              <div className="w-full flex items-center justify-center gap-2">
                <Button
                  variant="default"
                  className="px-5"
                  onClick={handleDataRefresh}
                  disabled={isRefreshing}
                  aria-busy={isRefreshing}
                  aria-label="Fetch Pokémon Data"
                >
                  {isRefreshing ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-5 w-5 rounded-full bg-white/10 backdrop-blur ring-2 ring-white/40 shadow-md shadow-primary/30 flex items-center justify-center">
                        <img
                          src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png"
                          alt="Loading Pokéball"
                          className="h-4 w-4 animate-bounce-spin"
                        />
                      </span>
                      Fetching…
                    </span>
                  ) : (
                    "Fetch Pokémon Data"
                  )}
                </Button>
              </div>
            </Alert>
          </motion.div>
        )}

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
          <PokemonGrid
            key={`${showFavorites ? "fav" : "infinite"}-${selectedGeneration ?? "all"}-${selectedTypes.join(",")}-${searchQuery}`}
            pokemon={displayPokemon}
            favorites={favoriteIds}
            onFavoriteToggle={handleFavoriteToggle}
            isLoading={isInitialLoading}
          />
        </motion.div>

        {/* Load-more controls and sentinel */}
        {!showFavorites && (
          <div className="mt-8 flex flex-col items-center gap-3">
            {!hasMore && items.length > 0 && (
              <div className="text-muted-foreground text-sm">No more Pokémon</div>
            )}

            {hasMore && (
              <>
                {/* Show animated Pokéball loader while loading, else the Load More button */}
                {isLoadingMore ? (
                  <div
                    className="w-full sm:w-auto flex items-center justify-center"
                    aria-busy="true"
                    aria-live="polite"
                  >
                    <div className="w-full sm:w-auto px-6 h-11 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg border border-white/10 flex items-center justify-center">
                      <div className="h-9 w-9 rounded-full bg-white/10 backdrop-blur ring-2 ring-white/40 shadow-md shadow-primary/30 flex items-center justify-center animate-pulse">
                        <img
                          src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png"
                          alt="Loading Pokéball"
                          className="h-7 w-7 animate-bounce-spin drop-shadow"
                        />
                      </div>
                      <span className="sr-only">Loading more Pokémon…</span>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="default"
                    className="w-full sm:w-auto px-6 h-11 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md hover:from-blue-500 hover:to-purple-500 active:scale-[0.99] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                    onClick={() => {
                      // Keep page static during load; only extend after data arrives
                      if (isLoadingMore) return;
                      setIsLoadingMore(true);
                      setOffset((o) => o + BATCH_LIMIT);
                    }}
                    disabled={isLoadingMore}
                    aria-busy={isLoadingMore}
                    aria-live="polite"
                    aria-label="Load more Pokémon"
                  >
                    Load More
                  </Button>
                )}
              </>
            )}

            {/* Removed sentinel; manual loading only */}
          </div>
        )}
      </main>
    </div>
  );
}