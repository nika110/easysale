import { Building2, TrendingUp, DollarSign, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import heroBuilding from "@/assets/hero-building.jpg";

export const Hero = () => {
  return (
    <section className="relative overflow-hidden bg-white py-20">
      <div className="container relative mx-auto px-4">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col justify-center">
            <h1 className="mb-6 text-5xl font-bold leading-tight text-foreground lg:text-6xl">
              Invest in Real Estate
              <br />
              <span className="bg-gradient-to-r from-cyan to-cyan-light bg-clip-text text-transparent">
                Starting at $100
              </span>
            </h1>

            <p className="mb-8 text-lg text-muted-foreground">
              Own fractional shares of premium properties worldwide through blockchain tokenization. 
              Build wealth with real estate without the traditional barriers of large capital requirements.
            </p>

            <div className="mb-12 flex flex-wrap gap-4">
              <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
                <Link to="/marketplace">
                  <Building2 className="mr-2 h-5 w-5" />
                  Explore Properties
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/about">
                  About Us
                </Link>
              </Button>
            </div>
          </div>

          <div className="relative">
            <Card className="overflow-hidden border-border bg-card p-4">
              <img 
                src={heroBuilding} 
                alt="Modern luxury apartment building" 
                className="h-[400px] w-full rounded-lg object-cover"
              />
              
              <div className="absolute right-8 top-8 rounded-lg border border-border bg-background/80 p-4 backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-success p-1">
                    <TrendingUp className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-2xl font-bold">+24.5%</div>
                </div>
                <div className="text-xs text-muted-foreground">Portfolio Growth</div>
              </div>

              <div className="absolute bottom-8 right-8 rounded-lg border border-border bg-background/80 p-4 backdrop-blur-md">
                <div className="text-2xl font-bold">$156,240</div>
                <div className="text-xs text-muted-foreground">Total Invested</div>
                <div className="mt-1 text-xs text-primary">+$12,450 this month</div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};
