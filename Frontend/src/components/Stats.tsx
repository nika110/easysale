import { TrendingUp } from "lucide-react";

export const Stats = () => {
  const stats = [
    {
      value: "$2.4B+",
      label: "Total Investment Volume",
      description: "Cumulative investment across all tokenized properties on our platform",
      change: "24.5%",
    },
    {
      value: "10,000+",
      label: "Active Investors",
      description: "Growing community of investors building wealth through real estate",
      change: "18.2%",
    },
    {
      value: "8.2%",
      label: "Average Annual Yield",
      description: "Consistent returns from rental income and property appreciation",
      change: "3.1%",
    },
    {
      value: "150+",
      label: "Properties Tokenized",
      description: "Premium real estate opportunities across global markets",
      change: "12.8%",
    },
  ];

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold lg:text-4xl">
            Trusted by Thousands of Investors
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Join a growing community of smart investors who are building wealth through tokenized real estate.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <div 
              key={index}
              className="group relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card to-card/50 p-6 transition-all duration-300 hover:border-primary/50 hover:shadow-lg"
            >
              <div className="mb-2 flex items-center gap-2">
                <div className="text-3xl font-bold text-foreground lg:text-4xl">
                  {stat.value}
                </div>
                <div className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-xs font-semibold text-success">
                  <TrendingUp className="h-3 w-3" />
                  {stat.change}
                </div>
              </div>
              <h3 className="mb-2 font-semibold text-foreground">{stat.label}</h3>
              <p className="text-sm text-muted-foreground">{stat.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-8 rounded-2xl border border-border/50 bg-card/50 p-8">
          <div className="text-center">
            <div className="mb-1 text-sm font-semibold">SEC</div>
            <div className="text-xs text-muted-foreground">Compliant</div>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-center">
            <div className="mb-1 text-sm font-semibold">SOC 2</div>
            <div className="text-xs text-muted-foreground">Certified</div>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-center">
            <div className="mb-1 text-sm font-semibold">256-bit</div>
            <div className="text-xs text-muted-foreground">Encryption</div>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-center">
            <div className="mb-1 text-sm font-semibold">FDIC</div>
            <div className="text-xs text-muted-foreground">Insured</div>
          </div>
        </div>
      </div>
    </section>
  );
};
