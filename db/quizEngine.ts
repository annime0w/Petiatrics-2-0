import { eq, and, inArray } from 'drizzle-orm';
import { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import * as schema from '@/db/schema';

export const GRADUATE_THRESHOLD = 3;
export const SESSION_SIZE = 12;

export type QuestionRow = typeof schema.questionBank.$inferSelect;

export type QuizAgeGroup = '11-13' | '14-17' | '18-21';

export interface ProgressSummary {
  category: string;
  totalAsked: number;
  totalCorrect: number;
  graduatedCount: number;
  missedQuestions: QuestionRow[];
  correctQuestions: QuestionRow[];
}

function isValidAgeGroup(ageGroup: string): ageGroup is QuizAgeGroup {
  return ageGroup === '11-13' || ageGroup === '14-17' || ageGroup === '18-21';
}

export function getAgeGroupFilter(userAgeGroup: string): QuizAgeGroup[] {
  if (!isValidAgeGroup(userAgeGroup)) return [];
  return [userAgeGroup];
}

export async function getUserMedicationIds(
  db: ExpoSQLiteDatabase<typeof schema>,
  userId: number
): Promise<number[]> {
  const meds = await db
    .select({ medicationId: schema.userMedications.medicationId })
    .from(schema.userMedications)
    .where(
      and(
        eq(schema.userMedications.userId, userId),
        eq(schema.userMedications.active, true)
      )
    );

  return meds.map((row) => row.medicationId);
}

export async function buildSessionQuestions(
  db: ExpoSQLiteDatabase<typeof schema>,
  userId: number,
  userAgeGroup: string
): Promise<QuestionRow[]> {
  const ageGroupFilter = getAgeGroupFilter(userAgeGroup);
  if (ageGroupFilter.length === 0) return [];

  const userMedicationIds = await getUserMedicationIds(db, userId);

  const allQuestions = await db
    .select()
    .from(schema.questionBank)
    .where(
      and(
        eq(schema.questionBank.isActive, true),
        inArray(schema.questionBank.ageGroup, ageGroupFilter)
      )
    );

  const eligibleQuestions = allQuestions.filter(
    (question) =>
      question.medicationId === null ||
      userMedicationIds.includes(question.medicationId)
  );

  if (eligibleQuestions.length === 0) return [];

  const questionIds = eligibleQuestions.map((question) => question.id);

  const progressRecords = await db
    .select()
    .from(schema.questionProgress)
    .where(
      and(
        eq(schema.questionProgress.userId, userId),
        inArray(schema.questionProgress.questionId, questionIds)
      )
    );

  const progressMap = new Map(
    progressRecords.map((progress) => [progress.questionId, progress])
  );

  const notGraduatedQuestions = eligibleQuestions.filter((question) => {
    const progress = progressMap.get(question.id);
    return !progress || !progress.graduated;
  });

  const pool =
    notGraduatedQuestions.length > 0 ? notGraduatedQuestions : eligibleQuestions;

  pool.sort((a, b) => {
    const progressA = progressMap.get(a.id);
    const progressB = progressMap.get(b.id);

    if (!progressA && progressB) return -1;
    if (progressA && !progressB) return 1;
    if (!progressA && !progressB) return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);

    const dateA = progressA?.lastSeenAt
      ? new Date(progressA.lastSeenAt).getTime()
      : 0;
    const dateB = progressB?.lastSeenAt
      ? new Date(progressB.lastSeenAt).getTime()
      : 0;

    if (dateA !== dateB) return dateA - dateB;

    return (progressB?.totalAttempts ?? 0) - (progressA?.totalAttempts ?? 0);
  });

  return pool.slice(0, SESSION_SIZE);
}

export async function recordAttempt(
  db: ExpoSQLiteDatabase<typeof schema>,
  userId: number,
  sessionId: number,
  questionId: number,
  selectedAnswer: string,
  isCorrect: boolean
): Promise<void> {
  const now = new Date().toISOString();

  await db.insert(schema.questionAttempts).values({
    sessionId,
    questionId,
    userId,
    selectedAnswer,
    isCorrect,
    attemptedAt: now,
  });

  const existingProgress = await db
    .select()
    .from(schema.questionProgress)
    .where(
      and(
        eq(schema.questionProgress.userId, userId),
        eq(schema.questionProgress.questionId, questionId)
      )
    )
    .get();

  if (existingProgress) {
    const newCorrectStreak = isCorrect
      ? (existingProgress.correctStreak ?? 0) + 1
      : 0;

    const graduated = newCorrectStreak >= GRADUATE_THRESHOLD;

    await db
      .update(schema.questionProgress)
      .set({
        correctStreak: newCorrectStreak,
        totalAttempts: (existingProgress.totalAttempts ?? 0) + 1,
        graduated,
        lastSeenAt: now,
      })
      .where(eq(schema.questionProgress.id, existingProgress.id));
  } else {
    const newCorrectStreak = isCorrect ? 1 : 0;

    await db.insert(schema.questionProgress).values({
      userId,
      questionId,
      correctStreak: newCorrectStreak,
      totalAttempts: 1,
      graduated: newCorrectStreak >= GRADUATE_THRESHOLD,
      lastSeenAt: now,
    });
  }
}

export async function startSession(
  db: ExpoSQLiteDatabase<typeof schema>,
  userId: number,
  ageGroup: string,
  totalQuestions: number
): Promise<number> {
  const result = await db
    .insert(schema.gameSessions)
    .values({
      userId,
      ageGroup,
      startedAt: new Date().toISOString(),
      totalQuestions,
      correctCount: 0,
    })
    .returning({ id: schema.gameSessions.id });

  return result[0].id;
}

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

export async function awardCoins(
  db: ExpoSQLiteDatabase<typeof schema>,
  userId: number,
  correctCount: number
): Promise<number> {
  const coinsToAdd = correctCount * 10;

  const user = await db
    .select({ coins: schema.users.coins })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .get();

  const newCoins = (user?.coins ?? 0) + coinsToAdd;

  await db
    .update(schema.users)
    .set({ coins: newCoins })
    .where(eq(schema.users.id, userId));

  return newCoins;
}

export async function getSessionSummary(
  db: ExpoSQLiteDatabase<typeof schema>,
  sessionId: number,
  userId: number
): Promise<{
  session: typeof schema.gameSessions.$inferSelect;
  attempts: (typeof schema.questionAttempts.$inferSelect & {
    question: QuestionRow;
  })[];
  previousSession: typeof schema.gameSessions.$inferSelect | null;
}> {
  const session = await db
    .select()
    .from(schema.gameSessions)
    .where(eq(schema.gameSessions.id, sessionId))
    .get();

  if (!session) {
    throw new Error('Session not found');
  }

  const attempts = await db
    .select()
    .from(schema.questionAttempts)
    .where(eq(schema.questionAttempts.sessionId, sessionId));

  const attemptsWithQuestions = await Promise.all(
    attempts.map(async (attempt) => {
      const question = await db
        .select()
        .from(schema.questionBank)
        .where(eq(schema.questionBank.id, attempt.questionId))
        .get();

      if (!question) {
        throw new Error(`Question not found for attempt ${attempt.id}`);
      }

      return {
        ...attempt,
        question,
      };
    })
  );

  const allSessions = await db
    .select()
    .from(schema.gameSessions)
    .where(
      and(
        eq(schema.gameSessions.userId, userId),
        eq(schema.gameSessions.ageGroup, session.ageGroup)
      )
    );

  const completedPreviousSessions = allSessions
    .filter((row) => row.completedAt && row.id !== sessionId)
    .sort(
      (a, b) =>
        new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime()
    );

  return {
    session,
    attempts: attemptsWithQuestions,
    previousSession: completedPreviousSessions[0] ?? null,
  };
}