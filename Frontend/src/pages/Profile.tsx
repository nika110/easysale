import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Progress } from "@/components/ui/progress";
import { 
  Settings, 
  Download, 
  Coins,
  ChevronsUpDown,
  ChevronDown,
  Eye,
  EyeOff,
  Copy,
  TrendingDown,
  Ellipsis,
  TrendingUp,
  DollarSign,
  Building2,
  Shield,
  BarChart3,
  Activity,
  CircleCheckBig,
  Clock,
  User,
  Wallet,
  Plus,
  Vote,
  Loader2
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { userAPI, portfolioAPI, PortfolioSummary, marketplaceAPI, daoAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const Profile = () => {
  const [activeFilter, setActiveFilter] = useState("all");
  const [isSellDialogOpen, setIsSellDialogOpen] = useState(false);
  const [selectedHolding, setSelectedHolding] = useState<any>(null);
  const [sellAmount, setSellAmount] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [isSelling, setIsSelling] = useState(false);
  const [isClaimingRent, setIsClaimingRent] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [balance, setBalance] = useState<number>(0);
  const [walletKeys, setWalletKeys] = useState<{
    blockchain_address: string | null;
    blockchain_private_key: string | null;
  }>({ blockchain_address: null, blockchain_private_key: null });
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rentStatuses, setRentStatuses] = useState<Record<number, any>>({});
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Check if user is logged in and load data
  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    loadUserData();
  }, [user, navigate]);

  const loadUserData = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      // Fetch balance
      const balanceData = await userAPI.getBalance(user.id);
      setBalance(balanceData.mock_balance_usd);
      
      // Fetch wallet keys
      const keysData = await userAPI.getWalletKeys(user.id);
      setWalletKeys({
        blockchain_address: keysData.blockchain_address,
        blockchain_private_key: keysData.blockchain_private_key,
      });

      // Fetch portfolio summary
      const portfolioData = await portfolioAPI.getSummary(user.id);
      setPortfolio(portfolioData);

      // Fetch rent status for each property
      const rentStatusData: Record<number, any> = {};
      for (const balance of portfolioData.balances) {
        try {
          const status = await daoAPI.getPropertyRentStatus(balance.property_id);
          rentStatusData[balance.property_id] = status;
        } catch (error) {
          console.error(`Failed to load rent status for property ${balance.property_id}:`, error);
        }
      }
      setRentStatuses(rentStatusData);
    } catch (error) {
      console.error("Failed to load user data:", error);
      toast({
        title: "Error",
        description: "Failed to load profile data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaimRent = async (propertyId: number) => {
    if (!user) return;

    try {
      setIsClaimingRent(true);

      const result = await daoAPI.claimRent(propertyId, user.id);

      toast({
        title: "Rent Claimed!",
        description: `Successfully claimed $${result.amount_claimed.toFixed(2)}. New balance: $${result.new_balance.toFixed(2)}`,
      });

      // Reload user data to update balance
      await loadUserData();
    } catch (error: any) {
      console.error("Failed to claim rent:", error);
      toast({
        title: "Claim Failed",
        description: error.message || "Failed to claim rent. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsClaimingRent(false);
    }
  };

  const handleSell = async () => {
    if (!user || !selectedHolding) return;

    const tokens = parseInt(sellAmount);
    const pricePerToken = parseFloat(sellPrice);

    if (!tokens || tokens <= 0 || tokens > selectedHolding.tokens) {
      toast({
        title: "Invalid Amount",
        description: `Please enter a valid amount between 1 and ${selectedHolding.tokens}`,
        variant: "destructive",
      });
      return;
    }

    if (!pricePerToken || pricePerToken <= 0) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid price per token",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSelling(true);

      await marketplaceAPI.createListing(
        user.id,
        selectedHolding.property_id,
        tokens,
        pricePerToken
      );

      toast({
        title: "Listing Created!",
        description: `Your ${tokens} tokens are now listed for sale at $${pricePerToken.toFixed(2)} each.`,
      });

      // Reload portfolio data
      await loadUserData();

      // Close dialog and reset
      setIsSellDialogOpen(false);
      setSellAmount("");
      setSellPrice("");
      setSelectedHolding(null);
    } catch (error: any) {
      console.error("Failed to create listing:", error);
      toast({
        title: "Listing Failed",
        description: error.message || "Failed to create listing. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSelling(false);
    }
  };
  
  const holdings = [
    {
      image: "https://images.unsplash.com/photo-1734716355718-ed9def14291a",
      title: "Premium Downtown Office Complex",
      location: "Tbilisi, Georgia",
      type: "Commercial Office",
      tokens: 1200,
      tokenPrice: 250,
      currentValue: 312000,
      initialValue: 300000,
      gainPercent: 4.00,
      gainAmount: 12000,
      monthlyYield: 2600,
      totalYield: 15600,
      ownership: 12.000,
    },
    {
      image: "https://images.unsplash.com/photo-1583947856882-37b5f88e86d2",
      title: "Luxury Residential Complex",
      location: "Batumi, Georgia",
      type: "Residential",
      tokens: 800,
      tokenPrice: 180,
      currentValue: 148800,
      initialValue: 144000,
      gainPercent: 3.33,
      gainAmount: 4800,
      monthlyYield: 1200,
      totalYield: 7200,
      ownership: 8.000,
    },
    {
      image: "https://images.unsplash.com/photo-1633509524547-20b98d7b770e",
      title: "Retail Shopping Center",
      location: "Kutaisi, Georgia",
      type: "Retail",
      tokens: 600,
      tokenPrice: 120,
      currentValue: 75600,
      initialValue: 72000,
      gainPercent: 5.00,
      gainAmount: 3600,
      monthlyYield: 600,
      totalYield: 3600,
      ownership: 6.000,
    },
    {
      image: "https://images.unsplash.com/photo-1642448217803-6154bf9a1151",
      title: "Industrial Warehouse",
      location: "Rustavi, Georgia",
      type: "Industrial",
      tokens: 640,
      tokenPrice: 95,
      currentValue: 63840,
      initialValue: 60800,
      gainPercent: 5.00,
      gainAmount: 3040,
      monthlyYield: 800,
      totalYield: 2400,
      ownership: 6.400,
    },
  ];

  const yieldHistory = [
    {
      property: "Premium Downtown Office Complex",
      period: "October 2024",
      paidDate: "Nov 1, 2024",
      amount: 2600,
      status: "paid",
      method: "bank transfer",
    },
    {
      property: "Luxury Residential Complex",
      period: "October 2024",
      paidDate: "Nov 1, 2024",
      amount: 1200,
      status: "paid",
      method: "bank transfer",
    },
    {
      property: "Retail Shopping Center",
      period: "October 2024",
      paidDate: "Nov 1, 2024",
      amount: 600,
      status: "paid",
      method: "reinvestment",
    },
    {
      property: "Industrial Warehouse",
      period: "October 2024",
      paidDate: "Nov 1, 2024",
      amount: 800,
      status: "paid",
      method: "crypto",
    },
    {
      property: "Premium Downtown Office Complex",
      period: "November 2024",
      paidDate: "Dec 1, 2024",
      amount: 2600,
      status: "pending",
      method: "bank transfer",
    },
    {
      property: "Luxury Residential Complex",
      period: "November 2024",
      paidDate: "Dec 1, 2024",
      amount: 1200,
      status: "pending",
      method: "bank transfer",
    },
  ];

  const filteredYieldHistory =
    activeFilter === "all"
      ? yieldHistory
      : yieldHistory.filter((item) => item.status === activeFilter);

  const totalPaid = yieldHistory
    .filter((item) => item.status === "paid")
    .reduce((sum, item) => sum + item.amount, 0);

  const totalPending = yieldHistory
    .filter((item) => item.status === "pending")
    .reduce((sum, item) => sum + item.amount, 0);

  const portfolioValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const totalInvestment = holdings.reduce((sum, h) => sum + h.initialValue, 0);
  const totalTokens = holdings.reduce((sum, h) => sum + h.tokens, 0);
  const totalYield = ((portfolioValue - totalInvestment) / totalInvestment) * 100;

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

  // Show login prompt if no user
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="mb-4 text-2xl font-bold">Please Log In</h1>
          <p className="mb-6 text-muted-foreground">
            You need to be logged in to view your profile.
          </p>
          <Button asChild>
            <Link to="/login">Go to Login</Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pb-20">
        <div className="container mx-auto px-4 py-12">
          {/* Profile Header */}
          <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4 pl-4">
              <Avatar className="h-24 w-24">
                <AvatarFallback>
                  <User className="h-12 w-12" />
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-3xl font-bold mb-1">{user.full_name || "User"}</h1>
                <p className="text-muted-foreground">{user.email}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Member since {new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 pr-4">
              <div className="rounded-full bg-primary/10 p-3">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Wallet Balance</p>
                <p className="text-3xl font-bold">${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>
            <div className="flex gap-2 hidden">
              <Button variant="outline">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export Portfolio
              </Button>
            </div>
          </div>

          {/* Wallet Section */}
          <Card className="mb-8 hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-primary/10 p-3">
                    <Wallet className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Wallet Balance</p>
                    <p className="text-3xl font-bold">$25,450.00</p>
                  </div>
                </div>
                <Button size="lg" className="hidden">
                  <Plus className="mr-2 h-5 w-5" />
                  Add Money
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Blockchain Wallet Keys */}
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Blockchain Wallet
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {walletKeys.blockchain_address ? (
                <>
                  {/* Public Key */}
                  <div className="flex items-center gap-2">
                    <Label className="text-xs font-medium whitespace-nowrap w-20">Public:</Label>
                    <Input
                      value={walletKeys.blockchain_address}
                      readOnly
                      className="font-mono text-xs h-7 flex-1"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => {
                        navigator.clipboard.writeText(walletKeys.blockchain_address || "");
                        toast({
                          title: "Copied!",
                          description: "Public address copied to clipboard",
                        });
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Private Key */}
                  {walletKeys.blockchain_private_key && (
                    <div className="flex items-center gap-2">
                      <Label className="text-xs font-medium whitespace-nowrap w-20">Private:</Label>
                      <Input
                        value={showPrivateKey ? walletKeys.blockchain_private_key : "••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••"}
                        readOnly
                        type={showPrivateKey ? "text" : "password"}
                        className="font-mono text-xs h-7 flex-1"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => setShowPrivateKey(!showPrivateKey)}
                      >
                        {showPrivateKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => {
                          navigator.clipboard.writeText(walletKeys.blockchain_private_key || "");
                          toast({
                            title: "Copied!",
                            description: "Private key copied to clipboard",
                          });
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    ⚠️ Keep your private key secure. Never share it with anyone.
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No blockchain wallet found. Please contact support.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6 pt-6 border-t border-border mb-8">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                ${portfolio ? portfolio.portfolio_value_usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
              </div>
              <div className="text-sm text-text-secondary">Portfolio Value</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">
                {portfolio ? portfolio.total_tokens.toLocaleString() : '0'}
              </div>
              <div className="text-sm text-text-secondary">Total Tokens</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success">
                {portfolio ? portfolio.total_yield_percent.toFixed(1) : '0.0'}%
              </div>
              <div className="text-sm text-text-secondary">Total Yield</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                ${portfolio ? portfolio.total_invested_usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
              </div>
              <div className="text-sm text-text-secondary">Total Investment</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success">
                ${portfolio && rentStatuses ? 
                  Object.entries(rentStatuses).reduce((total, [propId, status]) => {
                    if (!status.is_rented) return total;
                    const balance = portfolio.balances.find(b => b.property_id === parseInt(propId));
                    if (!balance) return total;
                    const monthlyRent = parseFloat(status.monthly_rent || '0');
                    const payout = (monthlyRent * balance.tokens) / balance.total_tokens;
                    return total + payout;
                  }, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  : '0.00'}
              </div>
              <div className="text-sm text-text-secondary">Monthly Rent</div>
            </div>
          </div>

          {/* DAO Voting Quick Access */}
          <Card className="mb-8 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-primary/20">
                    <Vote className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">DAO Governance</h3>
                    <p className="text-sm text-muted-foreground">
                      Vote on property decisions with your token holdings
                    </p>
                  </div>
                </div>
                <Button asChild>
                  <Link to="/dao-voting">
                    View Proposals
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="holdings" className="w-full">
            <TabsList>
              <TabsTrigger value="holdings">Token Holdings</TabsTrigger>
              <TabsTrigger value="analytics">Portfolio Analytics</TabsTrigger>
              <TabsTrigger value="yield">Yield History</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
            </TabsList>

            <TabsContent value="holdings" className="mt-8">
              <div className="animate-fade-in">
                {portfolio && portfolio.balances.length > 0 ? (
                  <div className="overflow-hidden rounded-lg border border-border bg-card">
                    <div className="border-b border-border px-6 py-4">
                      <h2 className="flex items-center text-lg font-semibold text-primary">
                        <Coins className="mr-2 h-5 w-5" />
                        Token Holdings ({portfolio.balances.length})
                      </h2>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-muted">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                              Property
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                              Tokens Owned
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                              Invested
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                              Expected Yield
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                              Annual Income
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                              Rent Payout
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {portfolio.balances.map((balance) => {
                            const monthlyIncome = balance.estimated_annual_income_usd / 12;
                            return (
                              <tr key={balance.property_id} className="transition-colors hover:bg-muted/50">
                                <td className="px-4 py-4">
                                  <div className="flex items-center space-x-3">
                                    <div>
                                      <div className="text-sm font-medium text-primary">
                                        {balance.property_name}
                                      </div>
                                      <div className="flex items-center gap-2 mt-1">
                                        <div className="text-xs text-muted-foreground">
                                          Property ID: {balance.property_id}
                                        </div>
                                        {rentStatuses[balance.property_id]?.is_rented && (
                                          <div className="flex items-center gap-1 text-xs text-success">
                                            <span className="font-medium">•</span>
                                            <span>Rented at ${rentStatuses[balance.property_id].monthly_rent}/month</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-4">
                                  <div className="font-mono font-medium text-primary">
                                    {balance.tokens.toLocaleString()}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    @ $1.00/token
                                  </div>
                                </td>
                                <td className="px-4 py-4">
                                  <div className="font-mono font-medium text-primary">
                                    ${balance.invested_usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </div>
                                </td>
                                <td className="px-4 py-4">
                                  <div className="font-mono font-medium text-success">
                                    {balance.expected_annual_yield_percent.toFixed(1)}%
                                  </div>
                                </td>
                                <td className="px-4 py-4">
                                  <div className="font-mono font-medium text-success">
                                    ${balance.estimated_annual_income_usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    ${monthlyIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/month
                                  </div>
                                </td>
                                <td className="px-4 py-4">
                                  {rentStatuses[balance.property_id]?.is_rented ? (
                                    <div>
                                      <div className="font-medium text-success">
                                        ${((parseFloat(rentStatuses[balance.property_id].monthly_rent || '0') * balance.tokens) / balance.total_tokens).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mo
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {((balance.tokens / balance.total_tokens) * 100).toFixed(2)}% share
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-xs text-muted-foreground">Not rented</div>
                                  )}
                                </td>
                                <td className="px-4 py-4">
                                  <div className="flex space-x-2">
                                    {rentStatuses[balance.property_id]?.is_rented && (
                                      <Button
                                        variant="default"
                                        size="sm"
                                        onClick={() => handleClaimRent(balance.property_id)}
                                        disabled={isClaimingRent}
                                      >
                                        <DollarSign className="mr-2 h-3.5 w-3.5" />
                                        Claim
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      title="View Property Details"
                                      asChild
                                    >
                                      <Link to={`/property/${balance.property_id}`}>
                                        <Eye className="h-3.5 w-3.5" />
                                      </Link>
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedHolding(balance);
                                        setIsSellDialogOpen(true);
                                        setSellAmount("");
                                      }}
                                    >
                                      <TrendingDown className="mr-2 h-3.5 w-3.5" />
                                      Sell
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-border bg-card p-12 text-center">
                    <Coins className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Token Holdings Yet</h3>
                    <p className="text-muted-foreground mb-6">
                      Start investing in properties to build your portfolio
                    </p>
                    <Button asChild>
                      <Link to="/marketplace">
                        Browse Properties
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="mt-8">
              <div className="animate-fade-in">
                <div className="space-y-6">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-lg border border-border bg-card p-6">
                      <div className="mb-4 flex items-center justify-between">
                        <TrendingUp className="h-6 w-6 text-primary" />
                        <div className="rounded bg-success/10 px-2 py-1 text-xs font-medium text-success">
                          +4.06%
                        </div>
                      </div>
                      <div className="mb-1 text-2xl font-bold text-primary">$600,240</div>
                      <div className="text-sm text-muted-foreground">Total Portfolio Value</div>
                      <div className="mt-2 text-xs text-success">+$23,440 Total Gain/Loss</div>
                    </div>

                    <div className="rounded-lg border border-border bg-card p-6">
                      <div className="mb-4 flex items-center justify-between">
                        <DollarSign className="h-6 w-6 text-success" />
                        <div className="rounded bg-success/10 px-2 py-1 text-xs font-medium text-success">
                          8.7% AVG
                        </div>
                      </div>
                      <div className="mb-1 text-2xl font-bold text-primary">$28,800</div>
                      <div className="text-sm text-muted-foreground">Total Yield Earned</div>
                      <div className="mt-2 text-xs text-muted-foreground">From 4 properties</div>
                    </div>

                    <div className="rounded-lg border border-border bg-card p-6">
                      <div className="mb-4 flex items-center justify-between">
                        <Building2 className="h-6 w-6 text-accent" />
                        <div className="rounded bg-current/10 px-2 py-1 text-xs font-medium text-success">
                          85/100
                        </div>
                      </div>
                      <div className="mb-1 text-2xl font-bold text-primary">4</div>
                      <div className="text-sm text-muted-foreground">Properties Invested</div>
                      <div className="mt-2 text-xs text-muted-foreground">Diversification Score</div>
                    </div>

                    <div className="rounded-lg border border-border bg-card p-6">
                      <div className="mb-4 flex items-center justify-between">
                        <Shield className="h-6 w-6 text-primary" />
                        <div className="rounded border border-warning/20 bg-warning/10 px-2 py-1 text-xs font-medium text-warning">
                          MEDIUM
                        </div>
                      </div>
                      <div className="mb-1 text-2xl font-bold text-primary">+2.3%</div>
                      <div className="text-sm text-muted-foreground">vs Market Performance</div>
                      <div className="mt-2 text-xs text-muted-foreground">Risk Level: medium</div>
                    </div>
                  </div>

                  {/* Performance and Health Cards */}
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Performance Breakdown */}
                    <div className="rounded-lg border border-border bg-card p-6">
                      <h3 className="mb-4 flex items-center text-lg font-semibold text-primary">
                        <BarChart3 className="mr-2 h-5 w-5" />
                        Performance Breakdown
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-border py-3">
                          <span className="text-muted-foreground">Total Investment</span>
                          <span className="font-mono font-medium text-primary">$576,800</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-border py-3">
                          <span className="text-muted-foreground">Current Value</span>
                          <span className="font-mono font-medium text-primary">$600,240</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-border py-3">
                          <span className="text-muted-foreground">Total Yield Earned</span>
                          <span className="font-mono font-medium text-success">$28,800</span>
                        </div>
                        <div className="flex items-center justify-between py-3">
                          <span className="text-muted-foreground">Net Gain/Loss</span>
                          <span className="font-mono font-medium text-success">+$23,440</span>
                        </div>
                      </div>
                    </div>

                    {/* Portfolio Health */}
                    <div className="rounded-lg border border-border bg-card p-6">
                      <h3 className="mb-4 flex items-center text-lg font-semibold text-primary">
                        <Activity className="mr-2 h-5 w-5" />
                        Portfolio Health
                      </h3>
                      <div className="space-y-6">
                        <div>
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Diversification</span>
                            <span className="text-sm font-medium text-success">85/100</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-muted">
                            <div
                              className="h-2 rounded-full bg-current text-success transition-all duration-300"
                              style={{ width: "85%" }}
                            ></div>
                          </div>
                        </div>

                        <div>
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Risk Level</span>
                            <span className="rounded border-warning/20 bg-warning/10 px-2 py-1 text-sm font-medium text-warning">
                              MEDIUM
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Balanced mix of stable and growth properties
                          </p>
                        </div>

                        <div>
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Market Performance</span>
                            <span className="text-sm font-medium text-success">+2.3%</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Outperforming the real estate market
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="yield" className="mt-8">
              <div className="animate-fade-in">
                <div className="rounded-lg border border-border bg-card">
                  {/* Header */}
                  <div className="border-b border-border px-6 py-4">
                    <div className="flex flex-col items-start justify-between space-y-4 sm:flex-row sm:items-center sm:space-y-0">
                      <div>
                        <h2 className="flex items-center text-lg font-semibold text-primary">
                          <TrendingUp className="mr-2 h-5 w-5" />
                          Yield History
                        </h2>
                        <div className="mt-2 flex items-center space-x-6 text-sm">
                          <span className="text-success">Total Earned: ${totalPaid.toLocaleString()}</span>
                          <span className="text-warning">Pending: ${totalPending.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant={activeFilter === "all" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setActiveFilter("all")}
                        >
                          All ({yieldHistory.length})
                        </Button>
                        <Button
                          variant={activeFilter === "paid" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setActiveFilter("paid")}
                        >
                          Paid ({yieldHistory.filter((i) => i.status === "paid").length})
                        </Button>
                        <Button
                          variant={activeFilter === "pending" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setActiveFilter("pending")}
                        >
                          Pending ({yieldHistory.filter((i) => i.status === "pending").length})
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Yield List */}
                  <div className="max-h-96 divide-y divide-border overflow-y-auto">
                    {filteredYieldHistory.map((item, index) => (
                      <div key={index} className="p-6 transition-colors hover:bg-muted/50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div
                              className={`flex h-10 w-10 items-center justify-center rounded-full ${
                                item.status === "paid" ? "bg-success/10" : "bg-warning/10"
                              }`}
                            >
                              {item.status === "paid" ? (
                                <CircleCheckBig className="h-5 w-5 text-success" />
                              ) : (
                                <Clock className="h-5 w-5 text-warning" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-primary">{item.property}</div>
                              <div className="text-sm text-muted-foreground">
                                {item.period} • {item.paidDate}
                              </div>
                              <div className="text-xs capitalize text-muted-foreground">
                                {item.method}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-mono font-semibold text-success">
                              +${item.amount.toLocaleString()}
                            </div>
                            <div
                              className={`inline-block rounded border px-2 py-1 text-xs font-medium ${
                                item.status === "paid"
                                  ? "border-success/20 bg-success/10 text-success"
                                  : "border-warning/20 bg-warning/10 text-warning"
                              }`}
                            >
                              {item.status === "paid" ? "Paid" : "Pending"}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="border-t border-border bg-muted/50 px-6 py-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Showing {filteredYieldHistory.length} of {yieldHistory.length} payments
                      </span>
                      <Button variant="ghost" size="sm">
                        <Download className="mr-2 h-3.5 w-3.5" />
                        Export History
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="transactions" className="mt-8">
              <Card>
                <CardContent className="p-8">
                  <h2 className="mb-4 text-xl font-bold">Transaction History</h2>
                  <p className="text-muted-foreground">
                    Complete transaction history and records will be displayed here.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Sell Tokens Dialog */}
      <Dialog open={isSellDialogOpen} onOpenChange={setIsSellDialogOpen}>
        <DialogContent className="sm:max-w-[450px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sell Tokens</DialogTitle>
            <DialogDescription>
              {selectedHolding ? `Sell your tokens for ${selectedHolding.title}` : 'Select tokens to sell'}
            </DialogDescription>
          </DialogHeader>
          
          {selectedHolding && (
            <div className="space-y-4 py-2">
              {/* Holdings Info */}
              <div className="rounded-lg bg-muted p-3">
                <div className="flex items-center gap-3 mb-3">
                  <Building2 className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{selectedHolding.property_name}</p>
                    <p className="text-xs text-muted-foreground">Property ID: {selectedHolding.property_id}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Your Tokens</p>
                    <p className="font-bold">{selectedHolding.tokens.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Invested</p>
                    <p className="font-bold">${selectedHolding.invested_usd.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Sell Amount Input */}
              <div className="space-y-2">
                <Label htmlFor="sellTokens" className="text-sm">Number of Tokens to Sell</Label>
                <Input
                  id="sellTokens"
                  type="number"
                  placeholder="0"
                  value={sellAmount}
                  onChange={(e) => setSellAmount(e.target.value)}
                  min="1"
                  max={selectedHolding.tokens}
                />
              </div>

              {/* Price Per Token Input */}
              <div className="space-y-2">
                <Label htmlFor="sellPrice" className="text-sm">Price per Token ($)</Label>
                <Input
                  id="sellPrice"
                  type="number"
                  placeholder="1.00"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  min="0.01"
                  step="0.01"
                />
                <p className="text-xs text-muted-foreground">
                  Original price: $1.00 per token
                </p>
              </div>

              {/* Sale Summary */}
              {sellAmount && sellPrice && parseInt(sellAmount) > 0 && parseFloat(sellPrice) > 0 && (
                <div className="space-y-2 rounded-lg border border-border p-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Tokens to Sell</span>
                    <span className="font-medium">{parseInt(sellAmount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Price per Token</span>
                    <span className="font-medium">${parseFloat(sellPrice).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Remaining Tokens</span>
                    <span className="font-medium">{(selectedHolding.tokens - parseInt(sellAmount)).toLocaleString()}</span>
                  </div>
                  <div className="border-t border-border pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold">Total Listing Value</span>
                      <span className="text-lg font-bold text-success">
                        ${(parseInt(sellAmount) * parseFloat(sellPrice)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Sell Button */}
              <Button 
                className="w-full" 
                variant="destructive"
                disabled={
                  !sellAmount || 
                  !sellPrice || 
                  parseInt(sellAmount) <= 0 || 
                  parseInt(sellAmount) > selectedHolding.tokens ||
                  parseFloat(sellPrice) <= 0 ||
                  isSelling
                }
                onClick={handleSell}
              >
                {isSelling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Listing...
                  </>
                ) : (
                  <>
                    <TrendingDown className="mr-2 h-4 w-4" />
                    Create Listing
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Your tokens will be listed on the secondary marketplace
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Profile;
