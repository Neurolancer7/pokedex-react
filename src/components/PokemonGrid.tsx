import { motion } from "framer-motion";
import { PokemonCard } from "./PokemonCard";
import { PokemonDetailModal } from "./PokemonDetailModal";
import type { Pokemon } from "@/lib/pokemon-api";
import { useState } from "react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

interface PokemonGridProps {
  pokemon: Pokemon[];
  favorites: number[];
  onFavoriteToggle?: (pokemonId: number) => void;
  isLoading?: boolean;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

export function PokemonGrid({ 
  pokemon, 
  favorites, 
  onFavoriteToggle, 
  isLoading = false,
  currentPage,
  totalPages,
  onPageChange
}: PokemonGridProps) {
  const [selectedPokemon, setSelectedPokemon] = useState<Pokemon | null>(null);
  const [liveMsg, setLiveMsg] = useState<string>("");

  // Track if we've already attempted an auto-fix to avoid loops
  const autoFixedRef = useRef(false);

  // Add a safe page change utility with clamping + error handling
  const safeChange = (targetPage: number) => {
    const invalid =
      typeof currentPage !== "number" ||
      !Number.isFinite(currentPage) ||
      typeof totalPages !== "number" ||
      !Number.isFinite(totalPages) ||
      typeof onPageChange !== "function";

    if (invalid) {
      toast.error("Pagination is temporarily unavailable. Please try again.");
      return;
    }

    const safeTotal = Math.max(1, Math.floor(totalPages));
    const desired = Math.floor(targetPage);

    if (desired < 1) {
      toast.warning("You're already on the first page.");
      return;
    }
    if (desired > safeTotal) {
      toast.warning("You're already on the last page.");
      return;
    }
    if (desired === currentPage) return;

    try {
      onPageChange(desired);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to change page";
      toast.error(msg);
    }
  };

  // Auto-correct clearly invalid pagination states and announce them
  useEffect(() => {
    const canPaginate =
      typeof currentPage === "number" &&
      Number.isFinite(currentPage) &&
      typeof totalPages === "number" &&
      Number.isFinite(totalPages) &&
      typeof onPageChange === "function" &&
      totalPages > 0;

    if (!canPaginate) return;

    const max = Math.max(1, Math.floor(totalPages as number));
    const cur = Math.floor(currentPage as number);

    if (autoFixedRef.current) return;

    if (cur < 1) {
      autoFixedRef.current = true;
      setLiveMsg("Invalid page detected. Moved to the first page.");
      try {
        onPageChange!(1);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to change page";
        toast.error(msg);
      }
    } else if (cur > max) {
      autoFixedRef.current = true;
      setLiveMsg("Invalid page detected. Moved to the last page.");
      try {
        onPageChange!(max);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to change page";
        toast.error(msg);
      }
    } else {
      // valid state; clear previous message
      setLiveMsg("");
    }
  }, [currentPage, totalPages, onPageChange]);

  // Helper to compute page numbers with ellipsis
  const getPageNumbers = (current: number, total: number): Array<number | "ellipsis"> => {
    const pages: Array<number | "ellipsis"> = [];
    const add = (p: number | "ellipsis") => pages.push(p);

    if (total <= 1) return [1];

    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);

    add(1);
    if (start > 2) add("ellipsis");
    for (let p = start; p <= end; p++) add(p);
    if (end < total - 1) add("ellipsis");
    if (total > 1) add(total);

    const seen = new Set<string>();
    return pages.filter((p) => {
      const key = String(p);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-muted rounded-lg h-64"></div>
          </div>
        ))}
      </div>
    );
  }

  if (pokemon.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <div className="text-6xl mb-4">🔍</div>
        <h3 className="text-xl font-semibold mb-2">No Pokémon found</h3>
        <p className="text-muted-foreground">
          Try adjusting your search or filters
        </p>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ staggerChildren: 0.05 }}
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
      >
        {pokemon.map((poke, index) => (
          <motion.div
            key={poke.pokemonId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <PokemonCard
              pokemon={poke}
              isFavorite={favorites.includes(poke.pokemonId)}
              onFavoriteToggle={onFavoriteToggle}
              onClick={setSelectedPokemon}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Optional built-in pagination controls */}
      {(() => {
        const canPaginate =
          typeof currentPage === "number" &&
          Number.isFinite(currentPage) &&
          typeof totalPages === "number" &&
          Number.isFinite(totalPages) &&
          typeof onPageChange === "function" &&
          totalPages > 1;

        const outOfBounds =
          canPaginate && (currentPage! < 1 || currentPage! > totalPages!);

        return (
          canPaginate && (
            <div className="mt-8 flex flex-col items-center gap-2 px-2">
              {/* Accessible live region for pagination errors/auto-fixes */}
              <div className="sr-only" aria-live="polite">
                {liveMsg}
              </div>

              {outOfBounds && (
                <div
                  role="status"
                  className="text-xs md:text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-2 py-1"
                >
                  Page out of range. 
                  <button
                    className="ml-2 underline hover:opacity-80"
                    onClick={() =>
                      safeChange(currentPage! < 1 ? 1 : (totalPages as number))
                    }
                  >
                    Go to {currentPage! < 1 ? "first" : "last"} page
                  </button>
                </div>
              )}
              <nav
                className="inline-flex items-center gap-1 bg-card/90 backdrop-blur-sm rounded-full p-1.5 shadow-md border overflow-x-auto no-scrollbar"
                aria-label="pagination"
              >
                <button
                  className={`h-9 w-9 md:h-10 md:w-10 inline-flex items-center justify-center rounded-full text-sm transition-colors
                    ${currentPage === 1
                      ? "opacity-50 pointer-events-none"
                      : "hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"}
                  `}
                  onClick={() => safeChange((currentPage as number) - 1)}
                  aria-label="Previous page"
                  aria-disabled={currentPage === 1}
                  title="Previous"
                >
                  ‹
                </button>

                {getPageNumbers(currentPage as number, totalPages as number).map((p, idx) =>
                  p === "ellipsis" ? (
                    <span
                      key={`e-${idx}`}
                      className="h-9 min-w-9 md:h-10 md:min-w-10 px-2 inline-flex items-center justify-center rounded-full text-sm text-muted-foreground"
                      aria-hidden="true"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => safeChange(p as number)}
                      className={`h-9 min-w-9 md:h-10 md:min-w-10 px-3 inline-flex items-center justify-center rounded-full text-sm transition-colors
                        ${p === currentPage
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        }`}
                      aria-current={p === currentPage ? "page" : undefined}
                      aria-label={`Page ${p}`}
                      title={`Page ${p}`}
                    >
                      {p}
                    </button>
                  )
                )}

                <button
                  className={`h-9 w-9 md:h-10 md:w-10 inline-flex items-center justify-center rounded-full text-sm transition-colors
                    ${currentPage === totalPages
                      ? "opacity-50 pointer-events-none"
                      : "hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"}
                  `}
                  onClick={() => safeChange((currentPage as number) + 1)}
                  aria-label="Next page"
                  aria-disabled={currentPage === totalPages}
                  title="Next"
                >
                  ›
                </button>
              </nav>
            </div>
          )
        );
      })()}
      
      <PokemonDetailModal
        pokemon={selectedPokemon}
        isOpen={!!selectedPokemon}
        onClose={() => setSelectedPokemon(null)}
        isFavorite={selectedPokemon ? favorites.includes(selectedPokemon.pokemonId) : false}
        onFavoriteToggle={onFavoriteToggle}
        onNavigate={(dir) => {
          if (!selectedPokemon) return;
          const idx = pokemon.findIndex(p => p.pokemonId === selectedPokemon.pokemonId);
          if (idx === -1) return;
          const nextIndex = dir === "next" ? idx + 1 : idx - 1;
          if (nextIndex < 0 || nextIndex >= pokemon.length) return;
          setSelectedPokemon(pokemon[nextIndex]);
        }}
        hasPrev={(() => {
          if (!selectedPokemon) return false;
          const idx = pokemon.findIndex(p => p.pokemonId === selectedPokemon.pokemonId);
          return idx > 0;
        })()}
        hasNext={(() => {
          if (!selectedPokemon) return false;
          const idx = pokemon.findIndex(p => p.pokemonId === selectedPokemon.pokemonId);
          return idx >= 0 && idx < pokemon.length - 1;
        })()}
      />
    </>
  );
}