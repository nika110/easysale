import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Search, SlidersHorizontal, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { propertyAPI, Property } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const Marketplace = () => {
  const [showFilters, setShowFilters] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  // Load properties from backend
  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    try {
      setIsLoading(true);
      const response = await propertyAPI.list();
      // Filter only properties in "offering" status
      const offeringProperties = response.items.filter(p => p.status === "offering");
      setProperties(offeringProperties);
    } catch (error) {
      console.error("Failed to load properties:", error);
      toast({
        title: "Error",
        description: "Failed to load properties. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter properties based on search
  const filteredProperties = properties.filter(property =>
    property.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    property.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pb-20">
        <div className="container mx-auto px-4 py-12">
          {/* Hero Section */}
          <div className="mb-12 text-center">
            <h1 className="mb-4 text-4xl font-bold md:text-5xl">Property Marketplace</h1>
            <p className="text-lg text-muted-foreground">
              Discover premium tokenized real estate investment opportunities worldwide
            </p>
          </div>

          {/* Search and Filters Bar */}
          <div className="mb-8 flex flex-col gap-4 md:flex-row">
            <Button 
              variant="outline" 
              className="md:w-auto"
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Filters
            </Button>
            
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Search by name or location" 
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Select defaultValue="featured">
              <SelectTrigger className="md:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="featured">Featured First</SelectItem>
                <SelectItem value="yield-high">Highest Yield</SelectItem>
                <SelectItem value="yield-low">Lowest Yield</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filters Panel (Collapsible) */}
          {showFilters && (
            <div className="mb-8 rounded-lg border bg-card p-6">
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">Property Type</label>
                  <Select defaultValue="all">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="residential">Residential</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                      <SelectItem value="industrial">Industrial</SelectItem>
                      <SelectItem value="mixed-use">Mixed-Use</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Location</label>
                  <Select defaultValue="all">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      <SelectItem value="us">United States</SelectItem>
                      <SelectItem value="uk">United Kingdom</SelectItem>
                      <SelectItem value="asia">Asia</SelectItem>
                      <SelectItem value="europe">Europe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Risk Level</label>
                  <Select defaultValue="all">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Risk Levels</SelectItem>
                      <SelectItem value="low">Low Risk</SelectItem>
                      <SelectItem value="medium">Medium Risk</SelectItem>
                      <SelectItem value="high">High Risk</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Status</label>
                  <Select defaultValue="all">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="funding">Funding</SelectItem>
                      <SelectItem value="funded">Funded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Results Count */}
          <div className="mb-6">
            <p className="text-sm text-muted-foreground">
              {isLoading ? "Loading..." : `${filteredProperties.length} properties found`}
            </p>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filteredProperties.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-lg text-muted-foreground">
                No properties in offering status found.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Check back later for new investment opportunities!
              </p>
            </div>
          )}

          {/* Property Grid */}
          {!isLoading && filteredProperties.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredProperties.map((property) => {
                const fundingProgress = property.total_tokens > 0 
                  ? (property.tokens_sold / property.total_tokens) * 100 
                  : 0;
                const tokenPrice = property.total_tokens > 0 
                  ? (property.price_usd / property.total_tokens).toFixed(2) 
                  : "0.00";
                
                return (
                  <Card key={property.id} className="group overflow-hidden transition-all hover:shadow-lg">
                    <div className="relative">
                      <img 
                        src={property.image_url || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800"} 
                        alt={property.name}
                        className="h-56 w-full object-cover"
                      />
                      <div className="absolute top-4 right-4">
                        <Badge className="bg-primary text-primary-foreground">
                          {property.status}
                        </Badge>
                      </div>
                    </div>

                    <CardContent className="p-6">
                      <Link to={`/property/${property.id}`} className="group">
                        <h3 className="mb-2 text-lg font-bold group-hover:text-primary">
                          {property.name}
                        </h3>
                      </Link>
                      
                      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{property.location}</span>
                      </div>

                      <div className="mb-4 space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Total Value</span>
                          <span className="font-semibold">${property.price_usd.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Projected Annual Yield</span>
                          <span className="font-semibold text-success">{property.expected_annual_yield_percent}%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Token Price</span>
                          <span className="font-semibold">${tokenPrice}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Total Tokens</span>
                          <span className="font-semibold">{property.total_tokens.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="mb-2 flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Funded</span>
                          <span className="font-semibold">{fundingProgress.toFixed(1)}%</span>
                        </div>
                        <Progress value={fundingProgress} className="h-2" />
                      </div>

                      <Button asChild className="w-full" size="sm">
                        <Link to={`/property/${property.id}`}>View Details</Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Marketplace;
