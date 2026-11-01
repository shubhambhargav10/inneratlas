import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { AssessmentResult } from "@/data/assessments/types";
import { siteConfig } from "@/config/site";

const styles = StyleSheet.create({
  page: {
    paddingTop: 45,
    paddingBottom: 45,
    paddingHorizontal: 45,
    backgroundColor: "#FAF8F5",
    color: "#121826",
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E8E2D9",
    paddingBottom: 10,
    marginBottom: 20,
  },
  headerBrand: {
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1.5,
    color: "#4F46E5",
    textTransform: "uppercase",
  },
  headerCode: {
    fontSize: 9,
    color: "#5B677E",
  },
  footer: {
    position: "absolute",
    bottom: 25,
    left: 45,
    right: 45,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#E8E2D9",
    paddingTop: 8,
    fontSize: 8,
    color: "#8D99AE",
  },

  // Cover Page Styles
  coverPage: {
    padding: 50,
    backgroundColor: "#FAF8F5",
    flexDirection: "column",
    justifyContent: "space-between",
    height: "100%",
  },
  coverTopBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "#4F46E5",
    paddingBottom: 15,
  },
  coverLogo: {
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: 2,
    color: "#121826",
    textTransform: "uppercase",
  },
  coverTagline: {
    fontSize: 9,
    color: "#5B677E",
    fontStyle: "italic",
  },
  coverCenter: {
    marginVertical: "auto",
    paddingVertical: 40,
  },
  coverEyebrow: {
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 2,
    color: "#4F46E5",
    textTransform: "uppercase",
    marginBottom: 10,
  },
  coverTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#121826",
    lineHeight: 1.2,
    marginBottom: 10,
  },
  coverSubtitle: {
    fontSize: 14,
    color: "#5B677E",
    lineHeight: 1.4,
    marginBottom: 25,
  },
  coverBlendBadge: {
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  coverBlendText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#312E81",
  },
  coverBlendDesc: {
    fontSize: 10,
    color: "#4338CA",
    marginTop: 4,
    lineHeight: 1.4,
  },
  coverMetaBox: {
    borderTopWidth: 1,
    borderTopColor: "#E8E2D9",
    paddingTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaLabel: {
    fontSize: 8,
    color: "#8D99AE",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 3,
  },
  metaValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#121826",
  },

  // Content Section Styles
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#121826",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: 9,
    color: "#5B677E",
    marginBottom: 10,
  },
  paragraph: {
    fontSize: 9.5,
    color: "#2A3447",
    lineHeight: 1.55,
    marginBottom: 8,
  },

  // Score Bar Styles
  dimensionRow: {
    marginBottom: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8E2D9",
    borderRadius: 6,
    padding: 8,
  },
  dimensionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  dimensionName: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#121826",
  },
  dimensionScore: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#4F46E5",
  },
  barTrack: {
    height: 6,
    backgroundColor: "#EDE7DF",
    borderRadius: 3,
    overflow: "hidden",
    marginVertical: 4,
  },
  barFill: {
    height: "100%",
    backgroundColor: "#4F46E5",
    borderRadius: 3,
  },
  dimensionLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: "#8D99AE",
  },

  // Card & Box Styles
  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginVertical: 6,
  },
  card: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8E2D9",
    borderRadius: 6,
    padding: 9,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#121826",
    marginBottom: 4,
  },
  cardText: {
    fontSize: 8.5,
    color: "#4B5563",
    lineHeight: 1.45,
  },

  // Roadmap Phase Box
  phaseBox: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8E2D9",
    borderLeftWidth: 4,
    borderLeftColor: "#4F46E5",
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
  },
  phaseTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#121826",
    marginBottom: 2,
  },
  phaseObjective: {
    fontSize: 8.5,
    color: "#5B677E",
    fontStyle: "italic",
    marginBottom: 6,
  },
  bulletPoint: {
    fontSize: 8.5,
    color: "#2A3447",
    marginBottom: 3,
    lineHeight: 1.4,
  },

  // Disclaimer Box
  disclaimerBox: {
    backgroundColor: "#F4EFEA",
    borderWidth: 1,
    borderColor: "#E8E2D9",
    borderRadius: 6,
    padding: 10,
    marginTop: 15,
  },
  disclaimerText: {
    fontSize: 7.5,
    color: "#5B677E",
    lineHeight: 1.4,
  },
});

interface ReportDocumentProps {
  customerName: string;
  reportCode: string;
  assessmentTitle: string;
  result: AssessmentResult;
}

export function InnerAtlasReportDocument({
  customerName,
  reportCode,
  assessmentTitle,
  result,
}: ReportDocumentProps) {
  const generatedDate = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const { primaryArchetype, secondaryArchetype, dimensionScores, synthesis } = result;

  return (
    <Document>
      {/* PAGE 1: COVER PAGE */}
      <Page size="A4" style={styles.coverPage}>
        <View style={styles.coverTopBar}>
          <Text style={styles.coverLogo}>{siteConfig.name}</Text>
          <Text style={styles.coverTagline}>{siteConfig.tagline}</Text>
        </View>

        <View style={styles.coverCenter}>
          <Text style={styles.coverEyebrow}>Comprehensive Personal Dossier</Text>
          <Text style={styles.coverTitle}>{assessmentTitle}</Text>
          <Text style={styles.coverSubtitle}>
            A deep psychometric synthesis of your dominant behavioral drivers, cognitive architecture, and growth levers.
          </Text>

          <View style={styles.coverBlendBadge}>
            <Text style={styles.coverBlendText}>{synthesis.archetypeBlendName}</Text>
            <Text style={styles.coverBlendDesc}>{synthesis.blendDescription}</Text>
          </View>
        </View>

        <View style={styles.coverMetaBox}>
          <View>
            <Text style={styles.metaLabel}>Prepared For</Text>
            <Text style={styles.metaValue}>{customerName}</Text>
          </View>
          <View>
            <Text style={styles.metaLabel}>Dossier Code</Text>
            <Text style={styles.metaValue}>{reportCode}</Text>
          </View>
          <View>
            <Text style={styles.metaLabel}>Issue Date</Text>
            <Text style={styles.metaValue}>{generatedDate}</Text>
          </View>
        </View>
      </Page>

      {/* PAGE 2: EXECUTIVE SUMMARY & ARCHETYPE DEEP DIVE */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerBrand}>{siteConfig.name} • Executive Synthesis</Text>
          <Text style={styles.headerCode}>{reportCode}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Executive Summary</Text>
          <Text style={styles.sectionSubtitle}>Overview of your core operating architecture</Text>
          <Text style={styles.paragraph}>{result.executiveSummary}</Text>
          <Text style={styles.paragraph}>
            This dossier integrates your Primary Archetype ({primaryArchetype.title}) and Secondary Archetype ({secondaryArchetype?.title || "Balanced Contextual"}) to present a nuanced, multi-dimensional view of how you perceive information, evaluate risks, and interact with the world.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Primary Archetype: {primaryArchetype.title}</Text>
          <Text style={styles.sectionSubtitle}>{primaryArchetype.subtitle}</Text>
          <Text style={styles.paragraph}>{primaryArchetype.fullDescription}</Text>
        </View>

        {secondaryArchetype && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Secondary Archetype: {secondaryArchetype.title}</Text>
            <Text style={styles.sectionSubtitle}>{secondaryArchetype.subtitle}</Text>
            <Text style={styles.paragraph}>{secondaryArchetype.fullDescription}</Text>
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text>Personalized Dossier for {customerName}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>

      {/* PAGE 3: DIMENSIONAL SCORE BREAKDOWN */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerBrand}>{siteConfig.name} • Dimensional Analytics</Text>
          <Text style={styles.headerCode}>{reportCode}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Dimensional Score Distribution</Text>
          <Text style={styles.sectionSubtitle}>Normalized psychometric scores across measured behavioral spectrums</Text>
          <Text style={styles.paragraph}>
            Your responses were mapped across calibrated behavioral dimensions. Each spectrum represents two complementary polarities rather than a binary judgement.
          </Text>

          {dimensionScores.map((dim) => (
            <View key={dim.key} style={styles.dimensionRow}>
              <View style={styles.dimensionHeader}>
                <Text style={styles.dimensionName}>{dim.name}</Text>
                <Text style={styles.dimensionScore}>{dim.normalizedScore}%</Text>
              </View>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${dim.normalizedScore}%` }]} />
              </View>
              <View style={styles.dimensionLabels}>
                <Text>{dim.lowLabel}</Text>
                <Text>{dim.highLabel}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Cognitive Superpowers</Text>
          <Text style={styles.sectionSubtitle}>Your natural competitive advantages when operating in peak flow</Text>
          <View style={styles.cardGrid}>
            {synthesis.keyStrengths.map((strength, i) => (
              <View key={i} style={styles.card}>
                <Text style={styles.cardTitle}>Superpower #{i + 1}</Text>
                <Text style={styles.cardText}>{strength}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text>Personalized Dossier for {customerName}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>

      {/* PAGE 4: SHADOW SIDES & INTERPERSONAL DYNAMICS */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerBrand}>{siteConfig.name} • Behavioral Dynamics</Text>
          <Text style={styles.headerCode}>{reportCode}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Hidden Blindspots & Derailers</Text>
          <Text style={styles.sectionSubtitle}>Subconscious patterns that emerge during high-stress situations</Text>
          <View style={styles.cardGrid}>
            {synthesis.shadowTraits.map((trait, i) => (
              <View key={i} style={[styles.card, { borderColor: "#FCA5A5" }]}>
                <Text style={[styles.cardTitle, { color: "#991B1B" }]}>Derailer Risk #{i + 1}</Text>
                <Text style={styles.cardText}>{trait}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Communication & Interpersonal Blueprint</Text>
          <Text style={styles.sectionSubtitle}>How you convey information and how you prefer receiving feedback</Text>
          <Text style={styles.paragraph}>{synthesis.communicationGuidance}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Collaboration & Team Ecosystem</Text>
          <Text style={styles.sectionSubtitle}>Optimal role placement and team synergy dynamics</Text>
          <Text style={styles.paragraph}>{synthesis.collaborationDynamics}</Text>
          <Text style={styles.paragraph}>
            <Text style={{ fontWeight: "bold" }}>Optimal Working Environment: </Text>
            {synthesis.careerEnvironmentRecommendation}
          </Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>Personalized Dossier for {customerName}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>

      {/* PAGE 5: 90-DAY ACTION ROADMAP & METHODOLOGY */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerBrand}>{siteConfig.name} • Strategic Roadmap</Text>
          <Text style={styles.headerCode}>{reportCode}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Personalized 90-Day Execution Roadmap</Text>
          <Text style={styles.sectionSubtitle}>Step-by-step practical calibration for personal and professional growth</Text>

          {/* Phase 1 */}
          <View style={styles.phaseBox}>
            <Text style={styles.phaseTitle}>{synthesis.actionPlan90Days.phase1.title}</Text>
            <Text style={styles.phaseObjective}>{synthesis.actionPlan90Days.phase1.objective}</Text>
            {synthesis.actionPlan90Days.phase1.actions.map((act, idx) => (
              <Text key={idx} style={styles.bulletPoint}>• {act}</Text>
            ))}
          </View>

          {/* Phase 2 */}
          <View style={styles.phaseBox}>
            <Text style={styles.phaseTitle}>{synthesis.actionPlan90Days.phase2.title}</Text>
            <Text style={styles.phaseObjective}>{synthesis.actionPlan90Days.phase2.objective}</Text>
            {synthesis.actionPlan90Days.phase2.actions.map((act, idx) => (
              <Text key={idx} style={styles.bulletPoint}>• {act}</Text>
            ))}
          </View>

          {/* Phase 3 */}
          <View style={styles.phaseBox}>
            <Text style={styles.phaseTitle}>{synthesis.actionPlan90Days.phase3.title}</Text>
            <Text style={styles.phaseObjective}>{synthesis.actionPlan90Days.phase3.objective}</Text>
            {synthesis.actionPlan90Days.phase3.actions.map((act, idx) => (
              <Text key={idx} style={styles.bulletPoint}>• {act}</Text>
            ))}
          </View>
        </View>

        {/* Methodology & Ethical Disclaimer */}
        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimerText}>
            <Text style={{ fontWeight: "bold" }}>Scientific & Ethical Notice: </Text>
            This dossier was generated deterministically by the {siteConfig.name} psychometric engine based solely on your validated self-assessment responses. It is intended strictly for personal development, reflective exploration, and professional coaching conversations. It does not constitute psychological diagnosis, IQ certification, medical evaluation, or guarantees of career outcomes.
          </Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>Personalized Dossier for {customerName}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function generatePdfBuffer(props: ReportDocumentProps): Promise<Buffer> {
  const doc = <InnerAtlasReportDocument {...props} />;
  return await renderToBuffer(doc);
}
