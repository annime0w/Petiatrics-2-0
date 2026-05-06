import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
import * as schema from '@/db/schema';
import { QuestionRow, recordAttempt } from '@/db/quizEngine';

interface LabAssistantGameProps {
  userId: number;
  sessionId: number;
  questions: QuestionRow[];
  onSessionComplete: (correctCount: number, totalCount: number) => void;
}

const TILE_COLORS = ['#FFD166', '#06D6A0', '#118AB2', '#EF476F'];
const DARK_TILE_INDICES = [2];

const CORRECT_MESSAGES = [
  "🔬 Correct! You're a science star!",
  '⭐ Excellent work, lab assistant!',
  "🧪 That's exactly right!",
  '✅ Your kidney is proud of you!',
];

const WRONG_MESSAGES = [
  "Not quite — but you'll get it next time!",
  "Almost! Let's remember this one.",
  "Good try! Here's the right answer:",
];

const MAX_STARS = 12;
const FEEDBACK_DELAY_MS = 1500;

function parseAnswers(question: QuestionRow): string[] {
  if (question.questionType === 'tf') return ['True', 'False'];

  try {
    const parsed = JSON.parse(question.optionsJson ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getTileColor(index: number): string {
  return TILE_COLORS[index % TILE_COLORS.length];
}

function getTileTextColor(index: number): string {
  return DARK_TILE_INDICES.includes(index % TILE_COLORS.length) ? '#FFFFFF' : '#1A1A1A';
}

export default function LabAssistantGame({
  userId,
  sessionId,
  questions,
  onSessionComplete,
}: LabAssistantGameProps) {
  const sqliteDb = useSQLiteContext();
  const db = useMemo(() => drizzle(sqliteDb, { schema }), [sqliteDb]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [correctMessageIndex, setCorrectMessageIndex] = useState(0);
  const [wrongMessageIndex, setWrongMessageIndex] = useState(0);

  const slideAnim = useRef(new Animated.Value(20)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const tileOpacities = useRef<Animated.Value[]>([]).current;

  const question = questions[currentIndex] ?? null;
  const answers = question ? parseAnswers(question) : [];
  const isTrueFalse = question?.questionType === 'tf';

  if (tileOpacities.length !== answers.length) {
    tileOpacities.length = 0;
    answers.forEach(() => tileOpacities.push(new Animated.Value(1)));
  }

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
    tileOpacities.forEach((value) => value.setValue(1));
    scaleAnim.setValue(1);
    shakeAnim.setValue(0);
    animateCardIn();
  }, [currentIndex, animateCardIn, tileOpacities, scaleAnim, shakeAnim]);

  const animateCorrect = useCallback(
    (correctTileIndex: number) => {
      const fadeOthers = tileOpacities
        .map((opacity, index) => {
          if (index === correctTileIndex) return null;
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
            toValue: 1.12,
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

  const animateWrong = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const handleAnswer = useCallback(
    async (answer: string, answerIndex: number) => {
      if (hasAnswered || !question) return;

      const isCorrect =
        answer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();

      setSelectedAnswer(answer);
      setHasAnswered(true);
      setFeedbackVisible(true);

      const correctTileIndex = answers.findIndex(
        (value) =>
          value.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase()
      );

      if (isCorrect) {
        setCorrectCount((prev) => prev + 1);
        setCorrectMessageIndex((prev) => (prev + 1) % CORRECT_MESSAGES.length);
        animateCorrect(correctTileIndex);
      } else {
        setWrongMessageIndex((prev) => (prev + 1) % WRONG_MESSAGES.length);
        animateWrong();
      }

      try {
        await recordAttempt(db, userId, sessionId, question.id, answer, isCorrect);
      } catch (error) {
        console.warn('[LabAssistantGame] recordAttempt failed:', error);
      }
    },
    [hasAnswered, question, answers, animateCorrect, animateWrong, db, userId, sessionId]
  );

  const handleNext = useCallback(() => {
    const nextIndex = currentIndex + 1;

    if (nextIndex >= questions.length) {
      onSessionComplete(correctCount, questions.length);
      return;
    }

    setCurrentIndex(nextIndex);
    setSelectedAnswer(null);
    setHasAnswered(false);
    setFeedbackVisible(false);
  }, [currentIndex, questions.length, correctCount, onSessionComplete]);

  useEffect(() => {
    if (!hasAnswered || !question) return;

    const isCorrect =
      selectedAnswer?.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();

    if (isCorrect) {
      const timer = setTimeout(handleNext, FEEDBACK_DELAY_MS);
      return () => clearTimeout(timer);
    }
  }, [hasAnswered, selectedAnswer, question, handleNext]);

  if (!question) return null;

  const starsToShow = Math.min(questions.length, MAX_STARS);
  const filledStars = Math.min(correctCount, starsToShow);

  const isAnsweredCorrect =
    hasAnswered &&
    selectedAnswer?.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();

  const isAnsweredWrong = hasAnswered && !isAnsweredCorrect;

  const getTileStyle = (answer: string, index: number) => {
    const base = [styles.tile, { backgroundColor: getTileColor(index) }];

    if (!hasAnswered) return base;

    const isThisCorrect =
      answer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
    const isThisSelected = answer === selectedAnswer;

    if (isThisCorrect) return [...base, styles.tileCorrect];
    if (isThisSelected && !isThisCorrect) return [...base, styles.tileWrong];
    return [...base, styles.tileDimmed];
  };

  return (
    <ScrollView
      style={styles.scrollContainer}
      contentContainerStyle={styles.container}
      bounces={false}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.progressPill}>
          <Text style={styles.headerLabel}>
            EXPERIMENT {currentIndex + 1} OF {questions.length}
          </Text>
        </View>

        <View style={styles.starRow}>
          {Array.from({ length: starsToShow }).map((_, index) => (
            <Text key={index} style={styles.star}>
              {index < filledStars ? '★' : '☆'}
            </Text>
          ))}
        </View>
      </View>

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
        {!hasAnswered && (
          <Text style={styles.helperText}>Choose the best answer below.</Text>
        )}
      </Animated.View>

      <View style={styles.tilesContainer}>
        {isTrueFalse ? (
          <View style={styles.tfRow}>
            {answers.map((answer, index) => {
              const isTrue = answer.toLowerCase() === 'true';
              const isThisCorrect =
                answer.trim().toLowerCase() ===
                question.correctAnswer.trim().toLowerCase();
              const isThisSelected = answer === selectedAnswer;

              const tileTransform =
                isThisSelected && isAnsweredWrong
                  ? [{ translateX: shakeAnim }]
                  : isThisCorrect && isAnsweredCorrect
                  ? [{ scale: scaleAnim }]
                  : undefined;

              return (
                <Animated.View
                  key={answer}
                  style={[
                    styles.tfTileWrapper,
                    { opacity: tileOpacities[index] ?? 1 },
                    tileTransform ? { transform: tileTransform } : {},
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
                    activeOpacity={0.88}
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
          answers.map((answer, index) => {
            const isThisCorrect =
              answer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
            const isThisSelected = answer === selectedAnswer;

            const tileTransform =
              isThisSelected && isAnsweredWrong
                ? [{ translateX: shakeAnim }]
                : isThisCorrect && hasAnswered
                ? [{ scale: scaleAnim }]
                : undefined;

            return (
              <Animated.View
                key={`${currentIndex}-${index}`}
                style={[
                  { opacity: tileOpacities[index] ?? 1 },
                  tileTransform ? { transform: tileTransform } : {},
                ]}
              >
                <TouchableOpacity
                  style={getTileStyle(answer, index)}
                  onPress={() => handleAnswer(answer, index)}
                  disabled={hasAnswered}
                  activeOpacity={0.88}
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

      {feedbackVisible && (
        <View style={styles.feedbackContainer}>
          {isAnsweredCorrect ? (
            <View style={styles.feedbackCardCorrect}>
              <Text style={styles.feedbackCorrect}>
                {CORRECT_MESSAGES[correctMessageIndex % CORRECT_MESSAGES.length]}
              </Text>
              <Text style={styles.feedbackHint}>Getting the next experiment ready...</Text>
            </View>
          ) : (
            <View style={styles.feedbackCardWrong}>
              <Text style={styles.feedbackWrong}>
                {WRONG_MESSAGES[wrongMessageIndex % WRONG_MESSAGES.length]}
              </Text>
              <Text style={styles.feedbackCorrectAnswer}>
                Correct answer: {question.correctAnswer}
              </Text>
              <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                <Text style={styles.nextButtonText}>Next Experiment →</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      <View style={{ height: 28 }} />
    </ScrollView>
  );
}

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

  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  progressPill: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 12,
  },
  headerLabel: {
    fontFamily: 'pixelRegular',
    color: '#FFFFFF',
    fontSize: 14,
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0,0,0,0.20)',
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
    textShadowColor: 'rgba(0,0,0,0.28)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    marginBottom: 24,
    transform: [{ rotate: '-1deg' }],
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
    fontSize: 19,
    color: '#1A1A1A',
    lineHeight: 28,
    fontWeight: '600',
  },
  helperText: {
    marginTop: 12,
    fontSize: 13,
    color: '#5F6B7A',
    fontWeight: '500',
  },

  tilesContainer: {
    gap: 12,
    marginBottom: 20,
  },
  tile: {
    borderRadius: 14,
    minHeight: 62,
    paddingVertical: 16,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
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
    opacity: 0.78,
  },
  tileDimmed: {
    opacity: 0.42,
  },

  tfRow: {
    flexDirection: 'row',
    gap: 14,
  },
  tfTileWrapper: {
    flex: 1,
  },
  tfTile: {
    borderRadius: 14,
    minHeight: 74,
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

  feedbackContainer: {
    alignItems: 'center',
    paddingTop: 6,
  },
  feedbackCardCorrect: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  feedbackCardWrong: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  feedbackCorrect: {
    color: '#065F46',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  feedbackWrong: {
    color: '#7C2D12',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  feedbackCorrectAnswer: {
    color: '#1A1A1A',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  feedbackHint: {
    color: '#5F6B7A',
    fontSize: 13,
    marginTop: 8,
    fontWeight: '500',
  },

  nextButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginTop: 2,
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