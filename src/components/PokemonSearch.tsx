import { useState, useEffect } from "react";
import { Search, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { POKEMON_TYPES, POKEMON_GENERATIONS } from "@/lib/pokemon-api";

interface PokemonSearchProps {
  onSearch: (query: string) => void;
  onFilterChange: (filters: {
    types: string[];
    generation?: number;
  }) => void;
  searchQuery: string;
  selectedTypes: string[];
  selectedGeneration?: number;
}

export function PokemonSearch({
  onSearch,
  onFilterChange,
  searchQuery,
  selectedTypes,
  selectedGeneration,
}: PokemonSearchProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      onSearch(localSearch);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [localSearch, onSearch]);

  const handleTypeToggle = (type: string) => {
    const newTypes = selectedTypes.includes(type)
      ? selectedTypes.filter(t => t !== type)
      : [...selectedTypes, type];
    
    onFilterChange({
      types: newTypes,
      generation: selectedGeneration,
    });
  };

  const handleGenerationChange = (generation: string) => {
    onFilterChange({
      types: selectedTypes,
      generation: generation === "all" ? undefined : parseInt(generation),
    });
  };

  const clearFilters = () => {
    onFilterChange({ types: [], generation: undefined });
  };

  const hasActiveFilters = selectedTypes.length > 0 || selectedGeneration;

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search Pokémon by name or number..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="pl-9 pr-4"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Generation Filter */}
        <Select
          value={selectedGeneration?.toString() || "all"}
          onValueChange={handleGenerationChange}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Generation" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Generations</SelectItem>
            {POKEMON_GENERATIONS.map((gen) => (
              <SelectItem key={gen.id} value={gen.id.toString()}>
                {gen.name} ({gen.range})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Type Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Types
              {selectedTypes.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {selectedTypes.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-4">
              <h4 className="font-medium">Filter by Type</h4>
              <div className="grid grid-cols-2 gap-2">
                {POKEMON_TYPES.map((type) => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={type}
                      checked={selectedTypes.includes(type)}
                      onCheckedChange={() => handleTypeToggle(type)}
                    />
                    <label
                      htmlFor={type}
                      className="text-sm font-medium capitalize cursor-pointer"
                    >
                      {type}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {selectedTypes.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedTypes.map((type) => (
            <Badge
              key={type}
              variant="secondary"
              className="gap-1 cursor-pointer"
              onClick={() => handleTypeToggle(type)}
            >
              {type}
              <X className="h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
