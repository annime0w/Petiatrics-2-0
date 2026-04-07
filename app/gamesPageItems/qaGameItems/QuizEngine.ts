// QuizEngine.ts
// Spaced repetition logic for the Petiatrics Q&A game.
// Graduate threshold: 3 correct answers in a row.
// Session size: 10-15 questions drawn from the patient's "due" pool.
// Questions are filtered by: age group AND patient's active medications.

import { drizzle } from 'drizzle-orm/expo-sqlite';
import { eq, and, inArray, or, isNull } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';

export const GRADUATE_THRESHOLD = 3;
export const SESSION_SIZE = 12; // default, between 10-15

// Age group to question age_group filter mapping
// '11-13' users see '11-13' questions
// '14-16' and '17-21' users see '14-21' questions
export function getAgeGroupFilter(userAgeGroup: string): string[] {
  if (userAgeGroup === '11-13') return ['11-13'];
  return ['14-21'];
}

// Get the user's active medication IDs
export async function getUserMedicationIds(
  db: ExpoSQLiteDatabase<typeof schema>,
  userId: number
): Promise<number[]> {
  const meds = await db
    .select({ medicationId: schema.userMedications.medicationId })
    .from(schema.userMedications)
    .where(and(
      eq(schema.userMedications.userId, userId),
      eq(schema.userMedications.active, true)
    ));
  return meds.map(m => m.medicationId);
}

// Question type from DB
export type QuestionRow = typeof schema.questionBank.$inferSelect;

// Build the session question list for a user:
// 1. Get all active questions for their age group & their medications (or general questions)
// 2. Filter out graduated questions (unless ALL are graduated — then reset graduated ones)
// 3. Sort by: least recently seen, most attempts wrong first
// 4. Take up to SESSION_SIZE
export async function buildSessionQuestions(
  db: ExpoSQLiteDatabase<typeof schema>,
  userId: number,
  userAgeGroup: string
): Promise<QuestionRow[]> {
  const ageGroupFilter = getAgeGroupFilter(userAgeGroup);
  const userMedIds = await getUserMedicationIds(db, userId);

  // Get all eligible questions (match age group AND (general question OR user has that med))
  const allQuestions = await db
    .select()
    .from(schema.questionBank)
    .where(
      and(
        eq(schema.questionBank.isActive, true),
        inArray(schema.questionBank.ageGroup, ageGroupFilter)
      )
    );

  // Filter to questions relevant to this patient's meds (or general questions)
  const eligibleQuestions = allQuestions.filter(q =>
    q.medicationId === null || userMedIds.includes(q.medicationId)
  );

  if (eligibleQuestions.length === 0) return [];

  const questionIds = eligibleQuestions.map(q => q.id);

  // Get existing progress records for this user
  const progressRecords = await db
    .select()
    .from(schema.questionProgress)
    .where(
      and(
        eq(schema.questionProgress.userId, userId),
        inArray(schema.questionProgress.questionId, questionIds)
      )
    );

  const progressMap = new Map(progressRecords.map(p => [p.questionId, p]));

  // Separate: not-graduated vs graduated
  const notGraduated = eligibleQuestions.filter(q => {
    const prog = progressMap.get(q.id);
    return !prog || !prog.graduated;
  });

  // If all graduated, reset them all (allow re-review)
  const pool = notGraduated.length > 0 ? notGraduated : eligibleQuestions;

  // Sort: questions never seen first, then by oldest lastSeenAt, then by most wrong attempts
  pool.sort((a, b) => {
    const pa = progressMap.get(a.id);
    const pb = progressMap.get(b.id);
    // Never seen = highest priority
    if (!pa && pb) return -1;
    if (pa && !pb) return 1;
    if (!pa && !pb) return a.sortOrder - b.sortOrder;
    // Both seen: sort by lastSeenAt ascending (oldest first)
    const dateA = pa!.lastSeenAt ? new Date(pa!.lastSeenAt).getTime() : 0;
    const dateB = pb!.lastSeenAt ? new Date(pb!.lastSeenAt).getTime() : 0;
    if (dateA !== dateB) return dateA - dateB;
    // Tiebreak: more total attempts = prioritize
    return (pb!.totalAttempts ?? 0) - (pa!.totalAttempts ?? 0);
  });

  return pool.slice(0, SESSION_SIZE);
}

// Record a question attempt and update spaced repetition progress
export async function recordAttempt(
  db: ExpoSQLiteDatabase<typeof schema>,
  userId: number,
  sessionId: number,
  questionId: number,
  selectedAnswer: string,
  isCorrect: boolean
): Promise<void> {
  const now = new Date().toISOString();

  // Insert attempt record
  await db.insert(schema.questionAttempts).values({
    sessionId,
    questionId,
    userId,
    selectedAnswer,
    isCorrect,
    attemptedAt: now,
  });

  // Get existing progress
  const existing = await db
    .select()
    .from(schema.questionProgress)
    .where(
      and(
        eq(schema.questionProgress.userId, userId),
        eq(schema.questionProgress.questionId, questionId)
      )
    )
    .get();

  if (existing) {
    const newStreak = isCorrect ? (existing.correctStreak ?? 0) + 1 : 0;
    const graduated = newStreak >= GRADUATE_THRESHOLD;
    await db
      .update(schema.questionProgress)
      .set({
        correctStreak: newStreak,
        totalAttempts: (existing.totalAttempts ?? 0) + 1,
        graduated,
        lastSeenAt: now,
      })
      .where(eq(schema.questionProgress.id, existing.id));
  } else {
    const newStreak = isCorrect ? 1 : 0;
    await db.insert(schema.questionProgress).values({
      userId,
      questionId,
      correctStreak: newStreak,
      totalAttempts: 1,
      graduated: newStreak >= GRADUATE_THRESHOLD,
      lastSeenAt: now,
    });
  }
}

// Create a new game session record, return its ID
export async function startSession(
  db: ExpoSQLiteDatabase<typeof schema>,
  userId: number,
  ageGroup: string,
  totalQuestions: number
): Promise<number> {
  const result = await db.insert(schema.gameSessions).values({
    userId,
    ageGroup,
    startedAt: new Date().toISOString(),
    totalQuestions,
    correctCount: 0,
  }).returning({ id: schema.gameSessions.id });
  return result[0].id;
}

// Finalize a session with final score and nurse input
export async function finalizeSession(
  db: ExpoSQLiteDatabase<typeof schema>,
  sessionId: number,
  correctCount: number,
  nurseNotes?: string,
  nurseEngagementRating?: string,
  caregiverPresent?: boolean
): Promise<void> {
  await db
    .update(schema.gameSessions)
    .set({
      completedAt: new Date().toISOString(),
      correctCount,
      nurseNotes: nurseNotes ?? null,
      nurseEngagementRating: nurseEngagementRating ?? null,
      caregiverPresent: caregiverPresent ?? null,
    })
    .where(eq(schema.gameSessions.id, sessionId));
}

// Award coins to user for correct answers (10 coins per correct)
export async function awardCoins(
  db: ExpoSQLiteDatabase<typeof schema>,
  userId: number,
  correctCount: number
): Promise<number> {
  const coinsToAdd = correctCount * 10;
  const user = await db.select({ coins: schema.users.coins }).from(schema.users).where(eq(schema.users.id, userId)).get();
  const newCoins = (user?.coins ?? 0) + coinsToAdd;
  await db.update(schema.users).set({ coins: newCoins }).where(eq(schema.users.id, userId));
  return newCoins;
}

// Get user's progress summary for the report
export interface ProgressSummary {
  category: string;
  totalAsked: number;
  totalCorrect: number;
  graduatedCount: number;
  missedQuestions: QuestionRow[];
  correctQuestions: QuestionRow[];
}

export async function getSessionSummary(
  db: ExpoSQLiteDatabase<typeof schema>,
  sessionId: number,
  userId: number
): Promise<{
  session: typeof schema.gameSessions.$inferSelect;
  attempts: (typeof schema.questionAttempts.$inferSelect & { question: QuestionRow })[];
  previousSession: typeof schema.gameSessions.$inferSelect | null;
}> {
  const session = await db
    .select()
    .from(schema.gameSessions)
    .where(eq(schema.gameSessions.id, sessionId))
    .get();

  if (!session) throw new Error('Session not found');

  const attempts = await db
    .select()
    .from(schema.questionAttempts)
    .where(eq(schema.questionAttempts.sessionId, sessionId));

  const attemptsWithQuestions = await Promise.all(
    attempts.map(async (a) => {
      const question = await db
        .select()
        .from(schema.questionBank)
        .where(eq(schema.questionBank.id, a.questionId))
        .get();
      return { ...a, question: question! };
    })
  );

  // Get the previous session (second-most-recent for this user)
  const allSessions = await db
    .select()
    .from(schema.gameSessions)
    .where(and(
      eq(schema.gameSessions.userId, userId),
      eq(schema.gameSessions.ageGroup, session.ageGroup)
    ));

  const completedSessions = allSessions
    .filter(s => s.completedAt && s.id !== sessionId)
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());

  return {
    session,
    attempts: attemptsWithQuestions,
    previousSession: completedSessions[0] ?? null,
  };
}
