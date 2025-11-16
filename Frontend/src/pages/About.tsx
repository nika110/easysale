import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Users, Globe, Shield, TrendingUp, Award } from "lucide-react";
import { Link } from "react-router-dom";

const About = () => {
  const stats = [
    { value: "$2.4B+", label: "Total Value Locked" },
    { value: "50K+", label: "Active Investors" },
    { value: "200+", label: "Properties Listed" },
    { value: "45+", label: "Countries Served" },
  ];

  const values = [
    {
      icon: Shield,
      title: "Security First",
      description: "Your investments are protected with institutional-grade security and blockchain technology."
    },
    {
      icon: Users,
      title: "Community Driven",
      description: "We believe in democratizing real estate investment for everyone, everywhere."
    },
    {
      icon: Globe,
      title: "Global Access",
      description: "Invest in premium properties worldwide without geographical limitations."
    },
    {
      icon: TrendingUp,
      title: "Growth Focused",
      description: "We carefully curate high-potential properties to maximize your returns."
    },
  ];

  const team = [
    {
      name: "Sarah Johnson",
      role: "CEO & Co-Founder",
      image: "https://images.unsplash.com/photo-1494790108755-2616b612b786",
      description: "15+ years in real estate investment and blockchain technology."
    },
    {
      name: "Michael Chen",
      role: "CTO & Co-Founder",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d",
      description: "Former tech lead at major fintech companies, blockchain expert."
    },
    {
      name: "Emily Rodriguez",
      role: "Head of Operations",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80",
      description: "10+ years managing real estate portfolios worth over $500M."
    },
    {
      name: "David Park",
      role: "Chief Legal Officer",
      image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e",
      description: "Expert in securities law and regulatory compliance."
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-muted/50 to-background py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="mb-6 text-5xl font-bold">About TokenEstate</h1>
            <p className="text-xl text-muted-foreground">
              We're revolutionizing real estate investment by making premium properties 
              accessible to everyone through blockchain tokenization.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-b py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="mb-2 text-4xl font-bold text-primary">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="mb-6 text-3xl font-bold">Our Mission</h2>
              <p className="mb-4 text-lg text-muted-foreground">
                TokenEstate was founded with a simple yet powerful vision: to democratize 
                real estate investment and make it accessible to everyone, regardless of 
                their location or capital.
              </p>
              <p className="mb-4 text-lg text-muted-foreground">
                Traditional real estate investment has always been reserved for the wealthy 
                and well-connected. We're changing that by leveraging blockchain technology 
                to fractionally tokenize premium properties.
              </p>
              <p className="text-lg text-muted-foreground">
                Our platform allows you to invest in high-quality real estate with as little 
                as $100, receive passive income through rental yields, and benefit from 
                property appreciation—all while maintaining complete transparency and security.
              </p>
            </div>
            <div className="flex items-center justify-center">
              <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-cyan/10 p-12">
                <Building2 className="h-48 w-48 text-primary" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold">Our Core Values</h2>
            <p className="text-lg text-muted-foreground">
              The principles that guide everything we do
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {values.map((value, index) => (
              <Card key={index} className="text-center">
                <CardContent className="p-6">
                  <div className="mb-4 flex justify-center">
                    <div className="rounded-full bg-primary/10 p-4">
                      <value.icon className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  <h3 className="mb-3 text-xl font-bold">{value.title}</h3>
                  <p className="text-sm text-muted-foreground">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-6 text-3xl font-bold">Ready to Start Investing?</h2>
            <p className="mb-8 text-lg text-muted-foreground">
              Join thousands of investors building wealth through real estate tokenization
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild size="lg">
                <Link to="/marketplace">
                  <Building2 className="mr-2 h-5 w-5" />
                  Explore Properties
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/login">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
