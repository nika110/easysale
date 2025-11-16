import { Card } from "@/components/ui/card";
import { Quote } from "lucide-react";

export const Testimonials = () => {
  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Software Engineer & Investor",
      image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop",
      quote: "TokenEstate has completely changed how I think about real estate investing. I started with just $500 and now have a diversified portfolio worth over $25,000. The monthly returns are consistent and the platform is incredibly transparent.",
      investment: "$25,400",
      yield: "8.7%",
    },
    {
      name: "Michael Rodriguez",
      role: "Marketing Director",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop",
      quote: "As someone who always wanted to invest in real estate but couldn't afford traditional properties, TokenEstate opened up possibilities I never thought possible. The platform is user-friendly and the returns speak for themselves.",
      investment: "$18,750",
      yield: "7.9%",
    },
    {
      name: "Emily Johnson",
      role: "Financial Analyst",
      image: "https://images.unsplash.com/photo-1556756484-913d5eea9cd6?w=400&h=400&fit=crop",
      quote: "The transparency and security of TokenEstate impressed me from day one. Being able to see real-time property performance and having full control over my investments gives me peace of mind.",
      investment: "$32,100",
      yield: "9.1%",
    },
  ];

  return (
    <section className="bg-muted/30 py-20">
      <div className="container mx-auto px-4">
        <div className="mb-4 text-center">
          <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-primary">
            Success Stories
          </div>
          <h2 className="mb-4 text-3xl font-bold lg:text-4xl">What Our Clients Say</h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Real stories from real investors who are building wealth through tokenized real estate.
          </p>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="group relative overflow-hidden border-border/50 p-6 transition-all duration-300 hover:border-primary/50 hover:shadow-xl">
              <div className="absolute right-6 top-6 text-primary/10">
                <Quote className="h-16 w-16" />
              </div>
              
              <div className="relative">
                <div className="mb-4 flex items-center gap-4">
                  <img 
                    src={testimonial.image} 
                    alt={testimonial.name}
                    className="h-16 w-16 rounded-full object-cover ring-2 ring-primary/20"
                  />
                  <div>
                    <div className="font-bold">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </div>

                <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
                  "{testimonial.quote}"
                </p>

                <div className="flex gap-4 border-t border-border/50 pt-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Investment</div>
                    <div className="font-bold text-foreground">{testimonial.investment}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Annual Return</div>
                    <div className="font-bold text-success">{testimonial.yield} Yield</div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
