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
import {
  getSessionSummary,
  finalizeSession,
  type QuizAgeGroup,
} from '@/db/quizEngine';
import { generateReport, saveReport } from '@/db/reportGenerator';
import {
  getSessionCategoryChips,
  type CategoryChip,
} from '@/db/sessionSummaryService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SessionSummaryProps {
  userId: number;
  sessionId: number;
  ageGroup: QuizAgeGroup;
  correctCount: number;
  totalCount: number;
  coinsEarned: number;
  onDone: () => void;
}

type EngagementRating = 'yes' | 'somewhat' | 'no';

function getEncouragingMessage(percent: number): string {
  if (percent >= 80) return "Outstanding! You're a transplant medication expert! 🎉";
  if (percent >= 60) return 'Great work! Keep practicing those tricky ones. 💪';
  return 'Good effort! Review these topics with your care team. 📚';
}

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
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<'patient' | 'provider'>('patient');
  const [categoryChips, setCategoryChips] = useState<CategoryChip[]>([]);
  const [nurseNotes, setNurseNotes] = useState('');
  const [engagementRating, setEngagementRating] = useState<EngagementRating | null>(null);
  const [caregiverPresent, setCaregiverPresent] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportText, setReportText] = useState<string | null>(null);
  const [reportGenerated, setReportGenerated] = useState(false);

  const coinBounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(coinBounce, {
        toValue: -8,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(coinBounce, {
        toValue: 0,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();
  }, [coinBounce]);

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      try {
        const chips = await getSessionCategoryChips(db, sessionId);
        if (!cancelled) {
          setCategoryChips(chips);
        }
      } catch (err) {
        console.error('SessionSummary: failed to load category chips', err);
      }
    }

    loadCategories();

    return () => {
      cancelled = true;
    };
  }, [db, sessionId]);

  const percentage =
    totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

  const encouragingMessage = getEncouragingMessage(percentage);

  const handleGenerateReport = useCallback(async () => {
    if (isGenerating) return;

    setIsGenerating(true);

    try {
      const summary = await getSessionSummary(db, sessionId, userId);

      const previousSession = summary.previousSession;
      const previousScore =
        previousSession &&
        previousSession.totalQuestions &&
        previousSession.totalQuestions > 0
          ? Math.round(
              ((previousSession.correctCount ?? 0) / previousSession.totalQuestions) * 100
            )
          : null;

      const previousSessionDate = previousSession?.completedAt ?? null;

      const reportInput = {
        ageGroup,
        totalQuestions: totalCount,
        correctCount,
        previousScore,
        previousSessionDate,
        attempts: summary.attempts.map((attempt) => ({
          question: attempt.question,
          isCorrect: !!attempt.isCorrect,
        })),
        nurseNotes: nurseNotes.trim() || undefined,
        nurseEngagementRating: engagementRating ?? undefined,
        caregiverPresent,
        sessionDate: summary.session.startedAt,
      };

      const text = generateReport(reportInput);

      await saveReport(db, sessionId, text);

      await finalizeSession(
        db,
        sessionId,
        correctCount,
        nurseNotes.trim() || undefined,
        engagementRating ?? undefined,
        caregiverPresent
      );

      setReportText(text);
      setReportGenerated(true);
    } catch (err) {
      console.error('SessionSummary: failed to generate report', err);
      Alert.alert('Error', 'Failed to generate the report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [
    ageGroup,
    caregiverPresent,
    correctCount,
    db,
    engagementRating,
    isGenerating,
    nurseNotes,
    sessionId,
    totalCount,
    userId,
  ]);

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

  return (
    <View style={[styles.root, { paddingTop: insets.top || 16 }]}>
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
          style={[
            styles.tabPill,
            activeTab === 'provider' && styles.tabPillActiveProvider,
          ]}
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
      <View style={styles.scoreCard}>
        <Text style={styles.scoreFraction}>
          {correctCount} / {totalCount}
        </Text>
        <Text style={styles.scorePercent}>{percentage}%</Text>
      </View>

      <Animated.View
        style={[styles.coinBanner, { transform: [{ translateY: coinBounce }] }]}
      >
        <Text style={styles.coinBannerText}>🪙 +{coinsEarned} coins earned!</Text>
      </Animated.View>

      <View style={styles.encourageCard}>
        <Text style={styles.encourageText}>{encouragingMessage}</Text>
      </View>

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

        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: '#27AE60' }]} />
          <Text style={styles.legendText}>All correct</Text>
          <View
            style={[
              styles.legendDot,
              { backgroundColor: '#E74C3C', marginLeft: 14 },
            ]}
          />
          <Text style={styles.legendText}>Needs review</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.doneButton} onPress={onDone} activeOpacity={0.8}>
        <Text style={styles.doneButtonText}>Done</Text>
      </TouchableOpacity>

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

interface ProviderViewProps {
  correctCount: number;
  totalCount: number;
  percentage: number;
  nurseNotes: string;
  setNurseNotes: (value: string) => void;
  engagementRating: EngagementRating | null;
  setEngagementRating: (value: EngagementRating) => void;
  caregiverPresent: boolean;
  setCaregiverPresent: (value: boolean) => void;
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
  const engagementOptions: { value: EngagementRating; label: string }[] = [
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
      <TouchableOpacity
        style={styles.backButton}
        onPress={onBackToPatient}
        activeOpacity={0.7}
      >
        <Text style={styles.backButtonText}>← Back to Patient View</Text>
      </TouchableOpacity>

      <Text style={styles.providerHeader}>Session Report</Text>

      <View style={styles.providerScoreRow}>
        <Text style={styles.providerScoreLabel}>Session Score</Text>
        <Text style={styles.providerScoreValue}>
          {correctCount} / {totalCount} ({percentage}%)
        </Text>
      </View>

      <View style={styles.divider} />

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

        <Text style={[styles.inputLabel, { marginTop: 18 }]}>
          Was the patient engaged?
        </Text>
        <View style={styles.engagementRow}>
          {engagementOptions.map(({ value, label }) => (
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

        <Text style={[styles.inputLabel, { marginTop: 18 }]}>Caregiver present?</Text>
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

      {reportGenerated && reportText !== null && (
        <TouchableOpacity style={styles.shareButton} onPress={onShare} activeOpacity={0.8}>
          <Text style={styles.shareButtonText}>Share Report</Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#7CB5DD',
  },

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

  providerScroll: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  providerScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 24,
  },

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

  providerHeader: {
    fontFamily: 'pixelRegular',
    fontSize: 22,
    color: '#1A2A3A',
    fontWeight: 'bold',
    marginBottom: 14,
    letterSpacing: 0.3,
  },

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

  divider: {
    height: 1,
    backgroundColor: '#DDE3EC',
    marginVertical: 16,
  },

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