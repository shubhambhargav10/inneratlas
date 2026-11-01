export interface GuideArticle {
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  readTime: string;
  date: string;
  excerpt: string;
}

export const articles: GuideArticle[] = [
  {
    slug: "understanding-personality-archetypes",
    title: "Understanding Personality Archetypes: Moving Beyond Simplistic 4-Letter Boxes",
    subtitle: "Why human personality behaves like a multi-dimensional spectrum rather than a rigid categorical pigeonhole.",
    category: "Personality Psychology",
    readTime: "6 min read",
    date: "November 2025",
    excerpt:
      "Most popular personality tests reduce human nuance to binary letters (Introvert vs Extrovert, Thinker vs Feeler). Modern psychometrics reveals that human behavior is far more contextual, fluid, and multi-layered...",
  },
  {
    slug: "decoding-career-dna",
    title: "Decoding Career DNA: Why Standard Job Descriptions Fail High Performers",
    subtitle: "How alignment between your collaboration style, risk tolerance, and craftsmanship dictates career fulfillment.",
    category: "Career Architecture",
    readTime: "7 min read",
    date: "October 2025",
    excerpt:
      "Most professionals experience burnout not because the work is too difficult, but because their environmental wiring conflicts with their organization's operational rhythm...",
  },
  {
    slug: "the-six-thinking-styles",
    title: "The 6 Thinking Styles: How Multi-Loop Decision Makers Navigate Ambiguity",
    subtitle: "Exploring analytical, creative, systems, intuitive, reflective, and practical cognitive modalities.",
    category: "Cognitive Science",
    readTime: "8 min read",
    date: "October 2025",
    excerpt:
      "When faced with complex, non-linear dilemmas, how does your mind actually deliberate? Explore the six fundamental thinking modalities and how to avoid cognitive friction with opposing styles...",
  },
];
