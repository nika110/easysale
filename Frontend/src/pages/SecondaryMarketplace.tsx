import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Search, Loader2, TrendingDown, TrendingUp, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { marketplaceAPI, MarketplaceListing } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const SecondaryMarketplace = () => {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  const [isBuyDialogOpen, setIsBuyDialogOpen] = useState(false);
  const [buyAmount, setBuyAmount] = useState("");
  const [isBuying, setIsBuying] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadListings();
  }, []);

  const loadListings = async () => {
    try {
      setIsLoading(true);
      const data = await marketplaceAPI.listListings();
      setListings(data);
    } catch (error) {
      console.error("Failed to load listings:", error);
      toast({
        title: "Error",
        description: "Failed to load marketplace listings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuy = async () => {
    if (!user || !selectedListing) {
      toast({
        title: "Login Required",
        description: "Please login to purchase tokens.",
        variant: "destructive",
      });
      return;
    }

    const tokens = parseInt(buyAmount);
    if (!tokens || tokens <= 0 || tokens > selectedListing.tokens_remaining) {
      toast({
        title: "Invalid Amount",
        description: `Please enter a valid amount between 1 and ${selectedListing.tokens_remaining}`,
        variant: "destructive",
      });
      return;
    }

    try {
      setIsBuying(true);
      await marketplaceAPI.purchaseListing(selectedListing.id, user.id, tokens);
      
      toast({
        title: "Purchase Successful!",
        description: `You've purchased ${tokens} tokens for $${(tokens * selectedListing.price_per_token_usd).toFixed(2)}`,
      });

      setIsBuyDialogOpen(false);
      setBuyAmount("");
      await loadListings();
    } catch (error: any) {
      console.error("Purchase failed:", error);
      toast({
        title: "Purchase Failed",
        description: error.message || "Failed to purchase tokens. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsBuying(false);
    }
  };

  const filteredListings = listings.filter(listing =>
    listing.property_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    listing.property_location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pb-20">
        <div className="container mx-auto px-4 py-12">
          {/* Hero Section */}
          <div className="mb-12 text-center">
            <h1 className="mb-4 text-4xl font-bold md:text-5xl">Secondary Marketplace</h1>
            <p className="text-lg text-muted-foreground">
              Buy tokens from other investors at market prices
            </p>
          </div>

          {/* Search Bar */}
          <div className="mb-8 flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Search by property name or location" 
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Results Count */}
          <div className="mb-6">
            <p className="text-sm text-muted-foreground">
              {isLoading ? "Loading..." : `${filteredListings.length} listings found`}
            </p>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filteredListings.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-lg text-muted-foreground">
                No listings available at the moment.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Check back later for new opportunities!
              </p>
            </div>
          )}

          {/* Listings Grid */}
          {!isLoading && filteredListings.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredListings.map((listing) => {
                const totalPrice = listing.tokens_remaining * listing.price_per_token_usd;
                // Positive discount_percent means discount (price < original)
                // Negative discount_percent means premium (price > original)
                const isDiscount = listing.discount_percent && listing.discount_percent > 0;
                const isPremium = listing.discount_percent && listing.discount_percent < 0;

                return (
                  <Card key={listing.id} className="group overflow-hidden transition-all hover:shadow-lg">
                    <div className="relative">
                      <img 
                        src={listing.property_image_url || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800"} 
                        alt={listing.property_name}
                        className="h-56 w-full object-cover"
                      />
                      <div className="absolute top-4 right-4">
                        {isDiscount && (
                          <Badge className="bg-success text-success-foreground">
                            {listing.discount_percent!.toFixed(1)}% OFF
                          </Badge>
                        )}
                        {isPremium && (
                          <Badge className="bg-warning text-warning-foreground">
                            {Math.abs(listing.discount_percent!).toFixed(1)}% Premium
                          </Badge>
                        )}
                      </div>
                    </div>

                    <CardContent className="p-6">
                      <Link to={`/property/${listing.property_id}`} className="group">
                        <h3 className="mb-2 text-lg font-bold group-hover:text-primary">
                          {listing.property_name}
                        </h3>
                      </Link>
                      
                      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{listing.property_location}</span>
                      </div>

                      <div className="mb-4 space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Price per Token</span>
                          <div className="flex flex-col items-end">
                            <span className="font-semibold">${listing.price_per_token_usd.toFixed(2)}</span>
                            {listing.discount_percent !== null && (
                              <span className="text-xs text-muted-foreground line-through">
                                ${listing.original_price_per_token_usd.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Available Tokens</span>
                          <span className="font-semibold">{listing.tokens_remaining.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Total Value</span>
                          <span className="font-semibold">${totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Expected Yield</span>
                          <span className="font-semibold text-success">{listing.expected_annual_yield_percent}%</span>
                        </div>
                      </div>

                      <Button 
                        className="w-full" 
                        size="sm"
                        onClick={() => {
                          setSelectedListing(listing);
                          setBuyAmount("");
                          setIsBuyDialogOpen(true);
                        }}
                      >
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Buy Tokens
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Buy Dialog */}
      <Dialog open={isBuyDialogOpen} onOpenChange={setIsBuyDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Buy Tokens</DialogTitle>
            <DialogDescription>
              Purchase tokens from this listing
            </DialogDescription>
          </DialogHeader>
          
          {selectedListing && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-muted p-4">
                <h4 className="font-semibold mb-2">{selectedListing.property_name}</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Price per Token:</span>
                    <span className="font-semibold">${selectedListing.price_per_token_usd.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Available:</span>
                    <span className="font-semibold">{selectedListing.tokens_remaining.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="buy-amount">Number of Tokens</Label>
                <Input
                  id="buy-amount"
                  type="number"
                  placeholder="0"
                  value={buyAmount}
                  onChange={(e) => setBuyAmount(e.target.value)}
                  min="1"
                  max={selectedListing.tokens_remaining}
                />
              </div>

              {buyAmount && parseInt(buyAmount) > 0 && (
                <div className="rounded-lg border border-border p-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Cost:</span>
                    <span className="text-lg font-bold">
                      ${(parseInt(buyAmount) * selectedListing.price_per_token_usd).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setIsBuyDialogOpen(false)}
                  disabled={isBuying}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1"
                  onClick={handleBuy}
                  disabled={isBuying || !buyAmount || parseInt(buyAmount) <= 0}
                >
                  {isBuying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Confirm Purchase"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default SecondaryMarketplace;

