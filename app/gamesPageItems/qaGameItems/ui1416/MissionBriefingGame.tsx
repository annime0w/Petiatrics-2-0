// MissionBriefingGame.tsx
// Mission Briefing — Q&A game UI for ages 14–16
// Sleek agent/mission aesthetic: dark navy, blue accent, snappy animations

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from '@/db/schema';
import { QuestionRow, recordAttempt } from '../QuizEngine';

// ─── Colors ───────────────────────────────────────────────────────────────────
const C = {
  bg: '#1A2744',
  card: '#243460',
  accent: '#7CB5DD',
  correct: '#2ECC71',
  wrong: '#E74C3C',
  correctDark: '#1E7A4A',
  wrongDark: '#8B1F1F',
  buttonDefault: '#2E4080',
  white: '#FFFFFF',
  textMuted: '#A0B4CC',
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface MissionBriefingGameProps {
  userId: number;
  sessionId: number;
  questions: QuestionRow[];
  onSessionComplete: (correctCount: number, totalCount: number) => void;
}

type AnswerState = 'idle' | 'correct' | 'wrong';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseOptions(question: QuestionRow): string[] {
  if (question.questionType === 'tf') {
    return ['True', 'False'];
  }
  try {
    const parsed = JSON.parse(question.optionsJson ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function MissionBriefingGame({
  userId,
  sessionId,
  questions,
  onSessionComplete,
}: MissionBriefingGameProps) {
  const sqliteContext = useSQLiteContext();
  const db = useMemo(() => drizzle(sqliteContext, { schema }), [sqliteContext]);

  // ── State ──
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  // ── Animation values ──
  const slideAnim = useRef(new Animated.Value(0)).current;
  // Per-button scale pulse (keyed by option index)
  const buttonScales = useRef<Animated.Value[]>([]);

  const question = questions[currentIndex];
  const options = question ? parseOptions(question) : [];
  const total = questions.length;
  const progress = currentIndex / total;

  // Ensure we have enough button scale values
  useEffect(() => {
    while (buttonScales.current.length < options.length) {
      buttonScales.current.push(new Animated.Value(1));
    }
  }, [options.length]);

  // ── Slide in on mount / question change ──
  const slideIn = useCallback(() => {
    slideAnim.setValue(400); // start off-screen right
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  useEffect(() => {
    slideIn();
    setSelectedAnswer(null);
    setHasAnswered(false);
    // Reset button scales
    buttonScales.current.forEach((s) => s.setValue(1));
  }, [currentIndex, slideIn]);

  // ── Pulse animation on correct button ──
  const pulseButton = useCallback((idx: number) => {
    const scale = buttonScales.current[idx];
    if (!scale) return;
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.07, duration: 100, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
      Animated.timing(scale, { toValue: 1,    duration: 120, useNativeDriver: true, easing: Easing.in(Easing.ease)  }),
    ]).start();
  }, []);

  // ── Handle answer selection ──
  const handleAnswer = useCallback(async (answer: string, optionIndex: number) => {
    if (hasAnswered || !question) return;

    const isCorrect =
      answer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();

    setSelectedAnswer(answer);
    setHasAnswered(true);

    if (isCorrect) {
      setCorrectCount((c) => c + 1);
      pulseButton(optionIndex);
    }

    try {
      await recordAttempt(db, userId, sessionId, question.id, answer, isCorrect);
    } catch (e) {
      // Non-fatal: log and continue
      console.warn('[MissionBriefing] recordAttempt failed:', e);
    }
  }, [hasAnswered, question, db, userId, sessionId, pulseButton]);

  // ── Handle "Next Objective" ──
  const handleNext = useCallback(() => {
    const nextIndex = currentIndex + 1;

    if (nextIndex >= total) {
      // Session complete — correctCount already updated via setCorrectCount
      // We read it via a ref-style callback to avoid stale closure
      setCorrectCount((c) => {
        onSessionComplete(c, total);
        return c;
      });
      return;
    }

    // Slide out left, then advance
    Animated.timing(slideAnim, {
      toValue: -400,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setCurrentIndex(nextIndex);
    });
  }, [currentIndex, total, slideAnim, onSessionComplete]);

  // ── Derive button state ──
  function getButtonStyle(option: string): object[] {
    if (!hasAnswered) return [styles.answerButton];

    const isSelected = option.trim().toLowerCase() === selectedAnswer?.trim().toLowerCase();
    const isCorrectOption = option.trim().toLowerCase() === question?.correctAnswer.trim().toLowerCase();

    if (isCorrectOption) {
      return [styles.answerButton, styles.answerCorrect];
    }
    if (isSelected && !isCorrectOption) {
      return [styles.answerButton, styles.answerWrong];
    }
    return [styles.answerButton, styles.answerDimmed];
  }

  function getButtonTextStyle(option: string): object[] {
    if (!hasAnswered) return [styles.answerText];
    const isCorrectOption = option.trim().toLowerCase() === question?.correctAnswer.trim().toLowerCase();
    if (isCorrectOption) return [styles.answerText, styles.answerTextBold];
    return [styles.answerText];
  }

  function getOptionLabel(option: string): string {
    if (!hasAnswered) return option;
    const isCorrectOption = option.trim().toLowerCase() === question?.correctAnswer.trim().toLowerCase();
    return isCorrectOption ? `✓ ${option}` : option;
  }

  const isTrueFalse = question?.questionType === 'tf';
  const answeredCorrectly =
    hasAnswered &&
    selectedAnswer?.trim().toLowerCase() === question?.correctAnswer.trim().toLowerCase();

  if (!question) return null;

  return (
    <View style={styles.container}>

      {/* ── Progress Bar ── */}
      <View style={styles.progressBarTrack}>
        <Animated.View
          style={[
            styles.progressBarFill,
            { width: `${(currentIndex / total) * 100}%` },
          ]}
        />
      </View>

      {/* ── Objective Counter ── */}
      <Text style={styles.objectiveLabel}>
        OBJECTIVE {currentIndex + 1} OF {total}
      </Text>

      {/* ── Briefing Card ── */}
      <Animated.View
        style={[
          styles.card,
          { transform: [{ translateX: slideAnim }] },
        ]}
      >
        <Text style={styles.questionText}>{question.questionText}</Text>
      </Animated.View>

      {/* ── Answer Options ── */}
      <View style={isTrueFalse ? styles.tfRow : styles.optionsColumn}>
        {options.map((option, idx) => {
          const scale = buttonScales.current[idx] ?? new Animated.Value(1);
          return (
            <Animated.View
              key={`${currentIndex}-${idx}`}
              style={[
                isTrueFalse ? styles.tfButtonWrapper : styles.mcqButtonWrapper,
                { transform: [{ scale }] },
              ]}
            >
              <TouchableOpacity
                style={getButtonStyle(option)}
                onPress={() => handleAnswer(option, idx)}
                activeOpacity={hasAnswered ? 1 : 0.7}
                disabled={hasAnswered}
              >
                <Text style={getButtonTextStyle(option)}>
                  {getOptionLabel(option)}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>

      {/* ── Feedback Banner ── */}
      {hasAnswered && (
        <View style={[
          styles.feedbackBanner,
          answeredCorrectly ? styles.feedbackCorrect : styles.feedbackWrong,
        ]}>
          <Text style={styles.feedbackText}>
            {answeredCorrectly
              ? 'Mission Objective Complete ✓'
              : 'Incorrect — review this one'}
          </Text>
        </View>
      )}

      {/* ── Next Button ── */}
      {hasAnswered && (
        <TouchableOpacity style={styles.nextButton} onPress={handleNext} activeOpacity={0.8}>
          <Text style={styles.nextButtonText}>
            {currentIndex + 1 >= total ? 'Mission Complete →' : 'Next Objective →'}
          </Text>
        </TouchableOpacity>
      )}

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: C.bg,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },

  // Progress bar
  progressBarTrack: {
    height: 3,
    backgroundColor: '#2E4080',
    borderRadius: 2,
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: C.accent,
    borderRadius: 2,
  },

  // Objective label
  objectiveLabel: {
    fontFamily: 'pixelRegular',
    fontSize: 12,
    color: C.accent,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 14,
  },

  // Briefing card
  card: {
    backgroundColor: C.card,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: C.accent,
    paddingVertical: 20,
    paddingHorizontal: 18,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  questionText: {
    fontSize: 17,
    color: C.white,
    lineHeight: 26,
    fontWeight: '400',
  },

  // Option layouts
  optionsColumn: {
    flexDirection: 'column',
    gap: 12,
    marginBottom: 16,
  },
  tfRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 16,
  },
  mcqButtonWrapper: {
    width: '100%',
  },
  tfButtonWrapper: {
    flex: 1,
  },

  // Answer buttons
  answerButton: {
    backgroundColor: C.buttonDefault,
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  answerCorrect: {
    backgroundColor: C.correctDark,
  },
  answerWrong: {
    backgroundColor: C.wrongDark,
  },
  answerDimmed: {
    backgroundColor: '#243060',
    opacity: 0.65,
  },
  answerText: {
    fontSize: 15,
    color: C.white,
    textAlign: 'center',
    fontWeight: '500',
  },
  answerTextBold: {
    fontWeight: '700',
  },

  // Feedback banner
  feedbackBanner: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 18,
    alignItems: 'center',
  },
  feedbackCorrect: {
    backgroundColor: '#1B6040',
  },
  feedbackWrong: {
    backgroundColor: '#6B1A1A',
  },
  feedbackText: {
    fontFamily: 'pixelRegular',
    fontSize: 13,
    color: C.white,
    letterSpacing: 0.5,
  },

  // Next button
  nextButton: {
    backgroundColor: C.accent,
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  nextButtonText: {
    fontFamily: 'pixelRegular',
    fontSize: 15,
    color: C.bg,
    letterSpacing: 1,
  },
});
