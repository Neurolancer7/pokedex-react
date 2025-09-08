import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { useConvexAuth, useQuery as useConvexQuery, useMutation as useConvexMutation, useAction } from "convex/react";
import { useAuth } from "@/hooks/use-auth";

import { PokemonHeader } from "@/components/PokemonHeader";
import { PokemonSearch } from "@/components/PokemonSearch";
import { PokemonGrid } from "@/components/PokemonGrid";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  const [page, setPage] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Add local accumulation of loaded pokemon and constants
  const [loadedPokemon, setLoadedPokemon] = useState<any[]>([]);
  const INITIAL_LIMIT = 20;
  const LOAD_MORE_LIMIT = 40;

  // Compute limit/offset to fetch: first page 20, subsequent pages 40 each
  const computedLimit = page === 0 ? INITIAL_LIMIT : LOAD_MORE_LIMIT;
  const computedOffset =
    page === 0 ? 0 : INITIAL_LIMIT + (page - 1) * LOAD_MORE_LIMIT;

  // Convex queries and mutations
  const pokemonData = useConvexQuery(api.pokemon.list, {
    limit: computedLimit,
    offset: computedOffset,
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
    // Reset page and accumulation on new search
    setPage(0);
    setLoadedPokemon([]);
  };

  const handleFilterChange = (filters: { types: string[]; generation?: number }) => {
    setSelectedTypes(filters.types);
    setSelectedGeneration(filters.generation);
    // Reset page and accumulation on new filters
    setPage(0);
    setLoadedPokemon([]);
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
    if (isLoadingMore && pokemonData !== undefined) {
      setIsLoadingMore(false);
    }
  }, [pokemonData, isLoadingMore]);

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setPage(prev => prev + 1);
  };

  // Accumulate fetched pages into loadedPokemon when not in favorites view
  useEffect(() => {
    if (showFavorites) return;
    if (!pokemonData?.pokemon) return;

    setLoadedPokemon(prev => {
      // For first page, replace; otherwise append and de-dup by pokemonId
      const next = page === 0 ? pokemonData.pokemon : [...prev, ...pokemonData.pokemon];
      const unique = new Map<number, any>();
      for (const p of next) {
        if (!unique.has(p.pokemonId)) unique.set(p.pokemonId, p);
      }
      return Array.from(unique.values());
    });
  }, [pokemonData?.pokemon, showFavorites, page]);

  // Ensure first page shows immediately even if accumulator missed
  useEffect(() => {
    if (showFavorites) return;
    if (page !== 0) return;
    if (loadedPokemon.length > 0) return;
    if (!pokemonData?.pokemon || pokemonData.pokemon.length === 0) return;
    setLoadedPokemon(pokemonData.pokemon);
  }, [pokemonData?.pokemon, showFavorites, page, loadedPokemon.length]);

  // Reset accumulation when toggling favorites view ON
  useEffect(() => {
    if (!showFavorites) {
      // when coming back from favorites, reset to first page
      setPage(0);
      setLoadedPokemon([]);
    }
  }, [showFavorites]);

  // Get display data
  const displayPokemon = showFavorites
    ? (favorites || [])
    : (page === 0 ? (pokemonData?.pokemon || []) : loadedPokemon);
  const favoriteIds = Array.isArray(favorites) ? favorites.map((f) => f.pokemonId) : [];
  const isLoading = pokemonData === undefined && page === 0;
  const hasMore = !showFavorites && (pokemonData?.hasMore ?? false);

  return (
    <div className="min-h-screen bg-background">
      <PokemonHeader
        isDark={isDark}
        onThemeToggle={handleThemeToggle}
        showFavorites={showFavorites}
        onFavoritesToggle={() => setShowFavorites(!showFavorites)}
        onDataRefresh={handleDataRefresh}
        isRefreshing={isRefreshing}
      />

      <main className="container mx-auto px-4 py-8">
        {/* Search and Filters */}
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

        {/* Results Header */}
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
              <p className="text-muted-foreground">
                {showFavorites
                  ? `${displayPokemon.length} favorite Pokémon`
                  : pokemonData
                  ? `${pokemonData.total} Pokémon found`
                  : "Loading..."}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Empty State for No Data */}
        {!isLoading && displayPokemon.length === 0 && !pokemonData?.total && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <Alert className="max-w-md mx-auto">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No Pokémon data found. Click "Refresh Data" to load Pokémon from the API.
              </AlertDescription>
            </Alert>
            <Button
              onClick={handleDataRefresh}
              className="mt-4 gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Load Pokémon Data
            </Button>
          </motion.div>
        )}

        {/* Pokemon Grid */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <PokemonGrid
            pokemon={displayPokemon}
            favorites={favoriteIds}
            onFavoriteToggle={handleFavoriteToggle}
            isLoading={isLoading && page === 0}
          />
        </motion.div>

        {/* Load More */}
        {hasMore && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center mt-8"
          >
            <Button
              onClick={handleLoadMore}
              variant="outline"
              className="gap-2"
              disabled={isLoadingMore}
              aria-busy={isLoadingMore}
            >
              {isLoadingMore ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                "Show More"
              )}
            </Button>
          </motion.div>
        )}
      </main>
    </div>
  );
}