import { Shield, Lock, FileCheck, Building } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Security = () => {
  const features = [
    {
      icon: Shield,
      title: "SEC Compliance",
      description: "Fully registered and compliant with Securities and Exchange Commission regulations for investor protection.",
    },
    {
      icon: Lock,
      title: "Bank-Level Security",
      description: "256-bit SSL encryption and multi-factor authentication protect your investments and personal data.",
    },
    {
      icon: Building,
      title: "FDIC Insurance",
      description: "Your cash deposits are insured up to $250,000 by the Federal Deposit Insurance Corporation.",
    },
    {
      icon: FileCheck,
      title: "Third-Party Audits",
      description: "Regular security audits and compliance reviews by independent cybersecurity firms.",
    },
  ];

  const securityDetails = [
    {
      title: "256-bit SSL Encryption",
      description: "All data transmission is protected with military-grade encryption protocols.",
    },
    {
      title: "Secure Data Storage",
      description: "Your personal and financial data is stored in SOC 2 compliant data centers.",
    },
    {
      title: "Identity Verification",
      description: "Multi-factor authentication and KYC compliance for all user accounts.",
    },
    {
      title: "Regulatory Compliance",
      description: "Full SEC compliance and regular third-party security audits.",
    },
  ];

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="mb-4 text-center">
          <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-primary">
            Security & Trust
          </div>
          <h2 className="mb-4 text-3xl font-bold lg:text-4xl">Your Investment is Protected</h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            We employ bank-level security measures and regulatory compliance to ensure your investments 
            and personal information are always protected.
          </p>
        </div>

        <div className="mb-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <Card key={index} className="border-border/50 p-6 transition-all duration-300 hover:border-primary/50 hover:shadow-lg">
              <div className="mb-4 inline-flex rounded-full bg-primary/10 p-3">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 font-bold">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </Card>
          ))}
        </div>

        <div className="rounded-3xl border border-border/50 bg-gradient-to-br from-card to-card/50 p-8 lg:p-12">
          <h3 className="mb-8 text-2xl font-bold">Enterprise-Grade Security</h3>
          
          <div className="mb-8 grid gap-6 md:grid-cols-2">
            {securityDetails.map((detail, index) => (
              <div key={index} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="mb-1 font-semibold">{detail.title}</h4>
                  <p className="text-sm text-muted-foreground">{detail.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
            <div className="mb-4 text-lg font-bold">$50M Insurance Coverage</div>
            <p className="mb-4 text-sm text-muted-foreground">
              Your investments are protected by comprehensive insurance coverage through leading providers.
            </p>
            <div className="flex flex-wrap gap-4">
              <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
                FDIC Insured - Up to $250,000
              </Badge>
              <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
                SIPC Protected - Up to $500,000
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
