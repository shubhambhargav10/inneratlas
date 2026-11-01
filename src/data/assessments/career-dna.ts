import { AssessmentDefinition } from "./types";
import { createLikertOptions } from "./helpers";

export const careerDnaAssessment: AssessmentDefinition = {
  id: "asm_career_dna",
  slug: "career-dna",
  title: "Career DNA Assessment",
  subtitle: "Decode your workplace drivers, optimal operating environment, and leadership footprint.",
  category: "Career",
  estimatedMinutes: 10,
  priceInr: 199,
  compareAtInr: 499,
  badgeLabel: "High Career Impact",
  heroHeadline: "Find the Work Environment Where Your Natural Wiring Becomes an Unfair Advantage",
  heroSubheadline:
    "Evaluate 5 critical workplace dimensions to discover your primary Career Archetype, environment fit index, and collaboration blueprint. Stop forcing yourself into roles that drain your soul.",
  whatYouWillDiscover: [
    "Your Dominant Career Orientation (Autonomous Specialist, Strategic Catalyst, Enterprise Architect, or Agile Operator)",
    "Environment Compatibility Scores across early-stage startups, hyper-growth scaleups, boutique consultancies, and established enterprises",
    "Your natural risk-reward appetite and ownership motivation",
    "Personalized guidelines for negotiating autonomy, team roles, and promotion pathways",
  ],
  dimensions: [
    {
      key: "solo_vs_synergy",
      name: "Collaboration Model",
      description: "How much social interaction and interdependence fuels versus drains your output.",
      lowLabel: "Independent Autonomy (Deep Solo Craft)",
      highLabel: "Interdependent Synergy (High-Frequency Team Collaboration)",
    },
    {
      key: "structure_vs_flexibility",
      name: "Operational Predictability",
      description: "Your preference between well-defined corporate processes versus fluid, emerging mandates.",
      lowLabel: "Systemic Governance (Defined Playbooks & Stability)",
      highLabel: "Fluid Autonomy (Evolving Roles & High Ambiguity)",
    },
    {
      key: "analytical_vs_creative",
      name: "Problem-Solving Currency",
      description: "Whether your value comes from rigorous quantitative deconstruction or novel ideational synthesis.",
      lowLabel: "Quantitative Rigor (Data, Metrics & Precision)",
      highLabel: "Creative Synthesis (Design, Narrative & Conceptual Vision)",
    },
    {
      key: "risk_tolerance",
      name: "Venture Appetite",
      description: "How you balance psychological stability and predictable income against volatile, uncapped upside.",
      lowLabel: "Risk Mitigation (Predictable Security & Longevity)",
      highLabel: "Calculated Audacity (High-Stakes Upside & Venture Risk)",
    },
    {
      key: "leadership_vs_craft",
      name: "Impact Vector",
      description: "Whether your professional fulfillment stems from personal artisanal mastery or multiplying people through organizational leadership.",
      lowLabel: "Individual Craft Mastery (Depth of Subject-Matter Expertise)",
      highLabel: "Organizational Leverage (People Leadership & Influence)",
    },
  ],
  archetypes: [
    {
      key: "autonomous_specialist",
      title: "The Autonomous Specialist",
      subtitle: "The Master Craftsman & Domain Authority",
      tagline: "Excelling through deep technical or creative mastery with minimal micromanagement.",
      shortDescription:
        "You thrive when given an intricate, high-stakes problem, clear boundaries, and the autonomy to build world-class solutions without endless committee meetings.",
      fullDescription:
        "The Autonomous Specialist finds dignity in genuine competence. You are repelled by superficial corporate theater, performative status meetings, and politics. Instead, you dedicate your focus to mastering the nuances of your field—whether software architecture, financial modeling, design, or law. When organizations need rock-solid execution or an unsolvable puzzle cracked, you are the specialist they call.",
      superpowers: [
        "Uncommon depth of technical or creative domain expertise",
        "Exceptional sustained deep-work capability and attention to detail",
        "Self-directed agency requiring virtually zero managerial oversight",
        "High immunity to superficial office politics and distractions",
      ],
      blindspots: [
        "Can become isolated or neglect broader organizational context",
        "Impatience with junior colleagues who require hand-holding",
        "Reluctance to advocate for your accomplishments politically",
        "Tendency to over-engineer solutions beyond what the business requires",
      ],
      communicationStyle:
        "Asynchronous, precise, documented, and concise. Prefers written specs, pull requests, and clear tickets over spontaneous video calls.",
      collaborationStyle:
        "Specialist contributor. Pairs well with empathetic project managers who shield them from bureaucratic overhead.",
      idealEnvironment:
        "Remote-first companies, specialized research labs, boutique technical consultancies, or senior individual contributor tracks.",
      growthLever:
        "Translate your technical brilliance into executive business impact. Show leadership how your craft directly protects or generates enterprise value.",
      dimensionPreferences: {
        solo_vs_synergy: "low",
        structure_vs_flexibility: "neutral",
        analytical_vs_creative: "low",
        risk_tolerance: "low",
        leadership_vs_craft: "low",
      },
    },
    {
      key: "strategic_catalyst",
      title: "The Strategic Catalyst",
      subtitle: "The Cross-Functional Multiplier & Visionary Operator",
      tagline: "Connecting strategy, people, and execution to accelerate organizational breakthroughs.",
      shortDescription:
        "You sit at the intersection of business strategy, human psychology, and product vision. You bridge organizational silos and turn ambiguity into clear strategic momentum.",
      fullDescription:
        "The Strategic Catalyst is the glue of ambitious organizations. You possess the rare ability to speak the dialect of engineers, accountants, designers, and board members equally well. You understand that strategy without human buy-in is dead on arrival. You shine in high-growth environments where rapid scaling threatens to break communication channels, restoring clarity and unified purpose.",
      superpowers: [
        "Exceptional stakeholder alignment and cross-silo diplomacy",
        "Translating high-level executive vision into clear quarterly roadmaps",
        "High emotional quotient combined with commercial acumen",
        "Quick intuition for identifying organizational bottlenecks",
      ],
      blindspots: [
        "Risk of becoming stretched too thin across dozens of initiatives",
        "Can lose touch with deep hands-on tactical craft",
        "Vulnerability to political exhaustion from mediating conflicting egos",
        "Difficulty saying no to promising but non-essential opportunities",
      ],
      communicationStyle:
        "Persuasive, contextual, empathetic, and structured. Customizes the narrative to the audience, framing goals around shared victories.",
      collaborationStyle:
        "Orchestrator and facilitator. Excels when leading cross-functional squads, strategic partnerships, product management, or chief-of-staff roles.",
      idealEnvironment:
        "Series A-to-D scaleups, innovative corporate strategy units, or dynamic venture builders with high cross-functional complexity.",
      growthLever:
        "Ruthlessly protect your priority calendar. Your greatest leverage is saying no to 9 good projects so you can shepherd the single defining one.",
      dimensionPreferences: {
        solo_vs_synergy: "high",
        structure_vs_flexibility: "high",
        analytical_vs_creative: "neutral",
        risk_tolerance: "high",
        leadership_vs_craft: "high",
      },
    },
    {
      key: "enterprise_architect",
      title: "The Enterprise Architect",
      subtitle: "The Custodian of Scale, Stability & Governance",
      tagline: "Building durable institutional engines that endure long past the founder era.",
      shortDescription:
        "You think in institutional timeframes. You design sustainable governance, robust operational processes, and scalable systems that minimize single-point-of-failure risks.",
      fullDescription:
        "The Enterprise Architect understands that chaotic heroic sprints cannot sustain an enduring enterprise. You value process maturity, institutional memory, risk management, and rigorous repeatability. While chaotic teams scramble from fire to fire, you build the sprinkler systems and operational architecture that ensure reliability at massive scale. You are the leader boards trust to safeguard mission-critical assets.",
      superpowers: [
        "Systemic design of repeatable, fault-tolerant business operations",
        "Deep respect for compliance, risk management, and financial prudence",
        "Ability to manage massive complexity and distributed teams with composure",
        "Steadfast loyalty to long-term institutional value creation",
      ],
      blindspots: [
        "May move too cautiously during early disruptive market shifts",
        "Can inadvertently create bureaucratic friction that slows down nimble experiments",
        "Skepticism toward untested, non-standard working arrangements",
        "Underestimating the morale boost of quick, messy wins",
      ],
      communicationStyle:
        "Formal, measured, comprehensive, and policy-aligned. Clear documentation, risk matrices, and formal memos.",
      collaborationStyle:
        "Executive steward. Best placed in operations, enterprise engineering, risk governance, or large division management.",
      idealEnvironment:
        "Mature corporations, regulated industries (fintech, healthcare), established public institutions, or mature growth companies preparing for IPO.",
      growthLever:
        "Create dedicated sandbox zones where junior teams can experiment with zero bureaucracy and fast failure without endangering the core enterprise.",
      dimensionPreferences: {
        solo_vs_synergy: "neutral",
        structure_vs_flexibility: "low",
        analytical_vs_creative: "low",
        risk_tolerance: "low",
        leadership_vs_craft: "high",
      },
    },
    {
      key: "agile_operator",
      title: "The Agile Operator",
      subtitle: "The Rapid Problem-Solver & Momentum Driver",
      tagline: "Thriving in ambiguity, troubleshooting crises, and shipping solutions at breakthrough speed.",
      shortDescription:
        "You are the versatile fixer who thrives in chaotic, unpredictable arenas. When the playbook doesn't exist, you improvise, build scrappy prototypes, and get things done.",
      fullDescription:
        "The Agile Operator is the ultimate early-stage warrior. You don't need a 40-page brief or permission slips to move. When a customer escalates, a system breaks, or an opportunity emerges, you jump directly into the fray with relentless optimism and tactical speed. You are comfortable wearing multiple hats—sales, support, product, and operations—doing whatever it takes to push the needle forward.",
      superpowers: [
        "Breakthrough speed of execution and rapid iteration cycles",
        "High tolerance for ambiguity, disorder, and shifting requirements",
        "Scrappy resourcefulness that maximizes minimal budgets",
        "High resilience and mental grit in fast-changing environments",
      ],
      blindspots: [
        "Impatience with documentation, standardized processes, and formal reviews",
        "Tendency to create technical or operational debt that others must clean up later",
        "Can suffer from boredom once an operation matures into steady maintenance",
        "Vulnerability to physical exhaustion from treating every week like an emergency",
      ],
      communicationStyle:
        "Urgent, informal, action-oriented, and direct. Prefers quick Slack messages, voice notes, and live demos over formal memos.",
      collaborationStyle:
        "Sprint commander and frontline troubleshooter. Excels in zero-to-one startups, emergency taskforces, and new market launches.",
      idealEnvironment:
        "Early-stage venture-backed startups, turnaround situations, agency crisis management, or entrepreneurial founder-led teams.",
      growthLever:
        "Learn the art of graceful handoff. Once you break the barrier and establish initial traction, train structured stewards to maintain the machine.",
      dimensionPreferences: {
        solo_vs_synergy: "high",
        structure_vs_flexibility: "high",
        analytical_vs_creative: "neutral",
        risk_tolerance: "high",
        leadership_vs_craft: "neutral",
      },
    },
  ],
  questions: [
    // --- DIMENSION 1: solo_vs_synergy (5 questions) ---
    {
      id: "cdna_q1",
      order: 1,
      text: "I produce my highest quality work when given an autonomous domain with minimal recurring coordination meetings.",
      contextHint: "Your productivity peaks under solo focus vs group syncs.",
      categoryTag: "Collaboration Model",
      type: "likert_5",
      options: createLikertOptions("solo_vs_synergy", true), // Agree -> Solo (low)
    },
    {
      id: "cdna_q2",
      order: 2,
      text: "I feel most energized when whiteboarding live with teammates and bouncing ideas back and forth in real time.",
      contextHint: "Interactive brainstorming vs solitary drafting.",
      categoryTag: "Collaboration Model",
      type: "likert_5",
      options: createLikertOptions("solo_vs_synergy", false), // Agree -> Synergy (high)
    },
    {
      id: "cdna_q3",
      order: 3,
      text: "Constant Slack notifications and ad-hoc calls severely fragment my ability to think deeply.",
      contextHint: "Cognitive cost of workplace interruptions.",
      categoryTag: "Collaboration Model",
      type: "likert_5",
      options: createLikertOptions("solo_vs_synergy", true),
    },
    {
      id: "cdna_q4",
      order: 4,
      text: "I find working in complete isolation for several consecutive days demotivating and lonely.",
      contextHint: "Need for social camaraderie and team presence.",
      categoryTag: "Collaboration Model",
      type: "likert_5",
      options: createLikertOptions("solo_vs_synergy", false),
    },
    {
      id: "cdna_q5",
      order: 5,
      text: "I would rather be evaluated solely on my individual personal output than on shared team deliverables.",
      contextHint: "Accountability preferences.",
      categoryTag: "Collaboration Model",
      type: "likert_5",
      options: createLikertOptions("solo_vs_synergy", true),
    },

    // --- DIMENSION 2: structure_vs_flexibility (5 questions) ---
    {
      id: "cdna_q6",
      order: 6,
      text: "I perform best when there are clearly established standard operating procedures, roles, and approval chains.",
      contextHint: "Comfort with organizational hierarchy and governance.",
      categoryTag: "Operational Predictability",
      type: "likert_5",
      options: createLikertOptions("structure_vs_flexibility", true), // Agree -> Structure (low)
    },
    {
      id: "cdna_q7",
      order: 7,
      text: "I get energized by 'blank slate' projects where nobody knows the answers and I have to define the playbook from scratch.",
      contextHint: "Tolerance for ambiguity and greenfield challenges.",
      categoryTag: "Operational Predictability",
      type: "likert_5",
      options: createLikertOptions("structure_vs_flexibility", false), // Agree -> Flexibility (high)
    },
    {
      id: "cdna_q8",
      order: 8,
      text: "Frequent mid-quarter strategic pivots by management cause me significant frustration.",
      contextHint: "Need for directional consistency and stability.",
      categoryTag: "Operational Predictability",
      type: "likert_5",
      options: createLikertOptions("structure_vs_flexibility", true),
    },
    {
      id: "cdna_q9",
      order: 9,
      text: "I am completely comfortable with my job title and responsibilities shifting every six months as company needs evolve.",
      contextHint: "Role fluidness in dynamic teams.",
      categoryTag: "Operational Predictability",
      type: "likert_5",
      options: createLikertOptions("structure_vs_flexibility", false),
    },
    {
      id: "cdna_q10",
      order: 10,
      text: "I value working in an established institution with a multi-decade track record over an unproven newcomer.",
      contextHint: "Institutional brand security vs venture freshness.",
      categoryTag: "Operational Predictability",
      type: "likert_5",
      options: createLikertOptions("structure_vs_flexibility", true),
    },

    // --- DIMENSION 3: analytical_vs_creative (5 questions) ---
    {
      id: "cdna_q11",
      order: 11,
      text: "I naturally dissect problems using spreadsheets, quantitative data, and logical root-cause analysis.",
      contextHint: "Your primary diagnostic tool.",
      categoryTag: "Problem-Solving Currency",
      type: "likert_5",
      options: createLikertOptions("analytical_vs_creative", true), // Agree -> Analytical (low)
    },
    {
      id: "cdna_q12",
      order: 12,
      text: "I am energized by conceptual storytelling, aesthetic design, branding, and emotional user empathy.",
      contextHint: "Appealing to human emotion vs cold metrics.",
      categoryTag: "Problem-Solving Currency",
      type: "likert_5",
      options: createLikertOptions("analytical_vs_creative", false), // Agree -> Creative (high)
    },
    {
      id: "cdna_q13",
      order: 13,
      text: "When making a pitch, I lead with verified metrics, benchmark statistics, and ROI models rather than vision narratives.",
      contextHint: "Your core persuasive arsenal.",
      categoryTag: "Problem-Solving Currency",
      type: "likert_5",
      options: createLikertOptions("analytical_vs_creative", true),
    },
    {
      id: "cdna_q14",
      order: 14,
      text: "I often propose lateral, out-of-the-box ideas that initially make conservative colleagues uneasy.",
      contextHint: "Divergent ideation instinct.",
      categoryTag: "Problem-Solving Currency",
      type: "likert_5",
      options: createLikertOptions("analytical_vs_creative", false),
    },
    {
      id: "cdna_q15",
      order: 15,
      text: "I prefer evaluating performance based on unambiguous quantitative KPIs rather than subjective ratings.",
      contextHint: "Objectivity in workplace scorecards.",
      categoryTag: "Problem-Solving Currency",
      type: "likert_5",
      options: createLikertOptions("analytical_vs_creative", true),
    },

    // --- DIMENSION 4: risk_tolerance (5 questions) ---
    {
      id: "cdna_q16",
      order: 16,
      text: "I would gladly sacrifice a portion of fixed salary for substantial equity or commission upside with uncapped potential.",
      contextHint: "Venture risk vs predictable base compensation.",
      categoryTag: "Venture Appetite",
      type: "likert_5",
      options: createLikertOptions("risk_tolerance", false), // Agree -> High risk (high)
    },
    {
      id: "cdna_q17",
      order: 17,
      text: "Knowing that my paycheck will arrive reliably on the 1st of every month without fail is non-negotiable for my peace of mind.",
      contextHint: "Fundamental financial safety baseline.",
      categoryTag: "Venture Appetite",
      type: "likert_5",
      options: createLikertOptions("risk_tolerance", true), // Agree -> Low risk (low)
    },
    {
      id: "cdna_q18",
      order: 18,
      text: "Joining an early-stage startup with 6 months of runway excites me more than joining an enterprise with 50,000 employees.",
      contextHint: "Appetite for existential company stakes.",
      categoryTag: "Venture Appetite",
      type: "likert_5",
      options: createLikertOptions("risk_tolerance", false),
    },
    {
      id: "cdna_q19",
      order: 19,
      text: "I prefer working in industries with defensive moats (e.g., healthcare, infrastructure) over fast-moving fad sectors.",
      contextHint: "Industry stability preferences.",
      categoryTag: "Venture Appetite",
      type: "likert_5",
      options: createLikertOptions("risk_tolerance", true),
    },
    {
      id: "cdna_q20",
      order: 20,
      text: "I am comfortable taking public accountability for bold experiments where the risk of public failure is high.",
      contextHint: "Courage to risk reputational downside for outsized impact.",
      categoryTag: "Venture Appetite",
      type: "likert_5",
      options: createLikertOptions("risk_tolerance", false),
    },

    // --- DIMENSION 5: leadership_vs_craft (5 questions) ---
    {
      id: "cdna_q21",
      order: 21,
      text: "I would be happier as a world-class individual contributor than as a manager spending all day in 1-on-1s and performance reviews.",
      contextHint: "Pure craft vs people management.",
      categoryTag: "Impact Vector",
      type: "likert_5",
      options: createLikertOptions("leadership_vs_craft", true), // Agree -> Craft (low)
    },
    {
      id: "cdna_q22",
      order: 22,
      text: "My greatest professional satisfaction comes from coaching others, unlocking their potential, and orchestrating a team to win.",
      contextHint: "People leadership fulfillment.",
      categoryTag: "Impact Vector",
      type: "likert_5",
      options: createLikertOptions("leadership_vs_craft", false), // Agree -> Leadership (high)
    },
    {
      id: "cdna_q23",
      order: 23,
      text: "I get deeply frustrated when I haven't personally built, designed, or written anything tangible in weeks.",
      contextHint: "Need for direct hands-on creation.",
      categoryTag: "Impact Vector",
      type: "likert_5",
      options: createLikertOptions("leadership_vs_craft", true),
    },
    {
      id: "cdna_q24",
      order: 24,
      text: "I naturally step up to guide group direction, allocate resources, and take responsibility for team morale.",
      contextHint: "Instinctive leadership drive.",
      categoryTag: "Impact Vector",
      type: "likert_5",
      options: createLikertOptions("leadership_vs_craft", false),
    },
    {
      id: "cdna_q25",
      order: 25,
      text: "I would decline a managerial promotion if it meant abandoning the technical craft I love.",
      contextHint: "The dual-track career choice.",
      categoryTag: "Impact Vector",
      type: "likert_5",
      options: createLikertOptions("leadership_vs_craft", true),
    },
  ],
};
