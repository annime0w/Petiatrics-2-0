import { eq } from 'drizzle-orm';
import { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import * as schema from '@/db/schema';

export interface CategoryChip {
  key: string;
  label: string;
  correct: boolean;
  asked: boolean;
}

const CATEGORIES: { key: string; label: string }[] = [
  { key: 'immunosuppression', label: 'Immunosuppression' },
  { key: 'tacrolimus', label: 'Tacrolimus' },
  { key: 'mycophenolate', label: 'Mycophenolate' },
  { key: 'steroids', label: 'Steroids' },
  { key: 'infection_prophylaxis', label: 'Infection Prevention' },
  { key: 'adherence', label: 'Adherence' },
];

export async function getSessionCategoryChips(
  db: ExpoSQLiteDatabase<typeof schema>,
  sessionId: number
): Promise<CategoryChip[]> {
  const attempts = await db
    .select()
    .from(schema.questionAttempts)
    .where(eq(schema.questionAttempts.sessionId, sessionId));

  const attemptsWithCategory = await Promise.all(
    attempts.map(async (attempt) => {
      const question = await db
        .select({ category: schema.questionBank.category })
        .from(schema.questionBank)
        .where(eq(schema.questionBank.id, attempt.questionId))
        .get();

      return {
        category: question?.category ?? 'unknown',
        isCorrect: !!attempt.isCorrect,
      };
    })
  );

  const map: Record<string, { correct: number; total: number }> = {};

  for (const attempt of attemptsWithCategory) {
    if (!map[attempt.category]) {
      map[attempt.category] = { correct: 0, total: 0 };
    }

    map[attempt.category].total += 1;

    if (attempt.isCorrect) {
      map[attempt.category].correct += 1;
    }
  }

  return CATEGORIES.map(({ key, label }) => {
    const data = map[key];

    if (!data) {
      return {
        key,
        label,
        correct: false,
        asked: false,
      };
    }

    return {
      key,
      label,
      correct: data.correct === data.total,
      asked: true,
    };
  });
}