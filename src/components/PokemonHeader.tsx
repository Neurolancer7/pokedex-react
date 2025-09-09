import { motion } from "framer-motion";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router";
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery as useConvexQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";

interface PokemonHeaderProps {
  isDark: boolean;
  onThemeToggle: () => void;
  showFavorites: boolean;
  onFavoritesToggle: () => void;
}

export function PokemonHeader({
  isDark,
  onThemeToggle,
  showFavorites,
  onFavoritesToggle,
}: PokemonHeaderProps) {
  const { isAuthenticated, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // NEW: Profile dialog state
  const [profileOpen, setProfileOpen] = useState(false);
  const [displayName, setDisplayName] = useState<string>(user?.name ?? user?.email ?? "Trainer");
  const DEFAULT_AVATAR = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png";
  const [selectedImage, setSelectedImage] = useState<string>(user?.image || DEFAULT_AVATAR);

  // Load favorites for avatar selection
  const favorites = useConvexQuery(api.pokemon.getFavorites, isAuthenticated ? {} : undefined);
  // Mutation to update profile
  const updateProfile = useAction(api.usersActions.updateProfile);

  // Keep local state in sync with user changes
  useEffect(() => {
    if (user?.name) setDisplayName(user.name);
    if (user?.image) setSelectedImage(user.image);
    if (!user?.image) setSelectedImage(DEFAULT_AVATAR);
  }, [user]);

  // Build avatar options from favorites
  const favoriteAvatarOptions = Array.isArray(favorites)
    ? favorites
        .map((p) => p?.sprites?.officialArtwork || p?.sprites?.frontDefault)
        .filter((u): u is string => !!u)
    : [];

  // Header UI
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

          {/* Actions - Desktop updated: username with avatar dropdown only */}
          <div className="hidden sm:flex items-center gap-1.5 md:gap-2">
            {isAuthenticated ? (
              <DropdownMenu open={userMenuOpen} onOpenChange={setUserMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="px-2 sm:px-3 flex items-center gap-2"
                    onMouseEnter={() => setUserMenuOpen(true)}
                  >
                    <Avatar className="size-6">
                      <AvatarImage src={selectedImage} alt="Profile" />
                      <AvatarFallback>TR</AvatarFallback>
                    </Avatar>
                    <span className="max-w-[160px] truncate">
                      {user?.name || user?.email || "Trainer"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-44"
                  onMouseEnter={() => setUserMenuOpen(true)}
                  onMouseLeave={() => setUserMenuOpen(false)}
                >
                  <DropdownMenuItem onClick={() => setProfileOpen(true)}>
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onFavoritesToggle()}>
                    {showFavorites ? "All Pokémon" : "Favorites"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      signOut();
                    }}
                  >
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
                  {/* Account */}
                  <div className="px-1 text-xs font-medium text-muted-foreground">Account</div>
                  {isAuthenticated ? (
                    <>
                      <div className="flex items-center gap-2 px-2 py-1">
                        <Avatar className="size-7">
                          <AvatarImage src={selectedImage} alt="Profile" />
                          <AvatarFallback>TR</AvatarFallback>
                        </Avatar>
                        <div className="text-sm text-muted-foreground">
                          {user?.name || user?.email || "Trainer"}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="outline"
                          className="w-full justify-center py-3"
                          onClick={() => {
                            setProfileOpen(true);
                            setMenuOpen(false);
                          }}
                        >
                          Profile
                        </Button>
                        <Button
                          variant="ghost"
                          className="w-full justify-center py-3"
                          onClick={() => {
                            onFavoritesToggle();
                            setMenuOpen(false);
                          }}
                        >
                          {showFavorites ? "All Pokémon" : "Favorites"}
                        </Button>
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
                      </div>
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

      {/* Profile Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Preview */}
            <div className="flex items-center gap-3">
              <Avatar className="size-12">
                <AvatarImage src={selectedImage} alt="Profile" />
                <AvatarFallback>TR</AvatarFallback>
              </Avatar>
              <div className="text-sm text-muted-foreground">
                This is how your profile appears.
              </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
              />
            </div>

            {/* Avatar picker */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Profile icon</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedImage(DEFAULT_AVATAR)}
                  className="h-8"
                >
                  Reset to default
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                Choose a Pokémon from your favorites as your avatar.
              </div>
              <div className="grid grid-cols-5 sm:grid-cols-6 gap-3 max-h-52 overflow-auto border rounded-md p-3">
                {/* Default option */}
                <button
                  type="button"
                  onClick={() => setSelectedImage(DEFAULT_AVATAR)}
                  className={`rounded-lg border p-2 flex items-center justify-center hover:bg-accent transition
                    ${selectedImage === DEFAULT_AVATAR ? "ring-2 ring-primary" : ""}`}
                  aria-label="Default Pokéball avatar"
                >
                  <img
                    src={DEFAULT_AVATAR}
                    alt="Default Pokéball"
                    className="h-10 w-10 object-contain"
                  />
                </button>

                {favoriteAvatarOptions.length === 0 ? (
                  <div className="col-span-4 sm:col-span-5 text-xs text-muted-foreground self-center">
                    Add some favorites to choose an avatar.
                  </div>
                ) : (
                  favoriteAvatarOptions.map((url, idx) => (
                    <button
                      key={`${url}-${idx}`}
                      type="button"
                      onClick={() => setSelectedImage(url)}
                      className={`rounded-lg border p-2 flex items-center justify-center hover:bg-accent transition
                        ${selectedImage === url ? "ring-2 ring-primary" : ""}`}
                      aria-label="Choose favorite as avatar"
                    >
                      <img src={url} alt="Favorite Pokémon" className="h-10 w-10 object-contain" />
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setProfileOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  try {
                    await updateProfile({
                      name: displayName?.trim() || undefined,
                      image: selectedImage || undefined,
                    });
                    toast.success("Profile updated");
                    setProfileOpen(false);
                  } catch (e) {
                    const msg = e instanceof Error ? e.message : "Failed to update profile";
                    toast.error(msg);
                  }
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.header>
  );
}