import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { QuestionRow, recordAttempt } from '../QuizEngine';

interface MedDashboardGameProps {
  userId: number;
  sessionId: number;
  questions: QuestionRow[];
  onSessionComplete: (correctCount: number, totalCount: number) => void;
}

// ─── Explanation Logic ────────────────────────────────────────────────────────

function getExplanation(category: string): string {
  const key = (category ?? '').toLowerCase().trim();
  if (key.includes('tacrolimus')) {
    return 'Tacrolimus (Prograf) requires regular blood level monitoring and dose adjustments to maintain therapeutic range and prevent rejection or toxicity.';
  }
  if (key.includes('mycophenolate')) {
    return 'Mycophenolate mofetil (Cellcept) is an immunosuppressant that requires consistent dosing and prompt communication with your care team if side effects occur.';
  }
  if (key.includes('immunosuppression')) {
    return 'Immunosuppressants weaken the immune system to prevent rejection — maintaining this balance is critical for graft survival.';
  }
  if (key.includes('steroid')) {
    return 'Corticosteroids like prednisone have significant side effects with long-term use and require gradual tapering under medical supervision.';
  }
  if (key.includes('infection_prophylaxis') || key.includes('infection prophylaxis')) {
    return 'Infection prophylaxis medications protect immunocompromised patients from opportunistic infections that a healthy immune system would normally control.';
  }
  if (key.includes('adherence')) {
    return 'Strict medication adherence is directly linked to long-term graft survival and reduced risk of rejection episodes.';
  }
  return 'Understanding your medication regimen is essential for maintaining long-term transplant health and preventing complications.';
}

// ─── Checkmark Icon (inline SVG-style via Unicode + styling) ─────────────────

function CheckIcon({ color }: { color: string }) {
  return (
    <View style={[styles.checkIconContainer, { borderColor: color, backgroundColor: color }]}>
      <Text style={styles.checkIconText}>✓</Text>
    </View>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const targetWidth = total > 0 ? current / total : 0;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: targetWidth,
      duration: 350,
      useNativeDriver: false,
    }).start();
  }, [current, total]);

  return (
    <View style={styles.progressBarTrack}>
      <Animated.View
        style={[
          styles.progressBarFill,
          {
            width: progressAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />
    </View>
  );
}

// ─── Explanation Panel ────────────────────────────────────────────────────────

function ExplanationPanel({
  category,
  visible,
}: {
  category: string;
  visible: boolean;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-8)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(-8);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.explanationBox,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <Text style={styles.explanationText}>{getExplanation(category)}</Text>
    </Animated.View>
  );
}

// ─── Answer Option Card ───────────────────────────────────────────────────────

interface AnswerCardProps {
  option: string;
  index: number;
  selectedAnswer: string | null;
  correctAnswer: string;
  hasAnswered: boolean;
  onSelect: (answer: string) => void;
}

function AnswerCard({
  option,
  index,
  selectedAnswer,
  correctAnswer,
  hasAnswered,
  onSelect,
}: AnswerCardProps) {
  const isSelected = selectedAnswer === option;
  const isCorrect = option === correctAnswer;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    if (hasAnswered) return;
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.97,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
    onSelect(option);
  };

  let cardStyle = styles.answerCardBase;
  let borderColor = '#DDE3EC';
  let backgroundColor = '#FFFFFF';
  let labelColor = '#1A2B3C';

  if (hasAnswered) {
    if (isCorrect) {
      borderColor = '#27AE60';
      backgroundColor = '#EAFAF1';
      labelColor = '#1E8449';
    } else if (isSelected && !isCorrect) {
      borderColor = '#E74C3C';
      backgroundColor = '#FDEDEC';
      labelColor = '#C0392B';
    }
  } else if (isSelected) {
    borderColor = '#2E6DA4';
    backgroundColor = '#EBF4FF';
    labelColor = '#1A2B3C';
  }

  const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];
  const letter = optionLetters[index] ?? String(index + 1);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        activeOpacity={hasAnswered ? 1 : 0.85}
        onPress={handlePress}
        style={[
          styles.answerCardBase,
          { borderColor, backgroundColor },
        ]}
        accessibilityRole="radio"
        accessibilityState={{ selected: isSelected }}
        accessibilityLabel={`Option ${letter}: ${option}`}
      >
        <View style={styles.answerCardInner}>
          <View style={[styles.optionBadge, { borderColor }]}>
            <Text style={[styles.optionBadgeText, { color: borderColor }]}>{letter}</Text>
          </View>
          <Text style={[styles.answerText, { color: labelColor }]}>{option}</Text>
          {hasAnswered && isCorrect && (
            <CheckIcon color="#27AE60" />
          )}
          {hasAnswered && isSelected && !isCorrect && (
            <View style={[styles.checkIconContainer, { borderColor: '#E74C3C', backgroundColor: '#E74C3C' }]}>
              <Text style={styles.checkIconText}>✕</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Results Screen ───────────────────────────────────────────────────────────

function ResultsScreen({
  correctCount,
  total,
}: {
  correctCount: number;
  total: number;
}) {
  const percent = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  let performanceLabel = 'Needs Review';
  let performanceColor = '#E74C3C';
  if (percent >= 90) {
    performanceLabel = 'Excellent';
    performanceColor = '#27AE60';
  } else if (percent >= 70) {
    performanceLabel = 'Good';
    performanceColor = '#2E6DA4';
  } else if (percent >= 50) {
    performanceLabel = 'Fair';
    performanceColor = '#F39C12';
  }

  return (
    <Animated.View style={[styles.resultsContainer, { opacity: fadeAnim }]}>
      <View style={styles.resultsCard}>
        <Text style={styles.resultsTitle}>Assessment Complete</Text>
        <View style={styles.resultsDivider} />

        <View style={styles.scoreCircleWrapper}>
          <View style={styles.scoreCircle}>
            <Text style={styles.scorePercent}>{percent}%</Text>
            <Text style={styles.scoreLabel}>Score</Text>
          </View>
        </View>

        <View style={styles.resultsStatsRow}>
          <View style={styles.resultsStat}>
            <Text style={styles.resultsStatValue}>{correctCount}</Text>
            <Text style={styles.resultsStatLabel}>Correct</Text>
          </View>
          <View style={styles.resultsStatDivider} />
          <View style={styles.resultsStat}>
            <Text style={styles.resultsStatValue}>{total - correctCount}</Text>
            <Text style={styles.resultsStatLabel}>Incorrect</Text>
          </View>
          <View style={styles.resultsStatDivider} />
          <View style={styles.resultsStat}>
            <Text style={styles.resultsStatValue}>{total}</Text>
            <Text style={styles.resultsStatLabel}>Total</Text>
          </View>
        </View>

        <View style={[styles.performanceBadge, { backgroundColor: performanceColor + '18', borderColor: performanceColor }]}>
          <Text style={[styles.performanceBadgeText, { color: performanceColor }]}>
            {performanceLabel}
          </Text>
        </View>

        <Text style={styles.resultsFootnote}>
          Review any flagged items with your care team.
        </Text>
      </View>
    </Animated.View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MedDashboardGame({
  userId,
  sessionId,
  questions,
  onSessionComplete,
}: MedDashboardGameProps) {
  const sqliteDb = useSQLiteContext();
  const db = drizzle(sqliteDb);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);

  const cardFadeAnim = useRef(new Animated.Value(1)).current;
  const scrollRef = useRef<ScrollView>(null);

  const question: QuestionRow | undefined = questions[currentIndex];
  const total = questions.length;

  const handleSelectAnswer = async (answer: string) => {
    if (hasAnswered || !question) return;

    setSelectedAnswer(answer);
    setHasAnswered(true);

    const isCorrect = answer === question.correctAnswer;
    if (isCorrect) {
      setCorrectCount((prev) => prev + 1);
    }

    try {
      await recordAttempt(db, userId, sessionId, question.id, answer, isCorrect);
    } catch (err) {
      // Non-blocking — UI continues regardless of DB write outcome
      console.warn('[MedDashboardGame] recordAttempt failed:', err);
    }

    // Scroll to top of card after answering so explanation is visible
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }, 100);
  };

  const handleContinue = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= total) {
      // Animate out then show results
      Animated.timing(cardFadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setSessionDone(true);
        onSessionComplete(
          correctCount + (selectedAnswer === question?.correctAnswer ? 0 : 0),
          total,
        );
      });
    } else {
      // Crossfade to next question
      Animated.timing(cardFadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(() => {
        setCurrentIndex(nextIndex);
        setSelectedAnswer(null);
        setHasAnswered(false);
        setShowExplanation(false);
        scrollRef.current?.scrollTo({ y: 0, animated: false });
        Animated.timing(cardFadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }).start();
      });
    }
  };

  // ── Session complete: compute correct count properly ──────────────────────
  // correctCount state lags by one update when last question is answered,
  // so we pass the accumulated count to onSessionComplete via the state snapshot.
  // The +1 is already applied inside handleSelectAnswer before handleContinue is called.

  if (sessionDone) {
    return (
      <View style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Medication Knowledge Assessment</Text>
        </View>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <ResultsScreen correctCount={correctCount} total={total} />
        </ScrollView>
      </View>
    );
  }

  if (!question) {
    return (
      <View style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Medication Knowledge Assessment</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No questions available for this session.</Text>
        </View>
      </View>
    );
  }

  const options: string[] = Array.isArray(question.options)
    ? question.options
    : JSON.parse(question.options as unknown as string);

  const categoryRaw: string = question.category ?? 'General';
  // Format category display label
  const categoryDisplay = categoryRaw
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <View style={styles.root}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Medication Knowledge Assessment</Text>
        <View style={styles.categoryChip}>
          <Text style={styles.categoryChipText}>{categoryDisplay}</Text>
        </View>
      </View>

      {/* ── Progress ── */}
      <View style={styles.progressSection}>
        <View style={styles.progressLabelRow}>
          <Text style={styles.progressLabel}>
            Question {currentIndex + 1} of {total}
          </Text>
          <Text style={styles.progressPercent}>
            {Math.round(((currentIndex) / total) * 100)}%
          </Text>
        </View>
        <ProgressBar current={currentIndex} total={total} />
      </View>

      {/* ── Scrollable content ── */}
      <ScrollView
        ref={scrollRef}
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={{ opacity: cardFadeAnim }}>
          {/* Question Card */}
          <View style={styles.questionCard}>
            <Text style={styles.questionText}>{question.questionText}</Text>
          </View>

          {/* Answer Options */}
          <View style={styles.optionsList}>
            {options.map((option, index) => (
              <AnswerCard
                key={`option-${index}`}
                option={option}
                index={index}
                selectedAnswer={selectedAnswer}
                correctAnswer={question.correctAnswer}
                hasAnswered={hasAnswered}
                onSelect={handleSelectAnswer}
              />
            ))}
          </View>

          {/* Post-Answer: result label + explanation + continue */}
          {hasAnswered && (
            <View style={styles.feedbackSection}>
              {/* Correct / Incorrect label */}
              <View style={styles.resultLabelRow}>
                {selectedAnswer === question.correctAnswer ? (
                  <View style={[styles.resultLabel, styles.resultLabelCorrect]}>
                    <Text style={styles.resultLabelTextCorrect}>✓  Correct</Text>
                  </View>
                ) : (
                  <View style={[styles.resultLabel, styles.resultLabelWrong]}>
                    <Text style={styles.resultLabelTextWrong}>✕  Incorrect</Text>
                  </View>
                )}
              </View>

              {/* Explanation toggle */}
              <TouchableOpacity
                onPress={() => setShowExplanation((prev) => !prev)}
                style={styles.explanationToggle}
                accessibilityRole="button"
                accessibilityLabel={
                  showExplanation ? 'Hide explanation' : 'Show explanation'
                }
              >
                <Text style={styles.explanationToggleText}>
                  {showExplanation ? 'Hide Explanation ▴' : 'Show Explanation ▾'}
                </Text>
              </TouchableOpacity>

              <ExplanationPanel
                category={categoryRaw}
                visible={showExplanation}
              />

              {/* Continue button */}
              <TouchableOpacity
                style={styles.continueButton}
                onPress={handleContinue}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={
                  currentIndex + 1 >= total ? 'Finish assessment' : 'Continue to next question'
                }
              >
                <Text style={styles.continueButtonText}>
                  {currentIndex + 1 >= total ? 'Finish Assessment' : 'Continue  →'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Bottom padding */}
          <View style={{ height: 32 }} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },

  // ── Header ──
  header: {
    backgroundColor: '#2E6DA4',
    paddingTop: 52,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  categoryChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8F4FD',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  categoryChipText: {
    color: '#2E6DA4',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // ── Progress ──
  progressSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F6',
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    color: '#6B7A99',
    fontWeight: '500',
  },
  progressPercent: {
    fontSize: 12,
    color: '#2E6DA4',
    fontWeight: '600',
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: '#DDE3EC',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 4,
    backgroundColor: '#2E6DA4',
    borderRadius: 2,
  },

  // ── Scroll ──
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },

  // ── Question Card ──
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#1A2B3C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  questionText: {
    fontSize: 17,
    lineHeight: 26,
    color: '#1A2B3C',
    fontWeight: '500',
  },

  // ── Options ──
  optionsList: {
    gap: 10,
    marginBottom: 4,
  },
  answerCardBase: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#DDE3EC',
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
  },
  answerCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: '#DDE3EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  optionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DDE3EC',
  },
  answerText: {
    fontSize: 15,
    color: '#1A2B3C',
    flex: 1,
    lineHeight: 21,
  },
  checkIconContainer: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    flexShrink: 0,
  },
  checkIconText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
  },

  // ── Feedback Section ──
  feedbackSection: {
    marginTop: 8,
  },
  resultLabelRow: {
    marginBottom: 12,
  },
  resultLabel: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  resultLabelCorrect: {
    backgroundColor: '#EAFAF1',
    borderWidth: 1,
    borderColor: '#27AE60',
  },
  resultLabelWrong: {
    backgroundColor: '#FDEDEC',
    borderWidth: 1,
    borderColor: '#E74C3C',
  },
  resultLabelTextCorrect: {
    color: '#1E8449',
    fontSize: 13,
    fontWeight: '700',
  },
  resultLabelTextWrong: {
    color: '#C0392B',
    fontSize: 13,
    fontWeight: '700',
  },

  // ── Explanation ──
  explanationToggle: {
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  explanationToggleText: {
    color: '#2E6DA4',
    fontSize: 13,
    fontWeight: '600',
  },
  explanationBox: {
    backgroundColor: '#F0F8FF',
    borderLeftWidth: 3,
    borderLeftColor: '#2E6DA4',
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
  },
  explanationText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#444444',
  },

  // ── Continue Button ──
  continueButton: {
    backgroundColor: '#2E6DA4',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#2E6DA4',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // ── Results ──
  resultsContainer: {
    paddingBottom: 32,
  },
  resultsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,
    shadowColor: '#1A2B3C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    alignItems: 'center',
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A2B3C',
    marginBottom: 16,
    letterSpacing: 0.2,
  },
  resultsDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#EEF1F6',
    marginBottom: 24,
  },
  scoreCircleWrapper: {
    marginBottom: 28,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#2E6DA4',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F8FF',
  },
  scorePercent: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2E6DA4',
    lineHeight: 38,
  },
  scoreLabel: {
    fontSize: 12,
    color: '#6B7A99',
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  resultsStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
    justifyContent: 'center',
  },
  resultsStat: {
    alignItems: 'center',
    flex: 1,
  },
  resultsStatDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#DDE3EC',
  },
  resultsStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A2B3C',
    lineHeight: 30,
  },
  resultsStatLabel: {
    fontSize: 11,
    color: '#6B7A99',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  performanceBadge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginBottom: 20,
  },
  performanceBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  resultsFootnote: {
    fontSize: 12,
    color: '#8896AA',
    textAlign: 'center',
    lineHeight: 18,
  },

  // ── Empty state ──
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 15,
    color: '#6B7A99',
    textAlign: 'center',
    lineHeight: 22,
  },
});
