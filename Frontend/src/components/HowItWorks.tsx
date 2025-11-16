import { Building2, ShoppingCart, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export const HowItWorks = () => {
  const steps = [
    {
      number: "1",
      icon: Building2,
      title: "Browse Properties",
      description: "Explore our curated selection of premium real estate opportunities with detailed analytics and projections.",
    },
    {
      number: "2",
      icon: ShoppingCart,
      title: "Purchase Tokens",
      description: "Buy fractional ownership tokens starting from $100. Each token represents a share of the property's value and income.",
    },
    {
      number: "3",
      icon: TrendingUp,
      title: "Earn Returns",
      description: "Receive monthly rental income and benefit from property appreciation. Track your portfolio performance in real-time.",
    },
  ];

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold lg:text-4xl">How TokenEstate Works</h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Start investing in real estate with just three simple steps
          </p>
        </div>

        <div className="relative grid gap-8 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {index < steps.length - 1 && (
                <div className="absolute left-1/2 top-16 hidden h-1 w-full bg-gradient-to-r from-primary to-primary/50 md:block" />
              )}
              <div className="relative rounded-2xl border border-border/50 bg-card p-8 text-center transition-all duration-300 hover:border-primary/50 hover:shadow-lg">
                <div className="relative z-10 mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-2xl font-bold text-white">
                  {step.number}
                </div>
                <div className="mb-4 flex justify-center">
                  <div className="rounded-full bg-primary/10 p-4">
                    <step.icon className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <h3 className="mb-3 text-xl font-bold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
            <Link to="/marketplace">
              Start Investing Today
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};
