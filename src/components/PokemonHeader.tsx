import { motion } from "framer-motion";
import { Moon, Sun, Heart, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router";

interface PokemonHeaderProps {
  isDark: boolean;
  onThemeToggle: () => void;
  showFavorites: boolean;
  onFavoritesToggle: () => void;
  onDataRefresh: () => void;
}

export function PokemonHeader({
  isDark,
  onThemeToggle,
  showFavorites,
  onFavoritesToggle,
  onDataRefresh,
}: PokemonHeaderProps) {
  const { isAuthenticated, user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b"
    >
      <div className="container mx-auto px-4 py-3 md:py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => navigate("/")}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Pokédex</h1>
              <p className="text-xs text-muted-foreground">Gotta catch 'em all!</p>
            </div>
          </motion.div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 md:gap-2">
            {/* Data Refresh */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onDataRefresh}
              className="gap-2 px-2 sm:px-3"
              aria-label="Refresh Data"
            >
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Refresh Data</span>
            </Button>

            {/* Favorites Toggle */}
            {isAuthenticated && (
              <Button
                variant={showFavorites ? "default" : "ghost"}
                size="sm"
                onClick={onFavoritesToggle}
                className="gap-2 px-2 sm:px-3"
                aria-label={showFavorites ? "Show all Pokémon" : "Show favorites"}
              >
                <Heart className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {showFavorites ? "All Pokémon" : "Favorites"}
                </span>
              </Button>
            )}

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onThemeToggle}
              className="px-2 sm:px-3"
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>

            {/* Auth */}
            {isAuthenticated ? (
              <div className="flex items-center gap-1.5 md:gap-2">
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  {user?.name || user?.email || "Trainer"}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => signOut()}
                  className="px-2 sm:px-3"
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/auth")}
                className="px-2 sm:px-3"
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.header>
  );
}