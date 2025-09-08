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
  const [page, setPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const INITIAL_LIMIT = 20;

  const computedLimit = INITIAL_LIMIT;
  const computedOffset = (page - 1) * INITIAL_LIMIT;

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
    setPage(1);
  };

  const handleFilterChange = (filters: { types: string[]; generation?: number }) => {
    setSelectedTypes(filters.types);
    setSelectedGeneration(filters.generation);
    setPage(1);
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
    if (!showFavorites) {
      // when coming back from favorites, reset to first page
      setPage(1);
    }
  }, [showFavorites]);

  const displayPokemon = showFavorites ? (favorites || []) : (pokemonData?.pokemon || []);
  const favoriteIds = Array.isArray(favorites) ? favorites.map((f) => f.pokemonId) : [];
  const isLoading = pokemonData === undefined && !showFavorites;

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
        onDataRefresh={handleDataRefresh}
        isRefreshing={isRefreshing}
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

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <PokemonGrid
            key={`${showFavorites ? "fav" : "all"}-${page}-${searchQuery}-${selectedTypes.join(",")}-${selectedGeneration ?? "all"}`}
            pokemon={displayPokemon}
            favorites={favoriteIds}
            onFavoriteToggle={handleFavoriteToggle}
            isLoading={isLoading}
            currentPage={!showFavorites ? page : undefined}
            totalPages={!showFavorites ? totalPages : undefined}
            onPageChange={
              !showFavorites
                ? (p) => {
                    setPage(p);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                : undefined
            }
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-8"
        >
          {false && (
            <div className="flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setPage((p) => Math.max(1, p - 1));
                      }}
                      aria-disabled={page === 1}
                      className={page === 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>

                  {getPageNumbers(page, totalPages).map((p, idx) =>
                    p === "ellipsis" ? (
                      <PaginationItem key={`e-${idx}`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    ) : (
                      <PaginationItem key={p}>
                        <PaginationLink
                          href="#"
                          isActive={p === page}
                          onClick={(e) => {
                            e.preventDefault();
                            setPage(p as number);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                        >
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  )}

                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setPage((p) => Math.min(totalPages, p + 1));
                      }}
                      aria-disabled={page === totalPages}
                      className={page === totalPages ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}