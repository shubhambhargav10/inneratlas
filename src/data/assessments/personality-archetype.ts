import { AssessmentDefinition } from "./types";
import { createLikertOptions } from "./helpers";

export const personalityArchetypeAssessment: AssessmentDefinition = {
  id: "asm_personality_archetype",
  slug: "personality-archetype",
  title: "Personality Archetype Assessment",
  subtitle: "Uncover your core behavioral pattern, subconscious strengths, and interpersonal friction points.",
  category: "Personality",
  estimatedMinutes: 12,
  priceInr: 199,
  compareAtInr: 499,
  badgeLabel: "Most Popular",
  heroHeadline: "Decode the Invisible Operating System Behind Your Actions & Choices",
  heroSubheadline:
    "A nuanced, multi-dimensional psychometric model identifying your Primary and Secondary Archetypes among 8 distinct human archetypes. No simplistic four-letter boxes.",
  whatYouWillDiscover: [
    "Your Primary and Secondary Archetype Blend (e.g. The Strategic Creator or The Visionary Connector)",
    "Four core dimensional scores measuring internal reflection, conceptual intuition, structural execution, and decision tempo",
    "Hidden cognitive blind spots and stress triggers that unknowingly derail your relationships",
    "Personalized 90-day action roadmap tailored to unlock your natural leadership and creative strengths",
  ],
  dimensions: [
    {
      key: "reflection_vs_expression",
      name: "Energy Processing",
      description: "How you recharge, synthesize thoughts, and distribute cognitive bandwidth.",
      lowLabel: "Internal Reflection (Solitary Synthesis)",
      highLabel: "External Expression (Social Resonance)",
    },
    {
      key: "empirical_vs_intuitive",
      name: "Information Perception",
      description: "How you absorb data, evaluate reality, and perceive patterns.",
      lowLabel: "Empirical Realism (Facts & Tangibles)",
      highLabel: "Intuitive Synthesis (Possibilities & Trends)",
    },
    {
      key: "structured_vs_fluid",
      name: "Operational Architecture",
      description: "Your relationship with timelines, routines, predictability, and spontaneous emergence.",
      lowLabel: "Methodical Structure (Clarity & Order)",
      highLabel: "Fluid Adaptability (Emergence & Flow)",
    },
    {
      key: "decisive_vs_deliberate",
      name: "Action Orientation",
      description: "The speed and risk-tolerance you bring to decision-making under uncertainty.",
      lowLabel: "Deep Deliberation (Calculated Prudence)",
      highLabel: "Decisive Velocity (Bias for Action)",
    },
  ],
  archetypes: [
    {
      key: "the_strategist",
      title: "The Strategist",
      subtitle: "The Architect of Order & Long-Range Foresight",
      tagline: "Anticipating the future three moves ahead through structured analysis.",
      shortDescription:
        "You possess a methodical mind that sees patterns where others see chaos. You design sustainable systems, prioritize long-term leverage over immediate gratification, and excel at translating high-level vision into clear operating steps.",
      fullDescription:
        "The Strategist moves through the world like a chess grandmaster. You are rarely caught unprepared because your mind constantly runs scenario simulations. You value intellectual precision, structural durability, and emotional calm. In team settings, you bring needed gravity and composure, preventing impulsive decisions. While others celebrate immediate wins, you are already architecting the infrastructure for the year ahead.",
      superpowers: [
        "Uncanny ability to deconstruct complex dilemmas into actionable sequences",
        "Remarkable emotional composure during high-stakes uncertainty",
        "Natural foresight that identifies hidden risks before they materialize",
        "Deep respect for sustainable architecture over temporary hacks",
      ],
      blindspots: [
        "Can become paralyzed by analysis when quick empirical action is needed",
        "May dismiss intuitive or emotional perspectives as irrational",
        "Tendency to appear emotionally distant or overly detached in intimate conversations",
        "Frustration with colleagues who do not plan methodically",
      ],
      communicationStyle:
        "Clear, structured, and economy-driven. Prefers well-organized arguments, bullet points, and data-backed rationale rather than emotional rhetoric.",
      collaborationStyle:
        "Excels as the strategic anchor or project architect. Works best when granted autonomy to map the trajectory before execution begins.",
      idealEnvironment:
        "Quiet, high-trust environments that value thoughtful deliberation, clear ownership, and measurable benchmarks over frantic reactive urgency.",
      growthLever:
        "Embrace 'good enough' speed. Learn to make directional decisions with 70% information rather than waiting for 95% certainty.",
      dimensionPreferences: {
        reflection_vs_expression: "low",
        empirical_vs_intuitive: "neutral",
        structured_vs_fluid: "low",
        decisive_vs_deliberate: "low",
      },
    },
    {
      key: "the_creator",
      title: "The Creator",
      subtitle: "The Alchemist of Novelty & Aesthetic Synthesis",
      tagline: "Bridging disparate concepts to bring original beauty and ideas into the world.",
      shortDescription:
        "You are driven by an innate compulsion to forge original ideas, question established paradigms, and transform intangible feelings into evocative artifacts, products, or concepts.",
      fullDescription:
        "The Creator experiences reality as a boundless canvas of unrealized possibilities. You see cross-disciplinary metaphors where conventional thinkers see rigid borders. Routine and dogma drain your energy; creative freedom and conceptual experimentation electrify you. You are willing to explore uncharted paths, embrace messy creative drafts, and tolerate ambiguity in pursuit of authentic brilliance.",
      superpowers: [
        "Exceptional divergent thinking and unconventional problem solving",
        "Deep aesthetic intuition and sensitivity to emotional resonance",
        "Ability to synthesize contrasting ideas into novel breakthroughs",
        "Fearless willingness to challenge orthodoxy and established dogma",
      ],
      blindspots: [
        "Struggles with disciplined finishing once the exciting initial ideation is over",
        "Can take constructive critique of work as a personal assault on identity",
        "Prone to creative burnout from intense cycles of hyper-focus and exhaustion",
        "Impatience with mundane administrative operational duties",
      ],
      communicationStyle:
        "Expressive, metaphorical, and inspiring. Uses visual language, analogies, and heartfelt passion to communicate concepts.",
      collaborationStyle:
        "Thrives as the creative generator. Partners best with structured operators who can build guardrails around their ideational bursts.",
      idealEnvironment:
        "Dynamic, psychologically safe studios or flexible environments with minimal bureaucracy and freedom to experiment without early judgment.",
      growthLever:
        "Build finishing stamina. Treat the discipline of shipping and editing as an essential artistic craft rather than administrative drudgery.",
      dimensionPreferences: {
        reflection_vs_expression: "neutral",
        empirical_vs_intuitive: "high",
        structured_vs_fluid: "high",
        decisive_vs_deliberate: "neutral",
      },
    },
    {
      key: "the_explorer",
      title: "The Explorer",
      subtitle: "The Pioneer of Autonomy & Adaptive Action",
      tagline: "Forging new frontiers through curiosity, courage, and real-time experimentation.",
      shortDescription:
        "You are fueled by raw curiosity, tactile learning, and freedom of motion. You learn by doing, pivot effortlessly when circumstances shift, and thrive at the frontier of new terrain.",
      fullDescription:
        "The Explorer cannot remain stagnant. You feel most alive when immersed in unfamiliar territory, discovering solutions on the fly through sensory intuition and rapid trial-and-error. You possess an infectious courage that emboldens others to take calculated risks. Rigid rules, micromanagement, and endless committee meetings suffocate your natural brilliance; you thrive when given a compass and permission to blaze the trail.",
      superpowers: [
        "High adaptability in shifting, unpredictable conditions",
        "Relentless curiosity and fearlessness toward the unfamiliar",
        "Rapid learning curve driven by hands-on experimentation",
        "Natural resilience when initial attempts fail",
      ],
      blindspots: [
        "Can abandon solid long-term projects prematurely for the thrill of the new",
        "Resistance to necessary policies, documentation, and structural compliance",
        "May underestimate the compound value of deep, repetitive mastery",
        "Restlessness that creates friction with steadier, routine-oriented peers",
      ],
      communicationStyle:
        "Direct, informal, energetic, and candid. Gets straight to the point and prefers demonstrating results over reading theoretical manuals.",
      collaborationStyle:
        "Exceptional scout or sprint leader. Best deployed to break into new markets, test prototypes, or troubleshoot unforeseen crises.",
      idealEnvironment:
        "Decentralized, fast-paced teams with high autonomy, tangible challenges, and frequent opportunities for novel discovery.",
      growthLever:
        "Cultivate the power of commitment. Recognize that sustained compounding in one direction often unlocks far greater adventure than constant pivoting.",
      dimensionPreferences: {
        reflection_vs_expression: "high",
        empirical_vs_intuitive: "neutral",
        structured_vs_fluid: "high",
        decisive_vs_deliberate: "high",
      },
    },
    {
      key: "the_guardian",
      title: "The Guardian",
      subtitle: "The Bedrock of Reliability & Operational Integrity",
      tagline: "Preserving trust, protecting standards, and ensuring nothing slips through the cracks.",
      shortDescription:
        "You are the anchor that keeps systems from collapsing. You hold yourself and others to high ethical and operational standards, protect what matters, and build enduring trust through quiet diligence.",
      fullDescription:
        "The Guardian is the indispensable pillar of any enduring organization or community. Where others make careless promises, you deliver with steadfast consistency. You notice the subtle vulnerabilities, operational gaps, and safety hazards that visionaries overlook. Your loyalty is profound, your word is sacred, and your commitment to duty creates the stable bedrock upon which everyone else builds.",
      superpowers: [
        "Unmatched reliability, thoroughness, and attention to detail",
        "Deep personal loyalty and dedication to collective welfare",
        "Rigorous risk mitigation and preservation of hard-earned standards",
        "Exceptional memory for past lessons and historical precedents",
      ],
      blindspots: [
        "Can become overly defensive or skeptical when sudden innovation is introduced",
        "Carries disproportionate burden by refusing to delegate or ask for help",
        "May sacrifice personal well-being to uphold external obligations",
        "Difficulty letting go of outdated traditions that no longer serve the mission",
      ],
      communicationStyle:
        "Respectful, thoughtful, measured, and dependable. Avoids hyperbole and ensures clarity regarding expectations and responsibilities.",
      collaborationStyle:
        "The trusted backbone of execution. Excels in quality assurance, governance, critical operations, and upholding community cohesion.",
      idealEnvironment:
        "Organized, transparent, and ethical environments that honor dedication, foster mutual respect, and uphold clear standards.",
      growthLever:
        "Practice healthy boundary-setting. Allow room for imperfect experimentation and understand that responsible disruption is often the greatest form of preservation.",
      dimensionPreferences: {
        reflection_vs_expression: "low",
        empirical_vs_intuitive: "low",
        structured_vs_fluid: "low",
        decisive_vs_deliberate: "low",
      },
    },
    {
      key: "the_connector",
      title: "The Connector",
      subtitle: "The Master of Empathy & Psychological Safety",
      tagline: "Weaving human bonds, unlocking team harmony, and illuminating shared purpose.",
      shortDescription:
        "You understand people at an intuitive, emotional frequency. You naturally bridge divisions, foster genuine belonging, and bring out the collaborative genius in groups.",
      fullDescription:
        "The Connector perceives organizations and relationships as living, breathing ecosystems. You notice unsaid tensions, subtle body language, and unspoken needs before anyone vocalizes them. You believe that human alignment and trust are the ultimate catalysts of success. People gravitate to your presence because you make them feel truly seen, valued, and understood.",
      superpowers: [
        "High emotional intelligence and intuitive interpersonal awareness",
        "Exceptional diplomacy and conflict mediation capabilities",
        "Innate ability to build trust, morale, and psychological safety",
        "Gift for bringing together complementary talents and perspectives",
      ],
      blindspots: [
        "Difficulty delivering tough critical feedback due to fear of hurting feelings",
        "Prone to emotional fatigue from absorbing others' anxieties and conflicts",
        "Can prioritize superficial harmony over necessary, productive confrontation",
        "Risk of neglecting personal career ambitions while elevating others",
      ],
      communicationStyle:
        "Warm, active, empathetic, and attentive. Asks perceptive questions and validates emotional perspectives before solving logistical problems.",
      collaborationStyle:
        "The social glue and cultural heart of the group. Excels in community leadership, people operations, partnership negotiation, and team alignment.",
      idealEnvironment:
        "Collaborative, mission-driven teams with open dialogue, authentic relationships, and shared cultural values.",
      growthLever:
        "Embrace constructive conflict. Recognize that genuine, honest friction in service of truth is far healthier than artificial peace.",
      dimensionPreferences: {
        reflection_vs_expression: "high",
        empirical_vs_intuitive: "high",
        structured_vs_fluid: "neutral",
        decisive_vs_deliberate: "neutral",
      },
    },
    {
      key: "the_achiever",
      title: "The Achiever",
      subtitle: "The Catalyst of Momentum & Measurable Impact",
      tagline: "Transforming ambition into tangible, high-velocity outcomes through relentless focus.",
      shortDescription:
        "You possess an unstoppable engine of forward momentum. You set ambitious targets, clear obstacles with decisive grit, and hold yourself to relentless standards of excellence.",
      fullDescription:
        "The Achiever thrives on results. Ambiguity and endless theoretical discussions frustrate you; you want clear objectives, scorecards, and milestones. You view obstacles not as dead ends, but as puzzles to overcome with grit and discipline. Your energy is contagious, pushing complacent teams into high-performance mode and turning visionary concepts into finished reality.",
      superpowers: [
        "Extraordinary execution speed and tenacity under pressure",
        "Laser-focused goal orientation and prioritization of high-leverage tasks",
        "Capacity to inspire urgency and competitive excellence in teams",
        "Pragmatic problem-solving focused entirely on tangible outcomes",
      ],
      blindspots: [
        "Impatience with slower deliberate processes or reflective contemplation",
        "Vulnerability to burnout from equating self-worth solely with productivity",
        "Can inadvertently steamroll quieter team members in the rush to hit goals",
        "Reluctance to pause and celebrate achievements before chasing the next target",
      ],
      communicationStyle:
        "Direct, concise, motivating, and action-oriented. Focuses on objectives, deadlines, deliverables, and bottom-line impact.",
      collaborationStyle:
        "High-performance driver. Excels when leading revenue initiatives, launch sprints, turnaround efforts, and competitive pursuits.",
      idealEnvironment:
        "Meritocratic, results-oriented environments with transparent metrics, high agency, and tangible rewards for excellence.",
      growthLever:
        "Learn to value the journey as much as the summit. Build deliberate rituals of pause, gratitude, and sustainable pacing.",
      dimensionPreferences: {
        reflection_vs_expression: "high",
        empirical_vs_intuitive: "low",
        structured_vs_fluid: "low",
        decisive_vs_deliberate: "high",
      },
    },
    {
      key: "the_analyst",
      title: "The Analyst",
      subtitle: "The Seeker of Empirical Truth & First Principles",
      tagline: "Stripping away emotional biases to uncover objective reality and causal mechanisms.",
      shortDescription:
        "You are driven by an unquenchable quest for intellectual accuracy and objective clarity. You deconstruct claims, verify evidence, and base decisions on rigorous first principles.",
      fullDescription:
        "The Analyst does not accept assumptions at face value. While others are swayed by charismatic narratives or emotional appeals, you demand the underlying data, the causal mechanics, and the sample size. You possess a sharp, disciplined intellect capable of untangling complex mathematical, technical, or systemic knots. Your honesty is refreshing, and your analytical rigor protects projects from costly delusions.",
      superpowers: [
        "Uncompromising intellectual integrity and logical deconstruction",
        "Mastery of quantitative, scientific, and structural modeling",
        "Immunity to hype, social contagion, and superficial marketing claims",
        "Deep diagnostic capability for finding root causes rather than symptoms",
      ],
      blindspots: [
        "Can come across as hyper-critical, skeptical, or emotionally cold",
        "Dismisses non-quantifiable emotional factors that nonetheless drive human decisions",
        "Analysis paralysis when attempting to model fundamentally unpredictable human systems",
        "Difficulty communicating complex findings to non-technical audiences",
      ],
      communicationStyle:
        "Precise, objective, factual, and analytical. Uses clear definitions, nuances, probabilities, and supporting data.",
      collaborationStyle:
        "The technical conscience and diagnostic brain. Excels in auditing, architecture, research, quantitative modeling, and risk evaluation.",
      idealEnvironment:
        "Meritocratic, fact-based teams where ideas are evaluated on evidence rather than hierarchy or charisma.",
      growthLever:
        "Integrate psychological and human realities into your logic. People are not algorithms; empathy is an essential dimension of total truth.",
      dimensionPreferences: {
        reflection_vs_expression: "low",
        empirical_vs_intuitive: "low",
        structured_vs_fluid: "neutral",
        decisive_vs_deliberate: "low",
      },
    },
    {
      key: "the_visionary",
      title: "The Visionary",
      subtitle: "The Architect of Transformative Futures",
      tagline: "Connecting macro trends to articulate an inspiring and inevitable future state.",
      shortDescription:
        "You live at the intersection of macro trends, societal shifts, and moral purpose. You inspire people to believe in a higher future and rally around transformative missions.",
      fullDescription:
        "The Visionary operates with an expanded horizon. Where others see incremental tweaks, you see the sweeping narrative of where industry and humanity are headed. You possess an innate gift for storytelling, reframing conventional challenges into historic opportunities. You attract talented creators and strategists because your clarity of purpose gives meaning to their execution.",
      superpowers: [
        "Exceptional macro pattern recognition and intuitive forecasting",
        "Charismatic storytelling that inspires deep commitment and motivation",
        "Ability to reframe crises into transformative breakthroughs",
        "Unshakable conviction in the face of widespread skepticism",
      ],
      blindspots: [
        "Disconnect from day-to-day operational details and execution friction",
        "Tendency to underestimate implementation costs, timelines, and logistical hurdles",
        "Can become frustrated when others fail to immediately grasp their mental leap",
        "Risk of pursuing impractical ideals at the expense of present solvency",
      ],
      communicationStyle:
        "Inspirational, evocative, forward-looking, and bold. Paints vivid mental pictures of what tomorrow could look like.",
      collaborationStyle:
        "The transformational leader. Must pair closely with a grounded Chief of Staff or Strategist to bridge vision to execution.",
      idealEnvironment:
        "Visionary, high-growth, or mission-driven organizations focused on disruptive innovation, bold narratives, and large-scale transformation.",
      growthLever:
        "Anchor your dreams in present operational discipline. Respect the meticulous labor required to build the foundation under your castles in the sky.",
      dimensionPreferences: {
        reflection_vs_expression: "high",
        empirical_vs_intuitive: "high",
        structured_vs_fluid: "neutral",
        decisive_vs_deliberate: "high",
      },
    },
  ],
  questions: [
    // --- DIMENSION 1: reflection_vs_expression (7 questions) ---
    {
      id: "pa_q1",
      order: 1,
      text: "After a demanding week, I recharge best through solitary contemplation or quiet focus rather than bustling social gatherings.",
      contextHint: "Think about what genuinely restores your mental clarity.",
      categoryTag: "Energy Processing",
      type: "likert_5",
      options: createLikertOptions("reflection_vs_expression", true), // Agreement -> Internal reflection (low)
    },
    {
      id: "pa_q2",
      order: 2,
      text: "I tend to process and formulate my best thoughts by speaking them aloud with others rather than writing them down alone.",
      contextHint: "Reflect on how your ideas mature most rapidly.",
      categoryTag: "Energy Processing",
      type: "likert_5",
      options: createLikertOptions("reflection_vs_expression", false), // Agreement -> External expression (high)
    },
    {
      id: "pa_q3",
      order: 3,
      text: "In group discussions, I naturally observe and listen deeply before volunteering my perspective.",
      contextHint: "Your default instinct in a meeting or dinner conversation.",
      categoryTag: "Energy Processing",
      type: "likert_5",
      options: createLikertOptions("reflection_vs_expression", true),
    },
    {
      id: "pa_q4",
      order: 4,
      text: "Being surrounded by energetic, ambitious groups leaves me feeling invigorated rather than mentally depleted.",
      contextHint: "Consider your physical and cognitive state after hours in a crowd.",
      categoryTag: "Energy Processing",
      type: "likert_5",
      options: createLikertOptions("reflection_vs_expression", false),
    },
    {
      id: "pa_q5",
      order: 5,
      text: "I prefer working in quiet, uninterrupted deep-work blocks over spontaneous, open-plan collaborative environments.",
      contextHint: "Your ideal daily working sanctuary.",
      categoryTag: "Energy Processing",
      type: "likert_5",
      options: createLikertOptions("reflection_vs_expression", true),
    },
    {
      id: "pa_q6",
      order: 6,
      text: "I frequently introduce myself to new people and initiate conversations with ease.",
      contextHint: "How comfortable you feel breaking the ice.",
      categoryTag: "Energy Processing",
      type: "likert_5",
      options: createLikertOptions("reflection_vs_expression", false),
    },
    {
      id: "pa_q7",
      order: 7,
      text: "When facing personal stress, my first instinct is to withdraw into my private world to make sense of things.",
      contextHint: "Your emotional coping default.",
      categoryTag: "Energy Processing",
      type: "likert_5",
      options: createLikertOptions("reflection_vs_expression", true),
    },

    // --- DIMENSION 2: empirical_vs_intuitive (7 questions) ---
    {
      id: "pa_q8",
      order: 8,
      text: "I am far more intrigued by speculative future possibilities and macro trends than by current factual details.",
      contextHint: "What naturally captures your attention when reading or thinking.",
      categoryTag: "Information Perception",
      type: "likert_5",
      options: createLikertOptions("empirical_vs_intuitive", false), // Agreement -> Intuitive (high)
    },
    {
      id: "pa_q9",
      order: 9,
      text: "I distrust grand theories that cannot be substantiated by concrete, tangible evidence and practical precedents.",
      contextHint: "Your filter for truth and credibility.",
      categoryTag: "Information Perception",
      type: "likert_5",
      options: createLikertOptions("empirical_vs_intuitive", true), // Agreement -> Empirical (low)
    },
    {
      id: "pa_q10",
      order: 10,
      text: "I often experience flashes of insight or 'gut hunches' about situations before I can logically explain why.",
      contextHint: "How often you rely on intuitive pattern recognition.",
      categoryTag: "Information Perception",
      type: "likert_5",
      options: createLikertOptions("empirical_vs_intuitive", false),
    },
    {
      id: "pa_q11",
      order: 11,
      text: "I prefer working with exact numbers, precise specifications, and verifiable reality over metaphorical concepts.",
      contextHint: "Your preferred cognitive currency.",
      categoryTag: "Information Perception",
      type: "likert_5",
      options: createLikertOptions("empirical_vs_intuitive", true),
    },
    {
      id: "pa_q12",
      order: 12,
      text: "I frequently see connections between entirely unrelated fields, such as biology, architecture, and human psychology.",
      contextHint: "Cross-disciplinary synthesis instinct.",
      categoryTag: "Information Perception",
      type: "likert_5",
      options: createLikertOptions("empirical_vs_intuitive", false),
    },
    {
      id: "pa_q13",
      order: 13,
      text: "When learning something new, I focus on mastering the proven, established method before trying to invent my own.",
      contextHint: "Your respect for proven mechanics vs reinvention.",
      categoryTag: "Information Perception",
      type: "likert_5",
      options: createLikertOptions("empirical_vs_intuitive", true),
    },
    {
      id: "pa_q14",
      order: 14,
      text: "I am energized by reading between the lines and uncovering underlying subtexts rather than taking statements literally.",
      contextHint: "Interpreting human behavior and literature.",
      categoryTag: "Information Perception",
      type: "likert_5",
      options: createLikertOptions("empirical_vs_intuitive", false),
    },

    // --- DIMENSION 3: structured_vs_fluid (7 questions) ---
    {
      id: "pa_q15",
      order: 15,
      text: "I maintain detailed calendars, checklists, and structured plans to organize my days and projects.",
      contextHint: "How you organize your life and deliverables.",
      categoryTag: "Operational Architecture",
      type: "likert_5",
      options: createLikertOptions("structured_vs_fluid", true), // Agreement -> Structured (low)
    },
    {
      id: "pa_q16",
      order: 16,
      text: "Rigid daily routines make me feel trapped; I perform best when free to ride waves of spontaneous inspiration.",
      contextHint: "Your creative and productive rhythm.",
      categoryTag: "Operational Architecture",
      type: "likert_5",
      options: createLikertOptions("structured_vs_fluid", false), // Agreement -> Fluid (high)
    },
    {
      id: "pa_q17",
      order: 17,
      text: "Unexpected changes to my planned schedule create noticeable internal irritation.",
      contextHint: "Your emotional reaction to disruption.",
      categoryTag: "Operational Architecture",
      type: "likert_5",
      options: createLikertOptions("structured_vs_fluid", true),
    },
    {
      id: "pa_q18",
      order: 18,
      text: "I am comfortable leaving options open until the very last minute to capitalize on emerging opportunities.",
      contextHint: "Your tolerance for ambiguity and optionality.",
      categoryTag: "Operational Architecture",
      type: "likert_5",
      options: createLikertOptions("structured_vs_fluid", false),
    },
    {
      id: "pa_q19",
      order: 19,
      text: "I take satisfaction in closing loops, finishing tasks well ahead of deadlines, and keeping a zero inbox.",
      contextHint: "Need for closure vs open-ended exploration.",
      categoryTag: "Operational Architecture",
      type: "likert_5",
      options: createLikertOptions("structured_vs_fluid", true),
    },
    {
      id: "pa_q20",
      order: 20,
      text: "My workspace or desktop often looks chaotic to others, but I maintain an intuitive internal map of where everything is.",
      contextHint: "Physical and digital organization habits.",
      categoryTag: "Operational Architecture",
      type: "likert_5",
      options: createLikertOptions("structured_vs_fluid", false),
    },
    {
      id: "pa_q21",
      order: 21,
      text: "Before embarking on a trip or major initiative, I prefer having accommodation, routes, and milestones confirmed in advance.",
      contextHint: "Preparation vs wandering spirit.",
      categoryTag: "Operational Architecture",
      type: "likert_5",
      options: createLikertOptions("structured_vs_fluid", true),
    },

    // --- DIMENSION 4: decisive_vs_deliberate (7 questions) ---
    {
      id: "pa_q22",
      order: 22,
      text: "I would rather make a prompt decision and course-correct later than deliberate endlessly trying to find perfection.",
      contextHint: "Bias for action vs risk aversion.",
      categoryTag: "Action Orientation",
      type: "likert_5",
      options: createLikertOptions("decisive_vs_deliberate", false), // Agreement -> Decisive (high)
    },
    {
      id: "pa_q23",
      order: 23,
      text: "I rarely commit to a major stance until I have gathered exhaustive feedback and contemplated every downside.",
      contextHint: "Patience and rigor in decision governance.",
      categoryTag: "Action Orientation",
      type: "likert_5",
      options: createLikertOptions("decisive_vs_deliberate", true), // Agreement -> Deliberate (low)
    },
    {
      id: "pa_q24",
      order: 24,
      text: "When a team is stuck in circular debates, I step in with a decisive call to break the deadlock and move forward.",
      contextHint: "Leadership and momentum instincts.",
      categoryTag: "Action Orientation",
      type: "likert_5",
      options: createLikertOptions("decisive_vs_deliberate", false),
    },
    {
      id: "pa_q25",
      order: 25,
      text: "I am deeply cautious of moving too fast and breaking things; unforced errors are far worse than moving slowly.",
      contextHint: "Your philosophy on speed vs precision.",
      categoryTag: "Action Orientation",
      type: "likert_5",
      options: createLikertOptions("decisive_vs_deliberate", true),
    },
    {
      id: "pa_q26",
      order: 26,
      text: "I enjoy competition, challenging stretch goals, and the adrenaline of high-stakes delivery.",
      contextHint: "Relationship with ambition and competitive drive.",
      categoryTag: "Action Orientation",
      type: "likert_5",
      options: createLikertOptions("decisive_vs_deliberate", false),
    },
    {
      id: "pa_q27",
      order: 27,
      text: "I frequently ask 'What are the second and third-order consequences?' before agreeing to an ambitious initiative.",
      contextHint: "Long-term consequence thinking.",
      categoryTag: "Action Orientation",
      type: "likert_5",
      options: createLikertOptions("decisive_vs_deliberate", true),
    },
    {
      id: "pa_q28",
      order: 28,
      text: "I trust my ability to navigate crises in real time without pre-scripted contingency manuals.",
      contextHint: "Confidence in spontaneous resilience.",
      categoryTag: "Action Orientation",
      type: "likert_5",
      options: createLikertOptions("decisive_vs_deliberate", false),
    },
  ],
};
