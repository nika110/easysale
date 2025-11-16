import { Building2, Search, Menu, ShoppingCart, LogIn, User, Settings, LogOut, ChevronDown, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { userAPI } from "@/lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Header = () => {
  const [openMobileMenu, setOpenMobileMenu] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Fetch user balance when user is logged in
  useEffect(() => {
    const fetchBalance = async () => {
      if (user) {
        try {
          const balanceData = await userAPI.getBalance(user.id);
          setBalance(balanceData.mock_balance_usd);
        } catch (error) {
          console.error('Failed to fetch balance:', error);
          // Fallback to user's stored balance
          setBalance(user.mock_balance_usd);
        }
      } else {
        setBalance(null);
      }
    };

    fetchBalance();

    // Refresh balance every 10 seconds if user is logged in
    const interval = user ? setInterval(fetchBalance, 10000) : null;

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const getUserInitials = () => {
    if (!user) return 'U';
    if (user.full_name) {
      return user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return user.email[0].toUpperCase();
  };

  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(balance);
  };

  return (
    <section className="py-4">
      <div className="container">
        {/* Desktop Navbar */}
        <nav className="hidden justify-between lg:flex">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <img src="/favicon.svg" alt="TokenEstate" className="h-8 w-8" />
              <span className="text-lg font-bold">TokenEstate</span>
            </Link>
            <div className="flex items-center">
              <NavigationMenu className="[&_[data-radix-navigation-menu-viewport]]:rounded-3xl">
                <NavigationMenuList className="rounded-3xl">
                  <NavigationMenuItem className="text-muted-foreground !rounded-3xl">
                    <Link
                      to="/"
                      className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      Home
                    </Link>
                  </NavigationMenuItem>
                  <NavigationMenuItem className="text-muted-foreground !rounded-3xl">
                    <Link
                      to="/marketplace"
                      className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      Marketplace
                    </Link>
                  </NavigationMenuItem>
                  <NavigationMenuItem className="text-muted-foreground !rounded-3xl">
                    <Link
                      to="/secondary-marketplace"
                      className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      Secondary Market
                    </Link>
                  </NavigationMenuItem>
                  <NavigationMenuItem className="text-muted-foreground !rounded-3xl">
                    <Link
                      to="/about"
                      className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      About
                    </Link>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 hover:bg-accent">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{user.full_name || user.email.split('@')[0]}</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span className="font-semibold">{user.full_name || user.email.split('@')[0]}</span>
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                      <div className="mt-2 flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-primary" />
                        <span className="text-sm font-bold text-primary">
                          {balance !== null ? formatBalance(balance) : formatBalance(user.mock_balance_usd)}
                        </span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="flex items-center cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild size="sm">
                <Link to="/login">
                  <LogIn className="mr-2 size-4" />
                  Sign in
                </Link>
              </Button>
            )}
          </div>
        </nav>

        {/* Mobile Navbar */}
        <div className="block lg:hidden">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <img src="/favicon.svg" alt="TokenEstate" className="h-8 w-8" />
              <span className="text-lg font-bold">TokenEstate</span>
            </Link>
            <div className="flex items-center gap-2">
              {/* Menu Sheet */}
              <Sheet open={openMobileMenu} onOpenChange={setOpenMobileMenu}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="size-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent className="overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>
                      <Link to="/" className="flex items-center gap-2" onClick={() => setOpenMobileMenu(false)}>
                        <img src="/favicon.svg" alt="TokenEstate" className="h-8 w-8" />
                        <span className="text-lg font-bold">TokenEstate</span>
                      </Link>
                    </SheetTitle>
                  </SheetHeader>
                  <div className="my-6 flex flex-col gap-6">
                    <Accordion
                      type="single"
                      collapsible
                      className="flex w-full flex-col gap-4"
                    >
                      <Link to="/" className="font-semibold" onClick={() => setOpenMobileMenu(false)}>
                        Home
                      </Link>
                      <Link to="/marketplace" className="font-semibold" onClick={() => setOpenMobileMenu(false)}>
                        Marketplace
                      </Link>
                      <Link to="/secondary-marketplace" className="font-semibold" onClick={() => setOpenMobileMenu(false)}>
                        Secondary Market
                      </Link>
                    </Accordion>
                    <div className="flex flex-col gap-3">
                      {user ? (
                        <>
                          <Button variant="outline" asChild>
                            <Link to="/profile" onClick={() => setOpenMobileMenu(false)}>
                              <User className="mr-2 size-4" />
                              Profile
                            </Link>
                          </Button>
                          <Button variant="destructive" onClick={handleLogout}>
                            <LogOut className="mr-2 size-4" />
                            Log out
                          </Button>
                        </>
                      ) : (
                        <Button>
                          <LogIn className="mr-2 size-4" />
                          Sign in
                        </Button>
                      )}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
