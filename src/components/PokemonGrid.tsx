import { motion } from "framer-motion";
import { PokemonCard } from "./PokemonCard";
import { PokemonDetailModal } from "./PokemonDetailModal";
import type { Pokemon } from "@/lib/pokemon-api";
import { useState } from "react";

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
      {typeof currentPage === "number" &&
        typeof totalPages === "number" &&
        typeof onPageChange === "function" &&
        totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <nav
              className="flex items-center gap-1.5 bg-card/60 backdrop-blur rounded-full p-1.5 shadow-sm border"
              aria-label="pagination"
            >
              <button
                className={`h-9 w-9 inline-flex items-center justify-center rounded-full text-sm transition-colors
                  ${currentPage === 1
                    ? "opacity-50 pointer-events-none"
                    : "hover:bg-accent/60"}
                `}
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                aria-label="Previous page"
              >
                ‹
              </button>

              {getPageNumbers(currentPage, totalPages).map((p, idx) =>
                p === "ellipsis" ? (
                  <span
                    key={`e-${idx}`}
                    className="h-9 min-w-9 px-2 inline-flex items-center justify-center rounded-full text-sm text-muted-foreground"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => onPageChange(p as number)}
                    className={`h-9 min-w-9 px-3 inline-flex items-center justify-center rounded-full text-sm transition-colors
                      ${p === currentPage
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent/60"
                      }`}
                    aria-current={p === currentPage ? "page" : undefined}
                    aria-label={`Page ${p}`}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                className={`h-9 w-9 inline-flex items-center justify-center rounded-full text-sm transition-colors
                  ${currentPage === totalPages
                    ? "opacity-50 pointer-events-none"
                    : "hover:bg-accent/60"}
                `}
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                aria-label="Next page"
              >
                ›
              </button>
            </nav>
          </div>
        )}

      <PokemonDetailModal
        pokemon={selectedPokemon}
        isOpen={!!selectedPokemon}
        onClose={() => setSelectedPokemon(null)}
        isFavorite={selectedPokemon ? favorites.includes(selectedPokemon.pokemonId) : false}
        onFavoriteToggle={onFavoriteToggle}
      />
    </>
  );
}