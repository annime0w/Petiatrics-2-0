import { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import * as schema from '@/db/schema';
import { QuestionRow } from '@/db/quizEngine';

export type EngagementRating = 'yes' | 'somewhat' | 'no';

export interface ReportInput {
  ageGroup: string;
  totalQuestions: number;
  correctCount: number;
  previousScore?: number | null;
  previousSessionDate?: string | null;
  attempts: {
    question: QuestionRow;
    isCorrect: boolean;
  }[];
  nurseNotes?: string;
  nurseEngagementRating?: EngagementRating;
  caregiverPresent?: boolean;
  sessionDate: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  immunosuppression: 'Immunosuppression concepts',
  tacrolimus: 'Tacrolimus (Prograf) management',
  mycophenolate: 'Mycophenolate (Cellcept) management',
  steroids: 'Steroid (Prednisone) education',
  infection_prophylaxis: 'Infection prophylaxis medications',
  adherence: 'Medication adherence and safety',
};

function toPercent(correct: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.round((correct / total) * 100)}%`;
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getEngagementText(rating?: EngagementRating): string {
  if (rating === 'yes') {
    return 'Patient was engaged and responsive throughout the session.';
  }
  if (rating === 'somewhat') {
    return 'Patient was somewhat engaged; some prompting was required.';
  }
  if (rating === 'no') {
    return 'Patient had difficulty engaging with the session.';
  }
  return '';
}

function getCaregiverText(present?: boolean): string {
  if (present === true) {
    return 'A caregiver/parent was present during the session.';
  }
  if (present === false) {
    return 'Patient completed the session independently.';
  }
  return '';
}

function getNextSteps(
  missedByCategory: Record<string, QuestionRow[]>
): string[] {
  const steps: string[] = [];

  for (const [category, questions] of Object.entries(missedByCategory)) {
    if (questions.length === 0) continue;

    const label = CATEGORY_LABELS[category] ?? category;

    if (questions.length === 1) {
      steps.push(`Review ${label} — patient answered 1 question incorrectly.`);
    } else {
      steps.push(
        `Review ${label} — patient answered ${questions.length} questions incorrectly.`
      );
    }
  }

  const allMissedQuestions = Object.values(missedByCategory).flat();
  const missedTexts = allMissedQuestions.map((question) =>
    question.questionText.toLowerCase()
  );

  if (missedTexts.some((text) => text.includes('before') && text.includes('labs'))) {
    steps.push('Reinforce: Tacrolimus should NOT be taken before labs are drawn.');
  }

  if (
    missedTexts.some(
      (text) => text.includes('pregnancy') || text.includes('pregnant')
    )
  ) {
    steps.push(
      'Reinforce: Mycophenolate (Cellcept) must be avoided during pregnancy — counsel on contraception if applicable.'
    );
  }

  if (missedTexts.some((text) => text.includes('7-day') || text.includes('supply'))) {
    steps.push(
      'Reinforce: Patient should maintain at least a 7-day medication supply at all times.'
    );
  }

  if (missedTexts.some((text) => text.includes('ibuprofen') || text.includes('advil'))) {
    steps.push(
      'Reinforce: NSAIDs (ibuprofen/Advil) are contraindicated — recommend acetaminophen (Tylenol) for pain.'
    );
  }

  if (missedTexts.some((text) => text.includes('bathroom'))) {
    steps.push(
      'Reinforce: Medications should not be stored in the bathroom due to heat and moisture.'
    );
  }

  if (missedTexts.some((text) => text.includes('nystatin') && text.includes('wait'))) {
    steps.push(
      'Reinforce: Patient should wait at least 30 minutes after nystatin before eating or drinking.'
    );
  }

  if (steps.length === 0) {
    steps.push(
      'Patient demonstrated strong medication knowledge across all categories. Continue to reinforce adherence at future visits.'
    );
  }

  return steps;
}

export function generateReport(input: ReportInput): string {
  const {
    ageGroup,
    totalQuestions,
    correctCount,
    previousScore,
    previousSessionDate,
    attempts,
    nurseNotes,
    nurseEngagementRating,
    caregiverPresent,
    sessionDate,
  } = input;

  const scorePercent = toPercent(correctCount, totalQuestions);
  const scoreRaw = `${correctCount}/${totalQuestions}`;
  const formattedDate = formatDate(sessionDate);

  const missedByCategory: Record<string, QuestionRow[]> = {};
  const correctByCategory: Record<string, QuestionRow[]> = {};

  for (const { question, isCorrect } of attempts) {
    const category = question.category;

    if (!missedByCategory[category]) missedByCategory[category] = [];
    if (!correctByCategory[category]) correctByCategory[category] = [];

    if (isCorrect) {
      correctByCategory[category].push(question);
    } else {
      missedByCategory[category].push(question);
    }
  }

  const missedCategories = Object.entries(missedByCategory)
    .filter(([, questions]) => questions.length > 0)
    .map(([category]) => CATEGORY_LABELS[category] ?? category);

  const masteredCategories = Object.entries(correctByCategory)
    .filter(
      ([category, questions]) =>
        questions.length > 0 &&
        (!missedByCategory[category] || missedByCategory[category].length === 0)
    )
    .map(([category]) => CATEGORY_LABELS[category] ?? category);

  let comparisonNote = '';

  if (previousScore !== null && previousScore !== undefined) {
    const currentPercent = Math.round((correctCount / totalQuestions) * 100);
    const difference = currentPercent - previousScore;

    if (difference > 0) {
      comparisonNote = ` This represents an improvement of ${difference} percentage points from the previous session (${previousScore}%) on ${
        previousSessionDate ? formatDate(previousSessionDate) : 'a prior visit'
      }.`;
    } else if (difference < 0) {
      comparisonNote = ` This represents a decline of ${Math.abs(difference)} percentage points from the previous session (${previousScore}%) on ${
        previousSessionDate ? formatDate(previousSessionDate) : 'a prior visit'
      }.`;
    } else {
      comparisonNote = ` Score is unchanged from the previous session (${previousScore}%).`;
    }
  }

  let report = `Date of Session: ${formattedDate}\n`;
  report += `Age Group: ${ageGroup}\n\n`;
  report += `Patient participated in the transplant medication education game (Petiatrics) and scored ${scorePercent} (${scoreRaw} questions correct).${comparisonNote}\n\n`;

  const engagementText = getEngagementText(nurseEngagementRating);
  const caregiverText = getCaregiverText(caregiverPresent);

  if (engagementText || caregiverText) {
    report += [engagementText, caregiverText].filter(Boolean).join(' ') + '\n\n';
  }

  if (nurseNotes && nurseNotes.trim()) {
    report += `Clinical Notes: ${nurseNotes.trim()}\n\n`;
  }

  if (missedCategories.length > 0) {
    report += `The following topics had incorrect answers and were reviewed with the patient:\n`;
    missedCategories.forEach((category) => {
      report += `  • ${category}\n`;
    });
    report += '\n';
  }

  if (masteredCategories.length > 0) {
    report += `The following topics were answered correctly:\n`;
    masteredCategories.forEach((category) => {
      report += `  • ${category}\n`;
    });
    report += '\n';
  }

  const nextSteps = getNextSteps(missedByCategory);
  report += `Next Steps for Provider:\n`;
  nextSteps.forEach((step) => {
    report += `  • ${step}\n`;
  });
  report += '\n';

  report += `Plan: Continue to follow up at outpatient visits to review medications and provide further education. Transplant medication education was provided, and patient verbalized understanding of reviewed topics.\n\n`;
  report += `— Generated by Petiatrics App (Christine E. Tabulov, PharmD, BCPPS)`;

  return report;
}

export async function saveReport(
  db: ExpoSQLiteDatabase<typeof schema>,
  sessionId: number,
  reportText: string
): Promise<void> {
  await db.insert(schema.sessionReports).values({
    sessionId,
    reportText,
    generatedAt: new Date().toISOString(),
  });
}