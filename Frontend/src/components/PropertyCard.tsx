import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";

interface PropertyCardProps {
  image: string;
  title: string;
  location: string;
  type: string;
  yield: string;
  tokenPrice: string;
  totalValue: string;
  availableTokens: string;
  totalTokens: string;
  roi: string;
  appreciation: string;
  fundingProgress: number;
}

export const PropertyCard = ({
  image,
  title,
  location,
  type,
  yield: yieldPercent,
  tokenPrice,
  totalValue,
  availableTokens,
  totalTokens,
  roi,
  appreciation,
  fundingProgress,
}: PropertyCardProps) => {
  return (
    <Card className="group overflow-hidden border-border/50 transition-all duration-300 hover:border-primary/50 hover:shadow-lg">
      <div className="relative overflow-hidden">
        <img 
          src={image} 
          alt={title}
          className="h-64 w-full object-cover"
        />
      </div>

      <div className="p-6">
        <div className="mb-2 text-sm text-muted-foreground">{location}</div>
        <h3 className="mb-2 text-xl font-bold">{title}</h3>
        <div className="mb-4 flex items-center gap-2">
          <Badge variant="outline">{type}</Badge>
          <span className="text-sm text-success">+{appreciation} appreciation</span>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-muted-foreground">Token Price</div>
            <div className="text-lg font-bold">{tokenPrice}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Total Value</div>
            <div className="text-lg font-bold">{totalValue}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Available Tokens</div>
            <div className="text-sm font-semibold">
              {availableTokens} / {totalTokens}
            </div>
          </div>
        </div>

        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Funding Progress</span>
            <span className="font-semibold">{fundingProgress}%</span>
          </div>
          <Progress value={fundingProgress} className="h-2" />
        </div>

        <Button asChild className="w-full bg-primary hover:bg-primary/90">
          <Link to="/property-details">View Details</Link>
        </Button>
      </div>
    </Card>
  );
};
