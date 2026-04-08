import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { eq } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { useUser } from '@/context/UserContext';
import { buildSessionQuestions, startSession, awardCoins } from './qaGameItems/QuizEngine';
import type { QuestionRow } from './qaGameItems/QuizEngine';
import SessionSummary from './qaGameItems/SessionSummary';
import LabAssistantGame from './qaGameItems/ui1113/LabAssistantGame';
import MissionBriefingGame from './qaGameItems/ui1416/MissionBriefingGame';
import MedDashboardGame from './qaGameItems/ui1721/MedDashboardGame';

type GameState = 'loading' | 'age_setup' | 'building_session' | 'playing' | 'summary' | 'no_questions' | 'error';

export default function QAGame() {
  const router = useRouter();
  const { user, updateUser } = useUser();
  const expoDb = useSQLiteContext();
  const db = useMemo(() => drizzle(expoDb, { schema }), [expoDb]);

  const [gameState, setGameState] = useState<GameState>('loading');
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [sessionId, setSessionId] = useState<number>(0);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [coinsEarned, setCoinsEarned] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (!user) return;
    initGame();
  }, [user]);

  const initGame = async () => {
    if (!user) return;
    setGameState('loading');
    try {
      // Re-fetch user from DB to get latest consentGiven and ageGroup
      const freshUser = await db.select().from(schema.users).where(eq(schema.users.id, user.id)).get();
      if (!freshUser) { setGameState('error'); setErrorMsg('User not found.'); return; }

      // Check age group first
      if (!freshUser.ageGroup) {
        setGameState('age_setup');
        return;
      }

      // Build session
      setGameState('building_session');
      await buildSession(freshUser.ageGroup, freshUser.id);
    } catch (e: any) {
      setGameState('error');
      setErrorMsg(e?.message ?? 'Unknown error');
    }
  };

  const buildSession = async (ageGroup: string, userId: number) => {
    try {
      const qs = await buildSessionQuestions(db, userId, ageGroup);
      if (qs.length === 0) {
        setGameState('no_questions');
        return;
      }
      const sid = await startSession(db, userId, ageGroup, qs.length);
      setQuestions(qs);
      setSessionId(sid);
      setGameState('playing');
    } catch (e: any) {
      setGameState('error');
      setErrorMsg(e?.message ?? 'Failed to build session');
    }
  };

  const handleAgeGroupSelect = async (ageGroup: string) => {
    if (!user) return;
    await db.update(schema.users).set({ ageGroup }).where(eq(schema.users.id, user.id));
    updateUser({ ...user, ageGroup });
    setGameState('building_session');
    await buildSession(ageGroup, user.id);
  };

  const handleSessionComplete = async (correct: number, total: number) => {
    if (!user) return;
    setCorrectCount(correct);
    try {
      const newCoins = await awardCoins(db, user.id, correct);
      const earned = correct * 10;
      setCoinsEarned(earned);
      updateUser({ ...user, coins: newCoins });
    } catch (e) {
      console.warn('Failed to award coins:', e);
    }
    setGameState('summary');
  };

  const handleDone = () => {
    router.back();
  };

  // ── RENDER ──────────────────────────────────────────────────────────

  if (gameState === 'loading' || gameState === 'building_session') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>
          {gameState === 'building_session' ? 'Preparing your session...' : 'Loading...'}
        </Text>
      </View>
    );
  }

  if (gameState === 'error') {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Something went wrong</Text>
        <Text style={styles.errorSub}>{errorMsg}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (gameState === 'no_questions') {
    return (
      <View style={styles.centered}>
        <Text style={styles.noQTitle}>All caught up! 🎉</Text>
        <Text style={styles.noQSub}>You've mastered all available questions for your medication list. Check back after your next visit!</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Back to Games</Text>
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
        <Text style={styles.setupSub}>Select the patient's age group to customize the game experience.</Text>
        {[
          { label: 'Ages 11–13', value: '11-13', desc: 'Lab Assistant — fun science-lab style' },
          { label: 'Ages 14–16', value: '14-16', desc: 'Mission Briefing — sleek mission style' },
          { label: 'Ages 17–21', value: '17-21', desc: 'Medical Dashboard — professional style' },
        ].map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={styles.ageOptionCard}
            onPress={() => handleAgeGroupSelect(opt.value)}
          >
            <Text style={styles.ageOptionLabel}>{opt.label}</Text>
            <Text style={styles.ageOptionDesc}>{opt.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  if (gameState === 'playing' && user) {
    const ageGroup = user.ageGroup ?? '14-16';
    if (ageGroup === '11-13') {
      return (
        <LabAssistantGame
          userId={user.id}
          sessionId={sessionId}
          questions={questions}
          onSessionComplete={handleSessionComplete}
        />
      );
    }
    if (ageGroup === '14-16') {
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

  if (gameState === 'summary' && user) {
    return (
      <SessionSummary
        userId={user.id}
        sessionId={sessionId}
        ageGroup={user.ageGroup ?? '14-16'}
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
  errorText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  errorSub: {
    color: '#ddd',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  noQTitle: {
    color: '#fff',
    fontSize: 26,
    fontFamily: 'pixelRegular',
    textAlign: 'center',
    marginBottom: 12,
  },
  noQSub: {
    color: '#f0f0f0',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  backBtn: {
    backgroundColor: '#2E6DA4',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  backBtnText: {
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
  setupSub: {
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
  ageOptionDesc: {
    fontSize: 13,
    color: '#666',
  },
});
