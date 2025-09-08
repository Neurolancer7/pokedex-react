import { motion } from "framer-motion";
import { Moon, Sun, Heart, Database, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

interface PokemonHeaderProps {
  isDark: boolean;
  onThemeToggle: () => void;
  showFavorites: boolean;
  onFavoritesToggle: () => void;
  onDataRefresh: () => void;
  isRefreshing?: boolean;
}

export function PokemonHeader({
  isDark,
  onThemeToggle,
  showFavorites,
  onFavoritesToggle,
  onDataRefresh,
  isRefreshing = false,
}: PokemonHeaderProps) {
  const { isAuthenticated, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

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
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center overflow-hidden">
              <img
                src="https://harmless-tapir-303.convex.cloud/api/storage/dfdec238-dbb0-44cd-9147-50ae677b8144"
                alt="Pokédex logo"
                className="w-7 h-7 sm:w-8 sm:h-8 object-contain"
                loading="eager"
                decoding="async"
                fetchPriority="high"
                width={32}
                height={32}
              />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight">Pokédex</h1>
              <p className="text-xs text-muted-foreground">Gotta catch 'em all!</p>
            </div>
          </motion.div>

          {/* Actions - Desktop */}
          <div className="hidden sm:flex items-center gap-1.5 md:gap-2">
            {/* Data Refresh */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onDataRefresh}
              className="gap-2 px-2 sm:px-3"
              aria-label="Refresh Data"
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="hidden sm:inline">Refreshing...</span>
                </>
              ) : (
                <>
                  <Database className="h-4 w-4" />
                  <span className="hidden sm:inline">Refresh Data</span>
                </>
              )}
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

          {/* Mobile Menu */}
          <div className="sm:hidden">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="px-3" aria-label="Open menu">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[90vw] max-w-sm sm:w-72 pt-2">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>

                <div className="mt-3 space-y-2">
                  {/* Quick Actions */}
                  <div className="px-1 text-xs font-medium text-muted-foreground">Quick actions</div>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 py-3"
                    onClick={() => {
                      onDataRefresh();
                      setMenuOpen(false);
                    }}
                    disabled={isRefreshing}
                    aria-label="Refresh Data"
                  >
                    {isRefreshing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Refreshing...
                      </>
                    ) : (
                      <>
                        <Database className="h-4 w-4" />
                        Refresh Data
                      </>
                    )}
                  </Button>

                  {isAuthenticated && (
                    <Button
                      variant={showFavorites ? "default" : "ghost"}
                      className="w-full justify-start gap-2 py-3"
                      onClick={() => {
                        onFavoritesToggle();
                        setMenuOpen(false);
                      }}
                      aria-label={showFavorites ? "Show all Pokémon" : "Show favorites"}
                    >
                      <Heart className="h-4 w-4" />
                      {showFavorites ? "All Pokémon" : "Favorites"}
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 py-3"
                    onClick={() => {
                      onThemeToggle();
                      setMenuOpen(false);
                    }}
                    aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                  >
                    {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    {isDark ? "Light Mode" : "Dark Mode"}
                  </Button>

                  <Separator className="my-2" />

                  {/* Account */}
                  <div className="px-1 text-xs font-medium text-muted-foreground">Account</div>
                  {isAuthenticated ? (
                    <>
                      <div className="px-2 text-sm text-muted-foreground py-1">
                        {user?.name || user?.email || "Trainer"}
                      </div>
                      <Button
                        variant="outline"
                        className="w-full justify-center py-3"
                        onClick={() => {
                          signOut();
                          setMenuOpen(false);
                        }}
                        aria-label="Sign out"
                      >
                        Sign Out
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full justify-center py-3"
                      onClick={() => {
                        navigate("/auth");
                        setMenuOpen(false);
                      }}
                      aria-label="Sign in"
                    >
                      Sign In
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </motion.header>
  );
}