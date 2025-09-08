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
}

export function PokemonGrid({ 
  pokemon, 
  favorites, 
  onFavoriteToggle, 
  isLoading = false 
}: PokemonGridProps) {
  const [selectedPokemon, setSelectedPokemon] = useState<Pokemon | null>(null);

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
