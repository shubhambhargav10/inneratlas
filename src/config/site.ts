export interface SiteConfig {
  name: string;
  tagline: string;
  description: string;
  url: string;
  ogImage: string;
  links: {
    twitter?: string;
    github?: string;
  };
  pricing: {
    defaultInr: number;
    compareAtInr: number;
    currency: string;
    currencySymbol: string;
  };
  supportEmail: string;
}

export const siteConfig: SiteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME || "INNERATLAS",
  tagline: process.env.NEXT_PUBLIC_SITE_TAGLINE || "Understand yourself beyond the obvious.",
  description:
    "Scientific frameworks and modern psychology synthesized into actionable self-discovery. Take our comprehensive assessments and unlock deep, personalized PDF dossiers.",
  url: process.env.NEXT_PUBLIC_APP_URL || "https://inneratlas.com",
  ogImage: "https://inneratlas.com/og.jpg",
  links: {
    twitter: "https://twitter.com/inneratlas",
  },
  pricing: {
    defaultInr: 199,
    compareAtInr: 499,
    currency: "INR",
    currencySymbol: "₹",
  },
  supportEmail: "support@inneratlas.com",
};

export const navigationItems = [
  { label: "Assessments", href: "/assessments" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Sample Report", href: "/#sample-report" },
  { label: "Articles", href: "/guides" },
  { label: "My Reports", href: "/dashboard" },
];
