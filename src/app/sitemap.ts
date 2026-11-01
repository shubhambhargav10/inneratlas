import { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { allAssessments } from "@/data/assessments";
import { articles } from "@/data/articles";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = siteConfig.url;

  const staticRoutes = [
    "",
    "/assessments",
    "/guides",
    "/about",
    "/contact",
    "/faq",
    "/privacy",
    "/terms",
    "/refunds",
    "/dashboard",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1.0 : 0.8,
  }));

  const assessmentRoutes = allAssessments.map((a) => ({
    url: `${baseUrl}/assessments/${a.slug}`,
    lastModified: new Date().toISOString(),
    changeFrequency: "monthly" as const,
    priority: 0.9,
  }));

  const guideRoutes = articles.map((art) => ({
    url: `${baseUrl}/guides/${art.slug}`,
    lastModified: new Date().toISOString(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...assessmentRoutes, ...guideRoutes];
}
