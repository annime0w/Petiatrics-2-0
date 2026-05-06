import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { eq } from 'drizzle-orm';

import * as schema from '@/db/schema';
import { useUser } from '@/context/UserContext';
import {
  buildSessionQuestions,
  startSession,
  awardCoins,
  type QuestionRow,
  type QuizAgeGroup,
} from '@/db/quizEngine';

import SessionSummary from '@/components/qaGame/SessionSummary';
import LabAssistantGame from '@/components/qaGame/LabAssistantGame';
import MissionBriefingGame from '@/components/qaGame/MissionBriefingGame';
import MedDashboardGame from '@/components/qaGame/MedDashboardGame';

type GameState =
  | 'loading'
  | 'age_setup'
  | 'building_session'
  | 'playing'
  | 'summary'
  | 'no_questions'
  | 'error';

interface AgeOption {
  label: string;
  value: QuizAgeGroup;
  description: string;
}

const AGE_OPTIONS: AgeOption[] = [
  {
    label: 'Ages 11–13',
    value: '11-13',
    description: 'Lab Assistant — fun science-lab style',
  },
  {
    label: 'Ages 14–17',
    value: '14-17',
    description: 'Mission Briefing — sleek mission style',
  },
  {
    label: 'Ages 18–21',
    value: '18-21',
    description: 'Medical Dashboard — professional style',
  },
];

function isValidAgeGroup(ageGroup: string | null | undefined): ageGroup is QuizAgeGroup {
  return ageGroup === '11-13' || ageGroup === '14-17' || ageGroup === '18-21';
}

export default function QAGame() {
  const router = useRouter();
  const { user, updateUser } = useUser();

  const sqliteDb = useSQLiteContext();
  const db = useMemo(() => drizzle(sqliteDb, { schema }), [sqliteDb]);

  const [gameState, setGameState] = useState<GameState>('loading');
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [sessionId, setSessionId] = useState<number>(0);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [coinsEarned, setCoinsEarned] = useState<number>(0);
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<QuizAgeGroup | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const hasInitialized = useRef(false);

  const buildSession = useCallback(
    async (ageGroup: QuizAgeGroup, userId: number) => {
      try {
        setGameState('building_session');

        const sessionQuestions = await buildSessionQuestions(db, userId, ageGroup);

        if (sessionQuestions.length === 0) {
          setQuestions([]);
          setSessionId(0);
          setGameState('no_questions');
          return;
        }

        const newSessionId = await startSession(
          db,
          userId,
          ageGroup,
          sessionQuestions.length
        );

        setQuestions(sessionQuestions);
        setSessionId(newSessionId);
        setSelectedAgeGroup(ageGroup);
        setGameState('playing');
      } catch (error: any) {
        console.error('QAGame buildSession failed:', error);
        setErrorMessage(error?.message ?? 'Failed to build session.');
        setGameState('error');
      }
    },
    [db]
  );

  const initializeGame = useCallback(async () => {
    if (!user) return;

    try {
      setGameState('loading');

      const freshUser = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, user.id))
        .get();

      if (!freshUser) {
        setErrorMessage('User not found.');
        setGameState('error');
        return;
      }

      setSelectedAgeGroup(null);
      setGameState('age_setup');
    } catch (error: any) {
      console.error('QAGame initializeGame failed:', error);
      setErrorMessage(error?.message ?? 'Unknown error.');
      setGameState('error');
    }
}, [user, db]);

  useEffect(() => {
    if (!user || hasInitialized.current) return;
    hasInitialized.current = true;
    initializeGame();
  }, [user, initializeGame]);

  const handleAgeGroupSelect = useCallback(
    async (ageGroup: QuizAgeGroup) => {
      if (!user) return;

      try {
        await db
          .update(schema.users)
          .set({ ageGroup })
          .where(eq(schema.users.id, user.id));

        updateUser({ ...user, ageGroup });
        await buildSession(ageGroup, user.id);
      } catch (error: any) {
        console.error('QAGame handleAgeGroupSelect failed:', error);
        setErrorMessage(error?.message ?? 'Failed to save age group.');
        setGameState('error');
      }
    },
    [user, db, updateUser, buildSession]
  );

  const handleSessionComplete = useCallback(
    async (correct: number, total: number) => {
      if (!user) return;

      setCorrectCount(correct);

      try {
        const updatedCoins = await awardCoins(db, user.id, correct);
        const earned = correct * 10;

        setCoinsEarned(earned);
        updateUser({ ...user, coins: updatedCoins });
      } catch (error) {
        console.warn('Failed to award coins:', error);
        setCoinsEarned(correct * 10);
      }

      setGameState('summary');
    },
    [user, db, updateUser]
  );

  const handleDone = useCallback(() => {
    router.back();
  }, [router]);

  if (gameState === 'loading' || gameState === 'building_session') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>
          {gameState === 'building_session'
            ? 'Preparing your session...'
            : 'Loading...'}
        </Text>
      </View>
    );
  }

  if (gameState === 'error') {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorSubtitle}>{errorMessage}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (gameState === 'no_questions') {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>All caught up! 🎉</Text>
        <Text style={styles.emptySubtitle}>
          You have no available questions for this age group and medication list right now.
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back to Games</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (gameState === 'age_setup') {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.topBack} onPress={() => router.back()}>
          <Text style={styles.topBackText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.setupTitle}>Age Group Setup</Text>
        <Text style={styles.setupSubtitle}>
          Select the patient’s age group to match the game style and question set.
        </Text>

        {AGE_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={styles.ageOptionCard}
            onPress={() => handleAgeGroupSelect(option.value)}
            activeOpacity={0.8}
          >
            <Text style={styles.ageOptionLabel}>{option.label}</Text>
            <Text style={styles.ageOptionDescription}>{option.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  if (gameState === 'playing' && user && selectedAgeGroup) {
    if (selectedAgeGroup === '11-13') {
      return (
        <LabAssistantGame
          userId={user.id}
          sessionId={sessionId}
          questions={questions}
          onSessionComplete={handleSessionComplete}
        />
      );
    }

    if (selectedAgeGroup === '14-17') {
      return (
        <MissionBriefingGame
          userId={user.id}
          sessionId={sessionId}
          questions={questions}
          onSessionComplete={handleSessionComplete}
        />
      );
    }

    return (
      <MedDashboardGame
        userId={user.id}
        sessionId={sessionId}
        questions={questions}
        onSessionComplete={handleSessionComplete}
      />
    );
  }

  if (gameState === 'summary' && user && selectedAgeGroup) {
    return (
      <SessionSummary
        userId={user.id}
        sessionId={sessionId}
        ageGroup={selectedAgeGroup}
        correctCount={correctCount}
        totalCount={questions.length}
        coinsEarned={coinsEarned}
        onDone={handleDone}
      />
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#7CB5DD',
    padding: 24,
    paddingTop: 60,
  },
  centered: {
    flex: 1,
    backgroundColor: '#7CB5DD',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 12,
    fontFamily: 'pixelRegular',
  },
  errorTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  errorSubtitle: {
    color: '#ddd',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 26,
    fontFamily: 'pixelRegular',
    textAlign: 'center',
    marginBottom: 12,
  },
  emptySubtitle: {
    color: '#f0f0f0',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  backButton: {
    backgroundColor: '#2E6DA4',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'pixelRegular',
  },
  topBack: {
    marginBottom: 16,
  },
  topBackText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'pixelRegular',
  },
  setupTitle: {
    color: '#fff',
    fontSize: 28,
    fontFamily: 'pixelRegular',
    marginBottom: 8,
  },
  setupSubtitle: {
    color: '#e8f4fd',
    fontSize: 14,
    marginBottom: 28,
    lineHeight: 20,
  },
  ageOptionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    marginBottom: 14,
  },
  ageOptionLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E6DA4',
    marginBottom: 4,
  },
  ageOptionDescription: {
    fontSize: 13,
    color: '#666',
  },
});