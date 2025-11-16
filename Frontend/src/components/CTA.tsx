import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, TrendingUp, DollarSign, PieChart, Lock } from "lucide-react";

export const CTA = () => {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-4xl font-bold lg:text-5xl">
            Invest smart, without the complexity
          </h2>
          <p className="mx-auto max-w-3xl text-xl text-muted-foreground">
            Access high-performing real estate opportunities, transparent data, and a global investor community—no experience required.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="group relative overflow-hidden rounded-2xl border bg-card p-8 transition-all hover:shadow-lg hover:border-primary/50">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <DollarSign className="h-6 w-6" />
            </div>
            <h3 className="mb-3 text-xl font-bold">Start small, own big</h3>
            <p className="text-muted-foreground leading-relaxed">
              Buy fractional shares of premium rental properties without saving for a huge down payment.
            </p>
          </div>

          <div className="group relative overflow-hidden rounded-2xl border bg-card p-8 transition-all hover:shadow-lg hover:border-primary/50">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-success/10 text-success">
              <TrendingUp className="h-6 w-6" />
            </div>
            <h3 className="mb-3 text-xl font-bold">Earn income daily, grow wealth steadily</h3>
            <p className="text-muted-foreground leading-relaxed">
              Receive rental payouts every single day and benefit from property value appreciation when you sell your tokens.
            </p>
          </div>

          <div className="group relative overflow-hidden rounded-2xl border bg-card p-8 transition-all hover:shadow-lg hover:border-primary/50">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-warning/10 text-warning">
              <PieChart className="h-6 w-6" />
            </div>
            <h3 className="mb-3 text-xl font-bold">Build a diversified real estate portfolio effortlessly</h3>
            <p className="text-muted-foreground leading-relaxed">
              Own pieces of multiple properties—while professional managers handle tenants, maintenance, and operations for you.
            </p>
          </div>

          <div className="group relative overflow-hidden rounded-2xl border bg-card p-8 transition-all hover:shadow-lg hover:border-primary/50">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-cyan/10 text-cyan">
              <Lock className="h-6 w-6" />
            </div>
            <h3 className="mb-3 text-xl font-bold">Your investments. Your control.</h3>
            <p className="text-muted-foreground leading-relaxed">
              No brokers. No lock-ins. Reinvest your earnings or list your tokens for sale whenever you choose.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
