import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Heart,
  Share2,
  MapPin,
  Building2,
  Bed,
  Bath,
  Maximize,
  Calendar,
  Car,
  LayoutGrid,
  Users,
  FileText,
  Download,
  Phone,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Play,
  CheckCircle2,
  Wallet,
  ArrowLeft,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { propertyAPI, Property, investmentAPI, userAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const PropertyDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInvesting, setIsInvesting] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [activeFilter, setActiveFilter] = useState("All");
  const [isInvestDialogOpen, setIsInvestDialogOpen] = useState(false);
  const [investmentAmount, setInvestmentAmount] = useState("");
  const [walletBalance, setWalletBalance] = useState(0);
  
  // Load property from backend
  useEffect(() => {
    if (id) {
      loadProperty(parseInt(id));
    }
  }, [id]);

  const loadProperty = async (propertyId: number) => {
    try {
      setIsLoading(true);
      const data = await propertyAPI.get(propertyId);
      setProperty(data);

      // Load user balance if logged in
      if (user) {
        const balanceData = await userAPI.getBalance(user.id);
        setWalletBalance(balanceData.mock_balance_usd);
      }
    } catch (error) {
      console.error("Failed to load property:", error);
      toast({
        title: "Error",
        description: "Failed to load property details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const tokenPrice = property ? (property.price_usd / property.total_tokens) : 1;
  const availableTokens = property ? (property.total_tokens - property.tokens_sold) : 0;
  
  const calculateTokens = () => {
    const amount = parseFloat(investmentAmount) || 0;
    return Math.floor(amount / tokenPrice);
  };
  
  const maxAffordableAmount = Math.min(walletBalance, availableTokens * tokenPrice);
  const tokensFromInput = calculateTokens();
  
  const canAfford = parseFloat(investmentAmount) <= walletBalance;
  const withinAvailableTokens = !investmentAmount || tokensFromInput <= availableTokens;
  const isValidAmount = investmentAmount && parseFloat(investmentAmount) > 0 && tokensFromInput > 0 && tokensFromInput <= availableTokens && canAfford;

  const handleInvest = async () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to invest in properties.",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    if (!property || !isValidAmount) {
      return;
    }

    try {
      setIsInvesting(true);

      const response = await investmentAPI.buy(user.id, property.id, tokensFromInput);

      toast({
        title: "Investment Successful!",
        description: `You've invested $${parseFloat(investmentAmount).toFixed(2)} and received ${tokensFromInput.toLocaleString()} tokens.`,
      });

      // Update wallet balance
      setWalletBalance(response.user_balance_after);

      // Reload property to get updated tokens_sold
      await loadProperty(property.id);

      // Close dialog and reset form
      setIsInvestDialogOpen(false);
      setInvestmentAmount("");
    } catch (error: any) {
      console.error("Investment failed:", error);
      toast({
        title: "Investment Failed",
        description: error.message || "Failed to process investment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsInvesting(false);
    }
  };

  const images = [
    {
      url: "https://images.unsplash.com/photo-1734716355718-ed9def14291a",
      category: "Exterior",
      alt: "Modern office building exterior with glass facade and contemporary architecture",
    },
    {
      url: "https://images.unsplash.com/photo-1568226189232-d4baf2b86437",
      category: "Interior",
      alt: "Spacious office interior with modern workstations and natural lighting",
    },
    {
      url: "https://images.unsplash.com/photo-1673519451881-6d801cad9040",
      category: "Interior",
      alt: "Executive conference room with large table and city view windows",
    },
    {
      url: "https://images.unsplash.com/photo-1668694337396-d98d9499eed0",
      category: "Amenity",
      alt: "Modern office lobby with marble floors and contemporary design elements",
    },
    {
      url: "https://images.unsplash.com/photo-1677823263444-556454fd123d",
      category: "Neighborhood",
      alt: "Downtown business district street view with modern buildings and urban landscape",
    },
  ];

  const amenities = [
    "High-speed Elevators",
    "24/7 Security",
    "Conference Facilities",
    "Fitness Center",
    "Rooftop Terrace",
    "Underground Parking",
    "HVAC System",
    "Fiber Internet",
  ];

  const documents = [
    { name: "Property Appraisal Report", size: "2.4 MB" },
    { name: "Financial Projections", size: "1.8 MB" },
    { name: "Legal Documentation", size: "3.2 MB" },
  ];

  const propertyDetails = [
    { icon: Building2, label: "Property Type", value: "Commercial Office" },
    { icon: Bed, label: "Bedrooms", value: "0 Beds" },
    { icon: Bath, label: "Bathrooms", value: "12 Baths" },
    { icon: Maximize, label: "Living Space", value: "15,000 sq ft" },
    { icon: Calendar, label: "Year Built", value: "2019" },
    { icon: Car, label: "Parking", value: "50 Spaces" },
    { icon: LayoutGrid, label: "Lot Size", value: "8,500 sq ft" },
    { icon: Users, label: "Investors", value: "156" },
  ];

  const filters = ["All", "Exterior", "Interior", "Amenity", "Neighborhood"];

  const filteredImages =
    activeFilter === "All"
      ? images
      : images.filter((img) => img.category === activeFilter);

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % filteredImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + filteredImages.length) % filteredImages.length);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  // Show error state if property not found
  if (!property) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="mb-4 text-2xl font-bold">Property Not Found</h1>
          <p className="mb-6 text-muted-foreground">
            The property you're looking for doesn't exist or has been removed.
          </p>
          <Button asChild>
            <Link to="/marketplace">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Marketplace
            </Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const fundingProgress = property.total_tokens > 0 
    ? (property.tokens_sold / property.total_tokens) * 100 
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div>
        {/* Hero Section with Image Gallery */}
        <section className="border-b bg-card/50">
          <div className="container mx-auto px-4 py-8">
            {/* Go Back Button */}
            <Link to="/marketplace" className="mb-4 inline-flex">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>
            </Link>
            
            <div className="grid gap-8 lg:grid-cols-3">
              {/* Main Image Gallery */}
              <div className="lg:col-span-2">
                <div className="relative overflow-hidden rounded-lg">
                  <img
                    src={property.image_url || filteredImages[currentImageIndex]?.url || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800"}
                    alt={property.name}
                    className="h-[500px] w-full object-cover"
                  />
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2 backdrop-blur-sm hover:bg-background"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2 backdrop-blur-sm hover:bg-background"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-background/80 px-4 py-2 text-sm backdrop-blur-sm">
                    {currentImageIndex + 1} / {filteredImages.length}
                  </div>
                </div>

                {/* Image Filter Tabs */}
                <div className="mt-4 flex gap-2">
                  {filters.map((filter) => (
                    <button
                      key={filter}
                      onClick={() => {
                        setActiveFilter(filter);
                        setCurrentImageIndex(0);
                      }}
                      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        activeFilter === filter
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80"
                      }`}
                    >
                      {filter} ({filter === "All" ? images.length : images.filter((img) => img.category === filter).length})
                    </button>
                  ))}
                </div>
              </div>

              {/* Property Summary Card */}
              <div className="lg:col-span-1">
                <Card>
                  <CardContent className="p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <Badge className="bg-primary text-primary-foreground">
                        {property.status}
                      </Badge>
                    </div>
                    <h1 className="mb-2 text-2xl font-bold">{property.name}</h1>
                    <div className="mb-4 flex items-start gap-2 text-muted-foreground">
                      <MapPin className="mt-1 h-4 w-4 flex-shrink-0" />
                      <span className="text-sm">{property.location}</span>
                    </div>

                    <div className="mb-6 grid grid-cols-2 gap-4 border-b border-t py-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Total Value</div>
                        <div className="text-2xl font-bold">${property.price_usd.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Projected Yield</div>
                        <div className="text-2xl font-bold text-success">{property.expected_annual_yield_percent}%</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Per Token</div>
                        <div className="text-xl font-bold">${tokenPrice.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Available Tokens</div>
                        <div className="text-xl font-bold">{availableTokens.toLocaleString()}</div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Funding Progress</span>
                        <span className="font-semibold">{fundingProgress.toFixed(1)}%</span>
                      </div>
                      <Progress value={fundingProgress} className="h-2" />
                      <div className="mt-2 text-xs text-muted-foreground">
                        {property.tokens_sold.toLocaleString()} / {property.total_tokens.toLocaleString()} tokens sold
                      </div>
                    </div>

                    <Button 
                      className="w-full" 
                      size="lg" 
                      onClick={() => {
                        if (!user) {
                          toast({
                            title: "Login Required",
                            description: "Please login to invest in properties.",
                            variant: "destructive",
                          });
                          navigate("/login");
                          return;
                        }
                        setIsInvestDialogOpen(true);
                      }}
                      disabled={availableTokens === 0}
                    >
                      {availableTokens === 0 ? "Fully Funded" : "Invest Now"}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="grid gap-8 lg:grid-cols-3">
              {/* Left Column - Main Content */}
              <div className="lg:col-span-2">
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="w-full justify-start">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="financials">Financials</TabsTrigger>
                    <TabsTrigger value="tokenization">Tokenization</TabsTrigger>
                    <TabsTrigger value="location">Location</TabsTrigger>
                    <TabsTrigger value="calculator">Calculator</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="mt-6 space-y-8">
                    {/* Property Details Grid */}
                    <div>
                      <h2 className="mb-4 text-2xl font-bold">Property Details</h2>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {propertyDetails.map((detail, index) => (
                          <Card key={index}>
                            <CardContent className="p-4">
                              <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                                <detail.icon className="h-4 w-4" />
                                <span className="text-xs">{detail.label}</span>
                              </div>
                              <div className="font-semibold">{detail.value}</div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>

                    {/* Amenities */}
                    <div>
                      <h2 className="mb-4 text-2xl font-bold">Amenities</h2>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {amenities.map((amenity, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-success" />
                            <span className="text-sm">{amenity}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <h2 className="mb-4 text-2xl font-bold">About This Property</h2>
                      <Card>
                        <CardContent className="p-6">
                          <p className="text-muted-foreground leading-relaxed">
                            {property.description || "No description available for this property."}
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Funding Progress */}
                    <div>
                      <h2 className="mb-4 text-2xl font-bold">Funding Progress</h2>
                      <Card>
                        <CardContent className="p-6">
                          <div className="mb-4 flex items-baseline gap-2">
                            <span className="text-3xl font-bold">
                              ${(property.tokens_sold * tokenPrice).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                            <span className="text-muted-foreground">of ${property.price_usd.toLocaleString()}</span>
                          </div>
                          <Progress value={fundingProgress} className="mb-4 h-3" />
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-2xl font-bold text-primary">{fundingProgress.toFixed(1)}%</div>
                              <div className="text-sm text-muted-foreground">Funded</div>
                            </div>
                            <div>
                              <div className="text-2xl font-bold">{availableTokens.toLocaleString()}</div>
                              <div className="text-sm text-muted-foreground">Tokens Available</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="financials" className="mt-6">
                    <Card>
                      <CardContent className="p-6">
                        <h2 className="mb-4 text-2xl font-bold">Financial Details</h2>
                        <p className="text-muted-foreground">
                          Detailed financial information and projections will be displayed here.
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="tokenization" className="mt-6">
                    <Card>
                      <CardContent className="p-6">
                        <h2 className="mb-4 text-2xl font-bold">Tokenization Details</h2>
                        <p className="text-muted-foreground">
                          Information about the tokenization structure and blockchain details.
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="location" className="mt-6">
                    <Card>
                      <CardContent className="p-6">
                        <h2 className="mb-4 text-2xl font-bold">Location & Neighborhood</h2>
                        <p className="text-muted-foreground">
                          Map and neighborhood information will be displayed here.
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="calculator" className="mt-6">
                    <Card>
                      <CardContent className="p-6">
                        <h2 className="mb-4 text-2xl font-bold">Investment Calculator</h2>
                        <p className="text-muted-foreground">
                          Calculate your potential returns and investment scenarios.
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Right Column - Sidebar */}
              <div className="lg:col-span-1">
                <div className="space-y-6">
                  {/* Quick Investment Card */}
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="mb-4 text-lg font-bold">Quick Investment</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Token Price</span>
                          <span className="font-semibold">$250</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Minimum Investment</span>
                          <span className="font-semibold">$1000</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Projected Yield</span>
                          <span className="font-semibold text-success">8.5%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Available Tokens</span>
                          <span className="font-semibold">7,200</span>
                        </div>

                        <div className="space-y-2 border-t pt-4">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="h-4 w-4 text-success" />
                            <span>SEC Compliant</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="h-4 w-4 text-success" />
                            <span>Blockchain Secured</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="h-4 w-4 text-success" />
                            <span>Fully Documented</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Investment Dialog */}
      <Dialog open={isInvestDialogOpen} onOpenChange={setIsInvestDialogOpen}>
        <DialogContent className="sm:max-w-[450px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invest in Property</DialogTitle>
            <DialogDescription>
              Enter the amount you want to invest
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            {/* Wallet Balance */}
            <div className="flex items-center justify-between rounded-lg bg-muted p-3">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-primary/10 p-1.5">
                  <Wallet className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Available Balance</p>
                  <p className="text-lg font-bold">${walletBalance.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Investment Amount Input */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="amount" className="text-sm">Investment Amount ($)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={investmentAmount}
                    onChange={(e) => setInvestmentAmount(e.target.value)}
                    min="0"
                    max={maxAffordableAmount}
                    step="0.01"
                    className="pl-7"
                  />
                </div>
              </div>
              
              {/* Slider */}
              <div className="space-y-1.5">
                <Slider
                  value={[parseFloat(investmentAmount) || 0]}
                  onValueChange={(value) => setInvestmentAmount(value[0].toString())}
                  min={0}
                  max={maxAffordableAmount}
                  step={tokenPrice}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>$0</span>
                  <span>${maxAffordableAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            {investmentAmount && parseFloat(investmentAmount) > 0 && tokensFromInput > 0 && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Tokens</span>
                  <span className="font-medium">
                    {tokensFromInput.toLocaleString()} / {availableTokens.toLocaleString()}
                  </span>
                </div>
                <Progress value={(tokensFromInput / availableTokens) * 100} className="h-1.5" />
              </div>
            )}

            {/* Cost Breakdown */}
            {investmentAmount && parseFloat(investmentAmount) > 0 && (
              <div className="space-y-2 rounded-lg border border-border p-3">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Investment</span>
                  <span className="font-medium">${parseFloat(investmentAmount).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Per token</span>
                  <span className="font-medium">${tokenPrice}</span>
                </div>
                <div className="border-t border-border pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold">You'll Receive</span>
                    <span className="text-lg font-bold">{tokensFromInput.toLocaleString()}</span>
                  </div>
                </div>
                {!canAfford && (
                  <p className="text-xs text-destructive">Insufficient balance (Max: ${walletBalance.toLocaleString()})</p>
                )}
                {!withinAvailableTokens && (
                  <p className="text-xs text-destructive">Only {availableTokens.toLocaleString()} tokens available</p>
                )}
              </div>
            )}

            {/* Buy Button */}
            <Button 
              className="w-full" 
              disabled={!isValidAmount || !canAfford || isInvesting}
              onClick={handleInvest}
            >
              {isInvesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Buy Tokens"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default PropertyDetails;
