import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Share,
  Alert,
  Switch,
  Animated,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSessionSummary, finalizeSession } from './QuizEngine';
import { generateReport, saveReport } from './ReportGenerator';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SessionSummaryProps {
  userId: number;
  sessionId: number;
  ageGroup: string;
  correctCount: number;
  totalCount: number;
  coinsEarned: number;
  onDone: () => void;
}

type EngagementRating = 'yes' | 'somewhat' | 'no';

interface CategoryChip {
  key: string;
  label: string;
  correct: boolean; // all correct in category = green; any missed = red
  asked: boolean;   // was this category in the session at all?
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORIES: { key: string; label: string }[] = [
  { key: 'immunosuppression', label: 'Immunosuppression' },
  { key: 'tacrolimus', label: 'Tacrolimus' },
  { key: 'mycophenolate', label: 'Mycophenolate' },
  { key: 'steroids', label: 'Steroids' },
  { key: 'infection_prophylaxis', label: 'Infection Prevention' },
  { key: 'adherence', label: 'Adherence' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getEncouragingMessage(pct: number): string {
  if (pct >= 80) return "Outstanding! You're a transplant medication expert! 🎉";
  if (pct >= 60) return 'Great work! Keep practicing those tricky ones. 💪';
  return 'Good effort! Review these topics with your care team. 📚';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SessionSummary({
  userId,
  sessionId,
  ageGroup,
  correctCount,
  totalCount,
  coinsEarned,
  onDone,
}: SessionSummaryProps) {
  const sqliteContext = useSQLiteContext();
  const db = useMemo(() => drizzle(sqliteContext, { schema }), [sqliteContext]);

  // ── Tab state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'patient' | 'provider'>('patient');

  // ── Category chips (loaded async) ──────────────────────────────────────────
  const [categoryChips, setCategoryChips] = useState<CategoryChip[]>([]);

  // ── Provider view state ───────────────────────────────────────────────────
  const [nurseNotes, setNurseNotes] = useState('');
  const [engagementRating, setEngagementRating] = useState<EngagementRating | null>(null);
  const [caregiverPresent, setCaregiverPresent] = useState(false);

  // ── Report state ──────────────────────────────────────────────────────────
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportText, setReportText] = useState<string | null>(null);
  const [reportGenerated, setReportGenerated] = useState(false);

  // ── Animation for coin banner ─────────────────────────────────────────────
  const coinBounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(coinBounce, { toValue: -8, duration: 200, useNativeDriver: true }),
      Animated.spring(coinBounce, { toValue: 0, friction: 4, useNativeDriver: true }),
    ]).start();
  }, [coinBounce]);

  // ── Load category breakdown from DB ───────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      try {
        const attempts = await db
          .select()
          .from(schema.questionAttempts)
          .where(eq(schema.questionAttempts.sessionId, sessionId));

        // For each attempt, fetch the question's category
        const attemptsWithCategory = await Promise.all(
          attempts.map(async (a) => {
            const q = await db
              .select({ category: schema.questionBank.category })
              .from(schema.questionBank)
              .where(eq(schema.questionBank.id, a.questionId))
              .get();
            return { category: q?.category ?? 'unknown', isCorrect: !!a.isCorrect };
          })
        );

        // Build a map: category → { correct, total }
        const map: Record<string, { correct: number; total: number }> = {};
        for (const a of attemptsWithCategory) {
          if (!map[a.category]) map[a.category] = { correct: 0, total: 0 };
          map[a.category].total += 1;
          if (a.isCorrect) map[a.category].correct += 1;
        }

        const chips: CategoryChip[] = CATEGORIES.map(({ key, label }) => {
          const data = map[key];
          if (!data) return { key, label, correct: false, asked: false };
          return {
            key,
            label,
            correct: data.correct === data.total, // all correct → green
            asked: true,
          };
        });

        if (!cancelled) setCategoryChips(chips);
      } catch (err) {
        console.error('SessionSummary: failed to load category chips', err);
      }
    }

    loadCategories();
    return () => { cancelled = true; };
  }, [db, sessionId]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const percentage = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
  const encouragingMessage = getEncouragingMessage(percentage);

  // ── Generate report ───────────────────────────────────────────────────────
  const handleGenerateReport = useCallback(async () => {
    if (isGenerating) return;
    setIsGenerating(true);

    try {
      // 1. Fetch session summary (includes attempts + previous session)
      const summary = await getSessionSummary(db, sessionId, userId);

      // 2. Compute previous session score percentage (if available)
      const prevSession = summary.previousSession;
      const previousScore =
        prevSession && prevSession.totalQuestions && prevSession.totalQuestions > 0
          ? Math.round(((prevSession.correctCount ?? 0) / prevSession.totalQuestions) * 100)
          : null;
      const previousSessionDate = prevSession?.completedAt ?? null;

      // 3. Build report input
      const reportInput = {
        ageGroup,
        totalQuestions: totalCount,
        correctCount,
        previousScore,
        previousSessionDate,
        attempts: summary.attempts.map((a) => ({
          question: a.question,
          isCorrect: !!a.isCorrect,
        })),
        nurseNotes: nurseNotes.trim() || undefined,
        nurseEngagementRating: engagementRating ?? undefined,
        caregiverPresent,
        sessionDate: summary.session.startedAt,
      };

      // 4. Generate report text
      const text = generateReport(reportInput);

      // 5. Save report to DB
      await saveReport(db, sessionId, text);

      // 6. Finalize session (score + nurse data)
      await finalizeSession(
        db,
        sessionId,
        correctCount,
        nurseNotes.trim() || undefined,
        engagementRating ?? undefined,
        caregiverPresent
      );

      // 7. Show report
      setReportText(text);
      setReportGenerated(true);
    } catch (err) {
      console.error('SessionSummary: failed to generate report', err);
      Alert.alert(
        'Error',
        'Failed to generate the report. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsGenerating(false);
    }
  }, [
    db,
    sessionId,
    userId,
    ageGroup,
    totalCount,
    correctCount,
    nurseNotes,
    engagementRating,
    caregiverPresent,
    isGenerating,
  ]);

  // ── Share report ──────────────────────────────────────────────────────────
  const handleShare = useCallback(async () => {
    if (!reportText) return;
    try {
      await Share.share({
        title: 'Petiatrics Session Report',
        message: reportText,
      });
    } catch (err) {
      console.error('SessionSummary: share failed', err);
    }
  }, [reportText]);

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <View style={styles.root}>
      {/* ── Tab switcher (pill row) ───────────────────────────────────────── */}
      <View
        style={[
          styles.tabBar,
          { backgroundColor: activeTab === 'patient' ? '#5A9DC8' : '#E8EDF3' },
        ]}
      >
        <TouchableOpacity
          style={[styles.tabPill, activeTab === 'patient' && styles.tabPillActive]}
          onPress={() => setActiveTab('patient')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.tabPillText,
              activeTab === 'patient' && styles.tabPillTextActive,
            ]}
          >
            My Results
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabPill, activeTab === 'provider' && styles.tabPillActiveProvider]}
          onPress={() => setActiveTab('provider')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.tabPillText,
              activeTab === 'provider' && styles.tabPillTextActiveProvider,
            ]}
          >
            Provider View
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Views ────────────────────────────────────────────────────────── */}
      {activeTab === 'patient' ? (
        <PatientView
          correctCount={correctCount}
          totalCount={totalCount}
          percentage={percentage}
          coinsEarned={coinsEarned}
          categoryChips={categoryChips}
          encouragingMessage={encouragingMessage}
          coinBounce={coinBounce}
          onDone={onDone}
          onSwitchToProvider={() => setActiveTab('provider')}
        />
      ) : (
        <ProviderView
          correctCount={correctCount}
          totalCount={totalCount}
          percentage={percentage}
          nurseNotes={nurseNotes}
          setNurseNotes={setNurseNotes}
          engagementRating={engagementRating}
          setEngagementRating={setEngagementRating}
          caregiverPresent={caregiverPresent}
          setCaregiverPresent={setCaregiverPresent}
          isGenerating={isGenerating}
          reportText={reportText}
          reportGenerated={reportGenerated}
          onGenerateReport={handleGenerateReport}
          onShare={handleShare}
          onBackToPatient={() => setActiveTab('patient')}
        />
      )}
    </View>
  );
}

// ===========================================================================
// Patient View
// ===========================================================================

interface PatientViewProps {
  correctCount: number;
  totalCount: number;
  percentage: number;
  coinsEarned: number;
  categoryChips: CategoryChip[];
  encouragingMessage: string;
  coinBounce: Animated.Value;
  onDone: () => void;
  onSwitchToProvider: () => void;
}

function PatientView({
  correctCount,
  totalCount,
  percentage,
  coinsEarned,
  categoryChips,
  encouragingMessage,
  coinBounce,
  onDone,
  onSwitchToProvider,
}: PatientViewProps) {
  return (
    <ScrollView
      style={styles.patientScroll}
      contentContainerStyle={styles.patientScrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Score display ──────────────────────────────────────────────── */}
      <View style={styles.scoreCard}>
        <Text style={styles.scoreFraction}>
          {correctCount} / {totalCount}
        </Text>
        <Text style={styles.scorePercent}>{percentage}%</Text>
      </View>

      {/* ── Coin banner ───────────────────────────────────────────────── */}
      <Animated.View
        style={[styles.coinBanner, { transform: [{ translateY: coinBounce }] }]}
      >
        <Text style={styles.coinBannerText}>🪙 +{coinsEarned} coins earned!</Text>
      </Animated.View>

      {/* ── Encouraging message ───────────────────────────────────────── */}
      <View style={styles.encourageCard}>
        <Text style={styles.encourageText}>{encouragingMessage}</Text>
      </View>

      {/* ── Category chips ────────────────────────────────────────────── */}
      <View style={styles.chipsSection}>
        <Text style={styles.chipsSectionLabel}>Topic Breakdown</Text>
        <View style={styles.chipsRow}>
          {categoryChips.map((chip) => (
            <View
              key={chip.key}
              style={[
                styles.chip,
                !chip.asked && styles.chipNeutral,
                chip.asked && chip.correct && styles.chipCorrect,
                chip.asked && !chip.correct && styles.chipMissed,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  chip.asked && chip.correct && styles.chipTextCorrect,
                  chip.asked && !chip.correct && styles.chipTextMissed,
                ]}
              >
                {chip.label}
              </Text>
            </View>
          ))}
        </View>
        {/* Legend */}
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: '#27AE60' }]} />
          <Text style={styles.legendText}>All correct</Text>
          <View style={[styles.legendDot, { backgroundColor: '#E74C3C', marginLeft: 14 }]} />
          <Text style={styles.legendText}>Needs review</Text>
        </View>
      </View>

      {/* ── Done button ───────────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.doneButton}
        onPress={onDone}
        activeOpacity={0.8}
      >
        <Text style={styles.doneButtonText}>Done</Text>
      </TouchableOpacity>

      {/* ── Provider View link ────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.providerLink}
        onPress={onSwitchToProvider}
        activeOpacity={0.7}
      >
        <Text style={styles.providerLinkText}>Provider View →</Text>
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

// ===========================================================================
// Provider View
// ===========================================================================

interface ProviderViewProps {
  correctCount: number;
  totalCount: number;
  percentage: number;
  nurseNotes: string;
  setNurseNotes: (v: string) => void;
  engagementRating: EngagementRating | null;
  setEngagementRating: (v: EngagementRating) => void;
  caregiverPresent: boolean;
  setCaregiverPresent: (v: boolean) => void;
  isGenerating: boolean;
  reportText: string | null;
  reportGenerated: boolean;
  onGenerateReport: () => void;
  onShare: () => void;
  onBackToPatient: () => void;
}

function ProviderView({
  correctCount,
  totalCount,
  percentage,
  nurseNotes,
  setNurseNotes,
  engagementRating,
  setEngagementRating,
  caregiverPresent,
  setCaregiverPresent,
  isGenerating,
  reportText,
  reportGenerated,
  onGenerateReport,
  onShare,
  onBackToPatient,
}: ProviderViewProps) {
  const ENGAGEMENT_OPTIONS: { value: EngagementRating; label: string }[] = [
    { value: 'yes', label: 'Yes' },
    { value: 'somewhat', label: 'Somewhat' },
    { value: 'no', label: 'No' },
  ];

  return (
    <ScrollView
      style={styles.providerScroll}
      contentContainerStyle={styles.providerScrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Back button ───────────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={onBackToPatient}
        activeOpacity={0.7}
      >
        <Text style={styles.backButtonText}>← Back to Patient View</Text>
      </TouchableOpacity>

      {/* ── Header ────────────────────────────────────────────────────── */}
      <Text style={styles.providerHeader}>Session Report</Text>

      {/* ── Score summary ─────────────────────────────────────────────── */}
      <View style={styles.providerScoreRow}>
        <Text style={styles.providerScoreLabel}>Session Score</Text>
        <Text style={styles.providerScoreValue}>
          {correctCount} / {totalCount} ({percentage}%)
        </Text>
      </View>

      {/* ── Divider ───────────────────────────────────────────────────── */}
      <View style={styles.divider} />

      {/* ── Nurse input section ───────────────────────────────────────── */}
      <View style={styles.providerSection}>
        <Text style={styles.inputLabel}>Nurse/Pharmacist Notes (optional)</Text>
        <TextInput
          style={styles.notesInput}
          value={nurseNotes}
          onChangeText={setNurseNotes}
          placeholder="Add any clinical observations..."
          placeholderTextColor="#AAB4C0"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          returnKeyType="default"
        />

        {/* ── Engagement toggles ──────────────────────────────────────── */}
        <Text style={[styles.inputLabel, { marginTop: 18 }]}>
          Was the patient engaged?
        </Text>
        <View style={styles.engagementRow}>
          {ENGAGEMENT_OPTIONS.map(({ value, label }) => (
            <TouchableOpacity
              key={value}
              style={[
                styles.engagementButton,
                engagementRating === value && styles.engagementButtonActive,
              ]}
              onPress={() => setEngagementRating(value)}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.engagementButtonText,
                  engagementRating === value && styles.engagementButtonTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Caregiver switch ────────────────────────────────────────── */}
        <Text style={[styles.inputLabel, { marginTop: 18 }]}>
          Caregiver present?
        </Text>
        <View style={styles.switchRow}>
          <Switch
            value={caregiverPresent}
            onValueChange={setCaregiverPresent}
            trackColor={{ false: '#DDE3EC', true: '#2E6DA4' }}
            thumbColor={caregiverPresent ? '#fff' : '#f4f3f4'}
          />
          <Text style={styles.switchLabel}>
            {caregiverPresent ? 'Yes, caregiver was present' : 'No, patient was alone'}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* ── Generate button ───────────────────────────────────────────── */}
      <TouchableOpacity
        style={[
          styles.generateButton,
          (isGenerating || reportGenerated) && styles.generateButtonDisabled,
        ]}
        onPress={onGenerateReport}
        disabled={isGenerating || reportGenerated}
        activeOpacity={0.8}
      >
        <Text style={styles.generateButtonText}>
          {isGenerating
            ? 'Generating...'
            : reportGenerated
            ? '✓ Report Generated'
            : 'Generate Report'}
        </Text>
      </TouchableOpacity>

      {/* ── Report output ─────────────────────────────────────────────── */}
      {reportText !== null && (
        <View style={styles.reportBox}>
          <Text style={styles.reportBoxLabel}>Session Report</Text>
          <ScrollView
            style={styles.reportScroll}
            nestedScrollEnabled
            showsVerticalScrollIndicator
          >
            <Text style={styles.reportText}>{reportText}</Text>
          </ScrollView>
        </View>
      )}

      {/* ── Share button ──────────────────────────────────────────────── */}
      {reportGenerated && reportText !== null && (
        <TouchableOpacity
          style={styles.shareButton}
          onPress={onShare}
          activeOpacity={0.8}
        >
          <Text style={styles.shareButtonText}>Share Report</Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ===========================================================================
// Styles
// ===========================================================================

const styles = StyleSheet.create({
  // ── Root ───────────────────────────────────────────────────────────────────
  root: {
    flex: 1,
    backgroundColor: '#7CB5DD',
  },

  // ── Tab bar ────────────────────────────────────────────────────────────────
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 10,
  },
  tabPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  tabPillActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  tabPillActiveProvider: {
    backgroundColor: '#2E6DA4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  tabPillText: {
    fontFamily: 'pixelRegular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
  },
  tabPillTextActive: {
    color: '#2E6DA4',
  },
  tabPillTextActiveProvider: {
    color: '#fff',
  },

  // =========================================================================
  // PATIENT VIEW
  // =========================================================================

  patientScroll: {
    flex: 1,
    backgroundColor: '#7CB5DD',
  },
  patientScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },

  // ── Score card ─────────────────────────────────────────────────────────────
  scoreCard: {
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreFraction: {
    fontFamily: 'pixelRegular',
    fontSize: 56,
    color: '#fff',
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 4,
  },
  scorePercent: {
    fontFamily: 'pixelRegular',
    fontSize: 28,
    color: 'rgba(255,255,255,0.88)',
    marginTop: -4,
    letterSpacing: 1,
  },

  // ── Coin banner ────────────────────────────────────────────────────────────
  coinBanner: {
    backgroundColor: '#FFC832',
    borderRadius: 50,
    paddingHorizontal: 22,
    paddingVertical: 10,
    marginBottom: 18,
    shadowColor: '#C89000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 5,
  },
  coinBannerText: {
    fontFamily: 'pixelRegular',
    fontSize: 18,
    color: '#5C3800',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },

  // ── Encouraging message ────────────────────────────────────────────────────
  encourageCard: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginBottom: 22,
    alignItems: 'center',
    width: '100%',
  },
  encourageText: {
    fontFamily: 'pixelRegular',
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 24,
  },

  // ── Category chips ─────────────────────────────────────────────────────────
  chipsSection: {
    width: '100%',
    marginBottom: 28,
  },
  chipsSectionLabel: {
    fontFamily: 'pixelRegular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  chipNeutral: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  chipCorrect: {
    backgroundColor: '#27AE60',
  },
  chipMissed: {
    backgroundColor: '#E74C3C',
  },
  chipText: {
    fontFamily: 'pixelRegular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  chipTextCorrect: {
    color: '#fff',
    fontWeight: '600',
  },
  chipTextMissed: {
    color: '#fff',
    fontWeight: '600',
  },

  // ── Legend ─────────────────────────────────────────────────────────────────
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 5,
  },
  legendText: {
    fontFamily: 'pixelRegular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
  },

  // ── Done button ────────────────────────────────────────────────────────────
  doneButton: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 60,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 5,
    marginBottom: 18,
  },
  doneButtonText: {
    fontFamily: 'pixelRegular',
    fontSize: 18,
    color: '#2E6DA4',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },

  // ── Provider link ──────────────────────────────────────────────────────────
  providerLink: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  providerLinkText: {
    fontFamily: 'pixelRegular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    textDecorationLine: 'underline',
  },

  // =========================================================================
  // PROVIDER VIEW
  // =========================================================================

  providerScroll: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  providerScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 24,
  },

  // ── Back button ────────────────────────────────────────────────────────────
  backButton: {
    marginBottom: 12,
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  backButtonText: {
    fontFamily: 'pixelRegular',
    fontSize: 13,
    color: '#2E6DA4',
    fontWeight: '600',
  },

  // ── Provider header ────────────────────────────────────────────────────────
  providerHeader: {
    fontFamily: 'pixelRegular',
    fontSize: 22,
    color: '#1A2A3A',
    fontWeight: 'bold',
    marginBottom: 14,
    letterSpacing: 0.3,
  },

  // ── Score row ──────────────────────────────────────────────────────────────
  providerScoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#DDE3EC',
    marginBottom: 16,
  },
  providerScoreLabel: {
    fontFamily: 'pixelRegular',
    fontSize: 14,
    color: '#555',
  },
  providerScoreValue: {
    fontFamily: 'pixelRegular',
    fontSize: 16,
    color: '#1A2A3A',
    fontWeight: 'bold',
  },

  // ── Divider ────────────────────────────────────────────────────────────────
  divider: {
    height: 1,
    backgroundColor: '#DDE3EC',
    marginVertical: 16,
  },

  // ── Input section ──────────────────────────────────────────────────────────
  providerSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DDE3EC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },

  inputLabel: {
    fontFamily: 'pixelRegular',
    fontSize: 13,
    color: '#333',
    fontWeight: 'bold',
    marginBottom: 8,
  },

  notesInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#DDE3EC',
    borderRadius: 8,
    padding: 10,
    fontFamily: 'pixelRegular',
    fontSize: 14,
    color: '#222',
    minHeight: 90,
    textAlignVertical: 'top',
  },

  // ── Engagement buttons ─────────────────────────────────────────────────────
  engagementRow: {
    flexDirection: 'row',
    gap: 10,
  },
  engagementButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#DDE3EC',
    backgroundColor: '#F8F9FA',
  },
  engagementButtonActive: {
    backgroundColor: '#2E6DA4',
    borderColor: '#2E6DA4',
  },
  engagementButtonText: {
    fontFamily: 'pixelRegular',
    fontSize: 14,
    color: '#555',
    fontWeight: '600',
  },
  engagementButtonTextActive: {
    color: '#fff',
  },

  // ── Switch row ─────────────────────────────────────────────────────────────
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  switchLabel: {
    fontFamily: 'pixelRegular',
    fontSize: 14,
    color: '#444',
    flex: 1,
  },

  // ── Generate button ────────────────────────────────────────────────────────
  generateButton: {
    backgroundColor: '#2E6DA4',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
    marginBottom: 18,
  },
  generateButtonDisabled: {
    backgroundColor: '#7BA8C8',
    shadowOpacity: 0,
    elevation: 0,
  },
  generateButtonText: {
    fontFamily: 'pixelRegular',
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
    letterSpacing: 0.4,
  },

  // ── Report box ─────────────────────────────────────────────────────────────
  reportBox: {
    backgroundColor: '#F1F3F5',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DDE3EC',
  },
  reportBoxLabel: {
    fontFamily: 'pixelRegular',
    fontSize: 11,
    color: '#888',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  reportScroll: {
    maxHeight: 280,
  },
  reportText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#333',
    lineHeight: 18,
  },

  // ── Share button ───────────────────────────────────────────────────────────
  shareButton: {
    backgroundColor: '#27AE60',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  shareButtonText: {
    fontFamily: 'pixelRegular',
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
    letterSpacing: 0.4,
  },
});
