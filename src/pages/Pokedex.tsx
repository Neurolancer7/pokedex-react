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

  // Convex queries and mutations
  const pokemonData = useConvexQuery(api.pokemon.list, {
    limit: 20,
    offset: page * 20,
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
    setPage(0);
  };

  const handleFilterChange = (filters: { types: string[]; generation?: number }) => {
    setSelectedTypes(filters.types);
    setSelectedGeneration(filters.generation);
    setPage(0);
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
      toast.error("Failed to update favorites");
    }
  };

  const handleDataRefresh = async () => {
    try {
      toast.promise(
        fetchPokemonData({ limit: 151, offset: 0 }),
        {
          loading: "Fetching Pokémon data...",
          success: "Pokémon data updated successfully!",
          error: "Failed to fetch Pokémon data",
        }
      );
    } catch (error) {
      console.error("Error refreshing data:", error);
    }
  };

  const handleLoadMore = () => {
    setPage(prev => prev + 1);
  };

  // Get display data
  const displayPokemon = showFavorites ? (favorites || []) : (pokemonData?.pokemon || []);
  const favoriteIds = Array.isArray(favorites) ? favorites.map((f) => f.pokemonId) : [];
  const isLoading = pokemonData === undefined;
  const hasMore = pokemonData?.hasMore && !showFavorites;

  return (
    <div className="min-h-screen bg-background">
      <PokemonHeader
        isDark={isDark}
        onThemeToggle={handleThemeToggle}
        showFavorites={showFavorites}
        onFavoritesToggle={() => setShowFavorites(!showFavorites)}
        onDataRefresh={handleDataRefresh}
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
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Load More Pokémon"
              )}
            </Button>
          </motion.div>
        )}
      </main>
    </div>
  );
}
