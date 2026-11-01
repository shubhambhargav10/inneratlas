import { AssessmentDefinition } from "./types";
import { createLikertOptions } from "./helpers";

export const thinkingStyleAssessment: AssessmentDefinition = {
  id: "asm_thinking_style",
  slug: "thinking-style",
  title: "Thinking Style Assessment",
  subtitle: "Explore how your mind processes complexity, navigates uncertainty, and solves thorny problems.",
  category: "Cognitive",
  estimatedMinutes: 10,
  priceInr: 199,
  compareAtInr: 499,
  badgeLabel: "Cognitive Mastery",
  heroHeadline: "Map Your Cognitive Blueprint: Uncover How You Actually Reason, Decide, and Create",
  heroSubheadline:
    "An exploration of 6 fundamental cognitive modalities: Analytical, Creative, Systems, Intuitive, Reflective, and Practical Execution thinking. Discover your cognitive blindspots and mental models.",
  whatYouWillDiscover: [
    "Your Dominant and Secondary Cognitive Modalities (Systems, Creative, Analytical, or Practical)",
    "Spider radar profile across 6 core mental dimensions",
    "How cognitive friction arises when collaborating with opposing thinking styles",
    "Custom mental model toolkit to sharpen decision-making speed and eliminate bias",
  ],
  dimensions: [
    {
      key: "analytical",
      name: "Analytical Deconstruction",
      description: "Breaking complex dilemmas into logical, linear cause-and-effect components.",
      lowLabel: "Holistic Intuition",
      highLabel: "Linear Logical Rigor",
    },
    {
      key: "creative",
      name: "Divergent Innovation",
      description: "Forging unexpected lateral metaphors and novel conceptual breakthroughs.",
      lowLabel: "Conventional Pragmatism",
      highLabel: "Divergent Ideation",
    },
    {
      key: "systems",
      name: "Systems & Dynamic Feedback",
      description: "Seeing the forest, interdependencies, second-order consequences, and delay loops.",
      lowLabel: "Isolated Point-Solutions",
      highLabel: "Interconnected Systems",
    },
    {
      key: "intuitive",
      name: "Rapid Heuristic Intuition",
      description: "Subconscious pattern recognition and somatic decision-making under high ambiguity.",
      lowLabel: "Exhaustive Evidence Gathering",
      highLabel: "Subconscious Heuristic Trust",
    },
    {
      key: "reflective",
      name: "Metacognitive Depth",
      description: "Examining your own mental models, questioning assumptions, and contemplative pause.",
      lowLabel: "Immediate External Action",
      highLabel: "Deep Self-Auditing Metacognition",
    },
    {
      key: "practical",
      name: "Tactical Execution Utility",
      description: "Translating theoretical concepts into immediate, friction-free practical tools.",
      lowLabel: "Abstract Pure Theory",
      highLabel: "Immediate Actionable Utility",
    },
  ],
  archetypes: [
    {
      key: "systems_thinker",
      title: "The Deep Systems Thinker",
      subtitle: "The Master of Interconnected Complexities & Feedback Loops",
      tagline: "Seeing the invisible network of incentives, feedback loops, and second-order effects.",
      shortDescription:
        "You refuse to treat symptoms in isolation. You naturally map the interconnected ecosystem, anticipating how pulling one lever will ripple across the entire system three quarters from now.",
      fullDescription:
        "The Deep Systems Thinker has a panoramic mental lens. While others rush to implement superficial quick fixes, you pause to ask: 'What systemic incentive created this pathology in the first place?' You understand feedback loops, non-linear tipping points, and unintended consequences. You excel at organizational design, macro policy, and long-term architecture.",
      superpowers: [
        "Uncanny foresight regarding unintended consequences and secondary effects",
        "Ability to diagnose deep structural bottlenecks rather than cosmetic symptoms",
        "Mastery of multi-variable trade-offs and ecological thinking",
        "Immunity to short-sighted reactive panic",
      ],
      blindspots: [
        "Can suffer from paralysis by complexity when urgent simple action is required",
        "Frustration when others fail to appreciate systemic nuances",
        "Tendency to propose comprehensive overhauls where a minor patch suffices",
        "Difficulty explaining complex multi-loop mental models simply",
      ],
      communicationStyle:
        "Architectural, contextual, and holistic. Uses systems diagrams, causal loop metaphors, and long-range scenario analysis.",
      collaborationStyle:
        "The organizational diagnostician. Works best when advising executive leadership, architects, or policymakers on holistic strategy.",
      idealEnvironment:
        "Complex organizations, research think-tanks, platform architecture teams, or policy design environments with high multi-variable challenges.",
      growthLever:
        "Practice tactical reductionism. Master the art of the 80/20 intervention—finding the single highest-leverage node to nudge without rewriting the universe.",
      dimensionPreferences: {
        systems: "high",
        analytical: "high",
        creative: "neutral",
        intuitive: "neutral",
        reflective: "high",
        practical: "neutral",
      },
    },
    {
      key: "creative_synthesizer",
      title: "The Creative Synthesizer",
      subtitle: "The Alchemist of Lateral Ideas & Non-Linear Leaps",
      tagline: "Connecting unrelated dots to create novel concepts that redefine existing boundaries.",
      shortDescription:
        "You possess a flexible, divergent intellect that traverses disciplinary silos with ease, synthesizing surprising metaphors into original creative breakthroughs.",
      fullDescription:
        "The Creative Synthesizer thinks in sparks and webs rather than straight lines. You pull analogies from biology into software, or architectural principles into brand strategy. You are comfortable dwelling in generative uncertainty, playfully testing 'what if' propositions that traditional minds quickly dismiss. When industries become commoditized and stagnant, you provide the transformative creative spark that reinvents the category.",
      superpowers: [
        "Extraordinary divergent thinking and lateral problem solving",
        "Effortless cross-pollination between disparate disciplines",
        "Ability to reframe stubborn problems from fresh perspectives",
        "Infectious intellectual curiosity and cognitive playfulness",
      ],
      blindspots: [
        "Can become bored once the concept is generated, neglecting the grind of execution",
        "Resistance to methodical, repetitive documentation and administrative rigor",
        "Can confuse an aesthetically elegant hypothesis with an empirically validated truth",
        "Impatience with peers who think in linear, incremental steps",
      ],
      communicationStyle:
        "Vivid, metaphorical, provocative, and inspiring. Uses rich imagery, analogies, and conceptual questions.",
      collaborationStyle:
        "The ideation catalyst. Thrives at the kickoff of new ventures, innovation labs, brand overhauls, or product redesigns.",
      idealEnvironment:
        "Innovation labs, creative agencies, design studios, or exploratory R&D divisions with high psychological safety and creative latitude.",
      growthLever:
        "Develop an empirical feedback loop. Subject your most cherished creative leaps to swift real-world tests to separate viable genius from mere fantasy.",
      dimensionPreferences: {
        creative: "high",
        intuitive: "high",
        systems: "neutral",
        analytical: "neutral",
        reflective: "neutral",
        practical: "low",
      },
    },
    {
      key: "pragmatic_executor",
      title: "The Pragmatic Executor",
      subtitle: "The Master of Tactical Velocity & Friction Removal",
      tagline: "Converting abstract theories into immediate, workable tools that get the job done.",
      shortDescription:
        "You cut through academic jargon and endless theoretical hand-wringing. Your mind instantly asks: 'What is the fastest, simplest way to test and deploy this today?'",
      fullDescription:
        "The Pragmatic Executor is the antidote to intellectual over-complication. While theorists debate definitions, you build the working spreadsheet, pick up the phone, or draft the one-page action brief. You value speed, simplicity, and tangible utility above intellectual elegance. You believe the best plan is the one that gets executed and iterated upon in the real world.",
      superpowers: [
        "Ruthless clarity in cutting through over-engineered complexity",
        "Exceptional speed from concept to practical execution",
        "High common sense and intuitive grasp of human operational friction",
        "Resilience and rapid iteration based on empirical user feedback",
      ],
      blindspots: [
        "Can dismiss valuable long-range strategic considerations as 'wasted time'",
        "May fixate on local optimizations while missing broader structural shifts",
        "Impatience with deep contemplative research and nuance",
        "Risk of creating short-term tactical patches that cause downstream debt",
      ],
      communicationStyle:
        "No-nonsense, direct, actionable, and concise. Speaks in deliverables, action items, owners, and deadlines.",
      collaborationStyle:
        "The frontline closer. Outstanding at launching MVPs, untangling stalled projects, and driving rapid quarterly sprints.",
      idealEnvironment:
        "Fast-growth startups, agile product teams, turnaround units, or emergency operations where bias for action is rewarded.",
      growthLever:
        "Cultivate patience for second-order thinking. Sometimes slowing down for two days saves six months of rebuilding the wrong thing.",
      dimensionPreferences: {
        practical: "high",
        analytical: "neutral",
        creative: "neutral",
        intuitive: "high",
        systems: "low",
        reflective: "low",
      },
    },
    {
      key: "analytical_auditor",
      title: "The Analytical Auditor",
      subtitle: "The Guardian of First Principles & Empirical Rigor",
      tagline: "Subjecting every assertion to rigorous logic, verifiable evidence, and deductive proof.",
      shortDescription:
        "You do not accept conventional wisdom or charismatic rhetoric. You systematically deconstruct claims, verify underlying assumptions, and demand undeniable proof.",
      fullDescription:
        "The Analytical Auditor is the intellectual truth-seeker. You possess a laser-sharp mind that spots logical fallacies, statistical biases, and unstated assumptions from a mile away. While others are easily seduced by compelling narratives, you check the math, audit the methodologies, and verify the data. You are the person high-performing teams rely on before signing multi-million dollar contracts or betting the company's future.",
      superpowers: [
        "Unrivaled logical precision and deductive rigor",
        "Gift for spotting hidden fallacies, false correlations, and risks",
        "First-principles reasoning that cuts through hype and consensus illusions",
        "Disciplined objectivity unaffected by social pressure or emotional appeals",
      ],
      blindspots: [
        "Can be perceived as hyper-skeptical, cynical, or unenthusiastic",
        "May struggle to make calls when data is inherently incomplete or ambiguous",
        "Can undervalue the power of storytelling and emotional motivation in human systems",
        "Risk of getting stuck in 'debating mode' rather than contributing constructively",
      ],
      communicationStyle:
        "Data-driven, precise, nuanced, and question-oriented. Probes logic with Socratic inquiry and requires clear evidentiary backing.",
      collaborationStyle:
        "The critical reviewer and safety check. Indispensable in risk management, code review, investment analysis, and architecture audits.",
      idealEnvironment:
        "Quantitative hedge funds, scientific research groups, investigative units, cybersecurity, or critical infrastructure engineering.",
      growthLever:
        "Remember that human beings are fundamentally emotional creatures. To move the world, pair your undeniable logic with inspiring empathy.",
      dimensionPreferences: {
        analytical: "high",
        reflective: "high",
        systems: "neutral",
        creative: "low",
        intuitive: "low",
        practical: "neutral",
      },
    },
  ],
  questions: [
    // --- DIMENSION 1: analytical (4 questions) ---
    {
      id: "ts_q1",
      order: 1,
      text: "When confronted with a complicated issue, my first reaction is to deconstruct it into its individual component variables.",
      contextHint: "Your instinctual mental breakdown method.",
      categoryTag: "Analytical Deconstruction",
      type: "likert_5",
      options: createLikertOptions("analytical", false),
    },
    {
      id: "ts_q2",
      order: 2,
      text: "I am uncomfortable making significant choices unless I can map out a clear, step-by-step causal chain supporting the decision.",
      contextHint: "Requirement for deductive justification.",
      categoryTag: "Analytical Deconstruction",
      type: "likert_5",
      options: createLikertOptions("analytical", false),
    },
    {
      id: "ts_q3",
      order: 3,
      text: "I spot logical inconsistencies and mathematical flaws in presentations almost immediately.",
      contextHint: "Automatic error detection.",
      categoryTag: "Analytical Deconstruction",
      type: "likert_5",
      options: createLikertOptions("analytical", false),
    },
    {
      id: "ts_q4",
      order: 4,
      text: "I prefer quantitative spreadsheets and statistical distributions over qualitative anecdotes.",
      contextHint: "Hard evidence vs anecdotal observation.",
      categoryTag: "Analytical Deconstruction",
      type: "likert_5",
      options: createLikertOptions("analytical", false),
    },

    // --- DIMENSION 2: creative (4 questions) ---
    {
      id: "ts_q5",
      order: 5,
      text: "I frequently borrow principles from nature, art, or history to solve modern technical or organizational problems.",
      contextHint: "Cross-disciplinary analogical thinking.",
      categoryTag: "Divergent Innovation",
      type: "likert_5",
      options: createLikertOptions("creative", false),
    },
    {
      id: "ts_q6",
      order: 6,
      text: "I feel energized when brainstorms wander into wild, unconventional, or even seemingly absurd possibilities.",
      contextHint: "Comfort with wild ideation.",
      categoryTag: "Divergent Innovation",
      type: "likert_5",
      options: createLikertOptions("creative", false),
    },
    {
      id: "ts_q7",
      order: 7,
      text: "I would rather invent a novel, untested solution than adopt an existing standard template.",
      contextHint: "Urge for originality vs replication.",
      categoryTag: "Divergent Innovation",
      type: "likert_5",
      options: createLikertOptions("creative", false),
    },
    {
      id: "ts_q8",
      order: 8,
      text: "I often experience breakthroughs while engaged in unrelated activities like walking, showering, or daydreaming.",
      contextHint: "Subconscious incubation and Eureka moments.",
      categoryTag: "Divergent Innovation",
      type: "likert_5",
      options: createLikertOptions("creative", false),
    },

    // --- DIMENSION 3: systems (4 questions) ---
    {
      id: "ts_q9",
      order: 9,
      text: "I naturally consider how a decision made in one department will inadvertently cause friction in another two months later.",
      contextHint: "Anticipating delayed ripple effects.",
      categoryTag: "Systems & Dynamic Feedback",
      type: "likert_5",
      options: createLikertOptions("systems", false),
    },
    {
      id: "ts_q10",
      order: 10,
      text: "I believe that most persistent organizational problems are caused by misaligned incentives rather than 'bad employees.'",
      contextHint: "Structural attribution vs individual blame.",
      categoryTag: "Systems & Dynamic Feedback",
      type: "likert_5",
      options: createLikertOptions("systems", false),
    },
    {
      id: "ts_q11",
      order: 11,
      text: "I am fascinated by feedback loops, compounding interest, and tipping point phenomena.",
      contextHint: "Interest in systemic mechanics.",
      categoryTag: "Systems & Dynamic Feedback",
      type: "likert_5",
      options: createLikertOptions("systems", false),
    },
    {
      id: "ts_q12",
      order: 12,
      text: "I find isolated point-solutions irritating because they almost always shift the burden elsewhere in the organization.",
      contextHint: "Distrust of superficial band-aids.",
      categoryTag: "Systems & Dynamic Feedback",
      type: "likert_5",
      options: createLikertOptions("systems", false),
    },

    // --- DIMENSION 4: intuitive (4 questions) ---
    {
      id: "ts_q13",
      order: 13,
      text: "I often make rapid, accurate judgment calls about people or deals based on physical sensations or gut instincts.",
      contextHint: "Trust in somatic heuristics.",
      categoryTag: "Rapid Heuristic Intuition",
      type: "likert_5",
      options: createLikertOptions("intuitive", false),
    },
    {
      id: "ts_q14",
      order: 14,
      text: "When data is conflicting or incomplete, I am comfortable backing my internal intuition to choose the path forward.",
      contextHint: "Decision confidence under extreme ambiguity.",
      categoryTag: "Rapid Heuristic Intuition",
      type: "likert_5",
      options: createLikertOptions("intuitive", false),
    },
    {
      id: "ts_q15",
      order: 15,
      text: "I can usually sense when a project or meeting is going off the rails before any formal metric reveals it.",
      contextHint: "Early subtle atmospheric detection.",
      categoryTag: "Rapid Heuristic Intuition",
      type: "likert_5",
      options: createLikertOptions("intuitive", false),
    },
    {
      id: "ts_q16",
      order: 16,
      text: "Over-analyzing simple decisions usually degrades my judgment rather than improving it.",
      contextHint: "Diminishing returns of deliberation.",
      categoryTag: "Rapid Heuristic Intuition",
      type: "likert_5",
      options: createLikertOptions("intuitive", false),
    },

    // --- DIMENSION 5: reflective (4 questions) ---
    {
      id: "ts_q17",
      order: 17,
      text: "I regularly interrogate my own belief systems and intentionally look for reasons why my convictions might be mistaken.",
      contextHint: "Active bias hunting and intellectual humility.",
      categoryTag: "Metacognitive Depth",
      type: "likert_5",
      options: createLikertOptions("reflective", false),
    },
    {
      id: "ts_q18",
      order: 18,
      text: "After significant meetings or decisions, I spend quiet time journaling or mentally reviewing what transpired.",
      contextHint: "Deliberate retrospective habit.",
      categoryTag: "Metacognitive Depth",
      type: "likert_5",
      options: createLikertOptions("reflective", false),
    },
    {
      id: "ts_q19",
      order: 19,
      text: "I am more interested in understanding the 'Why' behind human motives than simply reacting to their actions.",
      contextHint: "Focus on fundamental philosophical roots.",
      categoryTag: "Metacognitive Depth",
      type: "likert_5",
      options: createLikertOptions("reflective", false),
    },
    {
      id: "ts_q20",
      order: 20,
      text: "I am comfortable admitting 'I don't know' and letting a complex question sit unanswered for weeks.",
      contextHint: "Patience with unanswered questions.",
      categoryTag: "Metacognitive Depth",
      type: "likert_5",
      options: createLikertOptions("reflective", false),
    },

    // --- DIMENSION 6: practical (4 questions) ---
    {
      id: "ts_q21",
      order: 21,
      text: "An idea has zero value to me unless it can be translated into concrete, immediate operational steps.",
      contextHint: "Primacy of utility over elegance.",
      categoryTag: "Tactical Execution Utility",
      type: "likert_5",
      options: createLikertOptions("practical", false),
    },
    {
      id: "ts_q22",
      order: 22,
      text: "I prefer building a scrappy, imperfect prototype in two hours rather than spending three weeks debating a design document.",
      contextHint: "Bias for rapid prototyping.",
      categoryTag: "Tactical Execution Utility",
      type: "likert_5",
      options: createLikertOptions("practical", false),
    },
    {
      id: "ts_q23",
      order: 23,
      text: "I focus primarily on removing immediate bottlenecks that prevent teams from shipping today.",
      contextHint: "Focus on immediate friction removal.",
      categoryTag: "Tactical Execution Utility",
      type: "likert_5",
      options: createLikertOptions("practical", false),
    },
    {
      id: "ts_q24",
      order: 24,
      text: "I judge the quality of a framework by how easily a junior colleague can pick it up and use it on day one.",
      contextHint: "Simplicity and accessibility standards.",
      categoryTag: "Tactical Execution Utility",
      type: "likert_5",
      options: createLikertOptions("practical", false),
    },
  ],
};
