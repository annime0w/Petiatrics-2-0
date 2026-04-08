// LabAssistantGame.tsx
// Ages 11–13 | Theme: "Lab Assistant"
// Science-lab vibe with bright blues and purples.
// Primary: #7CB5DD (app blue), Accent: #8B5CF6 (purple)

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { QuestionRow, recordAttempt } from '../QuizEngine';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LabAssistantGameProps {
  userId: number;
  sessionId: number;
  questions: QuestionRow[];
  onSessionComplete: (correctCount: number, totalCount: number) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TILE_COLORS = ['#FFD166', '#06D6A0', '#118AB2', '#EF476F'];
const DARK_TILE_INDICES = [2]; // #118AB2 needs white text

const CORRECT_MESSAGES = [
  '🔬 Correct! You\'re a science star!',
  '⭐ Excellent work, lab assistant!',
  '🧪 That\'s exactly right!',
  '✅ Your kidney is proud of you!',
];

const WRONG_MESSAGES = [
  'Not quite — but you\'ll get it next time!',
  'Almost! Let\'s remember this one.',
  'Good try! Here\'s the right answer:',
];

const MAX_STARS = 12;
const FEEDBACK_DELAY_MS = 1500;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isTrueFalseQuestion(question: QuestionRow): boolean {
  return question.questionType === 'tf';
}

function parseAnswers(question: QuestionRow): string[] {
  // True/False questions have no stored options — synthesize them
  if (question.questionType === 'tf') return ['True', 'False'];
  // MCQ: options stored in optionsJson as a JSON array
  try {
    const parsed = JSON.parse(question.optionsJson ?? '[]');
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // fall through
  }
  return [];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LabAssistantGame({
  userId,
  sessionId,
  questions,
  onSessionComplete,
}: LabAssistantGameProps) {
  const sqliteDb = useSQLiteContext();
  const db = drizzle(sqliteDb);

  // ---- State ----
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [correctMessageIndex, setCorrectMessageIndex] = useState(0);
  const [wrongMessageIndex, setWrongMessageIndex] = useState(0);

  // ---- Animation values ----
  const slideAnim = useRef(new Animated.Value(20)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  // Per-tile opacity for fading non-selected tiles on correct
  const tileOpacities = useRef<Animated.Value[]>([]).current;

  const question = questions[currentIndex] ?? null;
  const answers = question ? parseAnswers(question) : [];
  const isTF = question ? isTrueFalseQuestion(question) : false;

  // Initialize per-tile opacities whenever answer count changes
  if (tileOpacities.length !== answers.length) {
    tileOpacities.length = 0;
    answers.forEach(() => tileOpacities.push(new Animated.Value(1)));
  }

  // ---- Card entrance animation ----
  const animateCardIn = useCallback(() => {
    slideAnim.setValue(20);
    opacityAnim.setValue(0);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, opacityAnim]);

  useEffect(() => {
    // Reset tile opacities and animate card in on question change
    tileOpacities.forEach((v) => v.setValue(1));
    scaleAnim.setValue(1);
    shakeAnim.setValue(0);
    animateCardIn();
  }, [currentIndex, animateCardIn]);

  // ---- Correct answer animation (scale bounce on correct tile) ----
  const animateCorrect = useCallback(
    (correctTileIndex: number) => {
      // Fade all tiles except the correct one
      const fadeOthers = tileOpacities
        .map((opacity, i) => {
          if (i === correctTileIndex) return null;
          return Animated.timing(opacity, {
            toValue: 0.25,
            duration: 300,
            useNativeDriver: true,
          });
        })
        .filter(Boolean) as Animated.CompositeAnimation[];

      Animated.parallel([
        ...fadeOthers,
        Animated.sequence([
          Animated.spring(scaleAnim, {
            toValue: 1.15,
            useNativeDriver: true,
            speed: 20,
            bounciness: 10,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            speed: 20,
            bounciness: 6,
          }),
        ]),
      ]).start();
    },
    [tileOpacities, scaleAnim]
  );

  // ---- Wrong answer animation (shake on wrong tile) ----
  const animateWrong = useCallback(
    (wrongTileIndex: number) => {
      // Fade non-relevant tiles slightly but keep correct and selected visible
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
    },
    [shakeAnim]
  );

  // ---- Handle answer selection ----
  const handleAnswer = useCallback(
    async (answer: string, answerIndex: number) => {
      if (hasAnswered || !question) return;

      const isCorrect =
        answer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();

      setSelectedAnswer(answer);
      setHasAnswered(true);
      setFeedbackVisible(true);

      const correctTileIndex = answers.findIndex(
        (a) => a.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase()
      );

      if (isCorrect) {
        setCorrectCount((prev) => prev + 1);
        setCorrectMessageIndex((prev) => (prev + 1) % CORRECT_MESSAGES.length);
        animateCorrect(correctTileIndex);
      } else {
        setWrongMessageIndex((prev) => (prev + 1) % WRONG_MESSAGES.length);
        animateWrong(answerIndex);
      }

      try {
        await recordAttempt(db, userId, sessionId, question.id, answer, isCorrect);
      } catch (e) {
        // Non-fatal: local UI still advances
        console.warn('[LabAssistantGame] recordAttempt failed:', e);
      }
    },
    [hasAnswered, question, answers, animateCorrect, animateWrong, db, userId, sessionId]
  );

  // ---- Advance to next question ----
  const handleNext = useCallback(() => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= questions.length) {
      onSessionComplete(correctCount, questions.length);
    } else {
      setCurrentIndex(nextIndex);
      setSelectedAnswer(null);
      setHasAnswered(false);
      setFeedbackVisible(false);
    }
  }, [currentIndex, questions.length, correctCount, onSessionComplete]);

  // Auto-advance after 1.5 s when correct
  useEffect(() => {
    if (!hasAnswered) return;
    const isCorrect =
      selectedAnswer?.trim().toLowerCase() ===
      question?.correctAnswer?.trim().toLowerCase();
    if (isCorrect) {
      const timer = setTimeout(handleNext, FEEDBACK_DELAY_MS);
      return () => clearTimeout(timer);
    }
  }, [hasAnswered, selectedAnswer, question, handleNext]);

  // ---- Star row ----
  const starsToShow = Math.min(questions.length, MAX_STARS);
  const filledStars = Math.min(correctCount, starsToShow);

  // ---- Tile helpers ----
  const getTileColor = (index: number) => TILE_COLORS[index % TILE_COLORS.length];
  const getTileTextColor = (index: number) =>
    DARK_TILE_INDICES.includes(index % TILE_COLORS.length) ? '#FFFFFF' : '#1A1A1A';

  const getTileStyle = useCallback(
    (answer: string, index: number): object[] => {
      const base = [styles.tile, { backgroundColor: getTileColor(index) }];
      if (!hasAnswered) return base;

      const isThisCorrect =
        answer.trim().toLowerCase() === question?.correctAnswer?.trim().toLowerCase();
      const isThisSelected = answer === selectedAnswer;

      if (isThisCorrect) {
        return [...base, styles.tileCorrect];
      }
      if (isThisSelected && !isThisCorrect) {
        return [...base, styles.tileWrong];
      }
      return base;
    },
    [hasAnswered, question, selectedAnswer]
  );

  // ---- Render nothing if no questions ----
  if (!question) return null;

  const isAnsweredCorrect =
    hasAnswered &&
    selectedAnswer?.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
  const isAnsweredWrong = hasAnswered && !isAnsweredCorrect;
  const correctTileIndex = answers.findIndex(
    (a) => a.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase()
  );

  return (
    <ScrollView
      style={styles.scrollContainer}
      contentContainerStyle={styles.container}
      bounces={false}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerLabel}>
          EXPERIMENT {currentIndex + 1} OF {questions.length}
        </Text>

        {/* Star row — max 12 */}
        <View style={styles.starRow}>
          {Array.from({ length: starsToShow }).map((_, i) => (
            <Text key={i} style={styles.star}>
              {i < filledStars ? '★' : '☆'}
            </Text>
          ))}
        </View>
      </View>

      {/* ── Lab Data Card ── */}
      <Animated.View
        style={[
          styles.card,
          {
            transform: [{ translateY: slideAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <Text style={styles.cardLabel}>LAB DATA</Text>
        <Text style={styles.questionText}>{question.questionText}</Text>
      </Animated.View>

      {/* ── Answer Tiles ── */}
      <View style={styles.tilesContainer}>
        {isTF ? (
          // True / False layout
          <View style={styles.tfRow}>
            {answers.map((answer, index) => {
              const isTrue = answer.toLowerCase() === 'true';
              const isThisCorrect =
                answer.trim().toLowerCase() ===
                question.correctAnswer.trim().toLowerCase();
              const isThisSelected = answer === selectedAnswer;

              const tileAnim = isThisSelected && isAnsweredWrong
                ? [{ translateX: shakeAnim }]
                : isThisCorrect && isAnsweredCorrect
                ? [{ scale: scaleAnim }]
                : undefined;

              return (
                <Animated.View
                  key={answer}
                  style={[
                    { flex: 1, opacity: tileOpacities[index] ?? 1 },
                    tileAnim ? { transform: tileAnim } : {},
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.tfTile,
                      isTrue ? styles.tfTileTrue : styles.tfTileFalse,
                      hasAnswered && isThisCorrect && styles.tileCorrect,
                      hasAnswered && isThisSelected && !isThisCorrect && styles.tileWrong,
                    ]}
                    onPress={() => handleAnswer(answer, index)}
                    disabled={hasAnswered}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.tfTileText}>
                      {isTrue ? 'TRUE ✓' : 'FALSE ✗'}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        ) : (
          // Multi-choice tiles
          answers.map((answer, index) => {
            const isThisCorrect =
              answer.trim().toLowerCase() ===
              question.correctAnswer.trim().toLowerCase();
            const isThisSelected = answer === selectedAnswer;

            const tileAnim = isThisSelected && isAnsweredWrong
              ? [{ translateX: shakeAnim }]
              : isThisCorrect && hasAnswered
              ? [{ scale: scaleAnim }]
              : undefined;

            return (
              <Animated.View
                key={`${currentIndex}-${index}`}
                style={[
                  { opacity: tileOpacities[index] ?? 1 },
                  tileAnim ? { transform: tileAnim } : {},
                ]}
              >
                <TouchableOpacity
                  style={getTileStyle(answer, index)}
                  onPress={() => handleAnswer(answer, index)}
                  disabled={hasAnswered}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.tileText,
                      { color: getTileTextColor(index) },
                    ]}
                  >
                    {answer}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })
        )}
      </View>

      {/* ── Feedback ── */}
      {feedbackVisible && (
        <View style={styles.feedbackContainer}>
          {isAnsweredCorrect ? (
            <Text style={styles.feedbackCorrect}>
              {CORRECT_MESSAGES[correctMessageIndex % CORRECT_MESSAGES.length]}
            </Text>
          ) : (
            <>
              <Text style={styles.feedbackWrong}>
                {WRONG_MESSAGES[wrongMessageIndex % WRONG_MESSAGES.length]}
              </Text>
              <Text style={styles.feedbackCorrectAnswer}>
                Correct answer: {question.correctAnswer}
              </Text>
              {/* Show "Next Experiment" button only on wrong answers */}
              <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                <Text style={styles.nextButtonText}>Next Experiment →</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#7CB5DD',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    backgroundColor: '#7CB5DD',
  },

  // ── Header ──
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLabel: {
    fontFamily: 'pixelRegular',
    color: '#FFFFFF',
    fontSize: 14,
    letterSpacing: 2,
    marginBottom: 10,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  starRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 2,
  },
  star: {
    fontSize: 22,
    color: '#FFD700',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // ── Lab Data Card ──
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    transform: [{ rotate: '-1deg' }],
    // Shadow
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8B5CF6',
    letterSpacing: 3,
    marginBottom: 10,
    fontFamily: 'pixelRegular',
  },
  questionText: {
    fontSize: 18,
    color: '#1A1A1A',
    lineHeight: 26,
    fontWeight: '500',
  },

  // ── Tiles ──
  tilesContainer: {
    gap: 12,
    marginBottom: 20,
  },
  tile: {
    borderRadius: 12,
    minHeight: 58,
    paddingVertical: 14,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
    // Shadow
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  tileText: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 22,
  },
  tileCorrect: {
    borderWidth: 3,
    borderColor: '#065F46',
  },
  tileWrong: {
    borderWidth: 3,
    borderColor: '#7C2D12',
    opacity: 0.7,
  },

  // ── True / False ──
  tfRow: {
    flexDirection: 'row',
    gap: 14,
  },
  tfTile: {
    borderRadius: 14,
    minHeight: 70,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  tfTileTrue: {
    backgroundColor: '#06D6A0',
  },
  tfTileFalse: {
    backgroundColor: '#EF476F',
  },
  tfTileText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // ── Feedback ──
  feedbackContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  feedbackCorrect: {
    color: '#065F46',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  feedbackWrong: {
    color: '#7C2D12',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  feedbackCorrectAnswer: {
    color: '#1A1A1A',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },

  // ── Next button ──
  nextButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginTop: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
