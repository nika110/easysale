import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { PropertyCard } from "@/components/PropertyCard";
import { Stats } from "@/components/Stats";
import { HowItWorks } from "@/components/HowItWorks";
import { Testimonials } from "@/components/Testimonials";
import { Security } from "@/components/Security";
import { CTA } from "@/components/CTA";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Star, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import propertyManhattan from "@/assets/property-manhattan.jpg";
import propertyAustin from "@/assets/property-austin.jpg";
import propertyMiami from "@/assets/property-miami.jpg";

const Index = () => {
  const featuredProperties = [
    {
      image: propertyManhattan,
      title: "Luxury Downtown Condominiums",
      location: "Manhattan, New York",
      type: "Residential",
      yield: "8.5%",
      tokenPrice: "$250",
      totalValue: "$12,500,000",
      availableTokens: "35,000",
      totalTokens: "50,000",
      roi: "12.3%",
      appreciation: "15.2%",
      fundingProgress: 30,
    },
    {
      image: propertyAustin,
      title: "Premium Office Complex",
      location: "Austin, Texas",
      type: "Commercial",
      yield: "7.8%",
      tokenPrice: "$180",
      totalValue: "$8,900,000",
      availableTokens: "28,000",
      totalTokens: "49,444",
      roi: "11.5%",
      appreciation: "12.8%",
      fundingProgress: 43,
    },
    {
      image: propertyMiami,
      title: "Beachfront Resort Development",
      location: "Miami Beach, Florida",
      type: "Hospitality",
      yield: "9.2%",
      tokenPrice: "$320",
      totalValue: "$18,750,000",
      availableTokens: "15,000",
      totalTokens: "58,594",
      roi: "14.7%",
      appreciation: "18.5%",
      fundingProgress: 74,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero />

      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mb-4 flex items-center justify-center gap-2">
            <Star className="h-5 w-5 fill-warning text-warning" />
            <span className="text-sm font-semibold uppercase tracking-wider text-warning">
              Featured Opportunities
            </span>
          </div>
          
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold lg:text-4xl">Premium Investment Properties</h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Handpicked properties with exceptional yield potential and strong market fundamentals. 
              Start building your real estate portfolio today.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {featuredProperties.map((property, index) => (
              <PropertyCard key={index} {...property} />
            ))}
          </div>

          <div className="mt-12 text-center">
            <Button asChild size="lg">
              <Link to="/marketplace" className="inline-flex items-center gap-2">
                View All Properties
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <CTA />
      <HowItWorks />
      <Testimonials />
      <Footer />
    </div>
  );
};

export default Index;
