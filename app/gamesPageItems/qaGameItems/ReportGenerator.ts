// ReportGenerator.ts
// Generates a clinical pharmacist-style report from session data.
// Output matches the format of pharmacist progress notes (like image-1 in project docs).

import { QuestionRow } from './QuizEngine';

export interface ReportInput {
  ageGroup: string;
  totalQuestions: number;
  correctCount: number;
  previousScore?: number | null;   // percentage from prior session
  previousSessionDate?: string | null;
  attempts: { question: QuestionRow; isCorrect: boolean }[];
  nurseNotes?: string;
  nurseEngagementRating?: string;  // 'yes' | 'somewhat' | 'no'
  caregiverPresent?: boolean;
  sessionDate: string;
}

// Category display names
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
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function getEngagementText(rating?: string): string {
  if (rating === 'yes') return 'Patient was engaged and responsive throughout the session.';
  if (rating === 'somewhat') return 'Patient was somewhat engaged; some prompting was required.';
  if (rating === 'no') return 'Patient had difficulty engaging with the session.';
  return '';
}

function getCaregiverText(present?: boolean): string {
  if (present === true) return 'A caregiver/parent was present during the session.';
  if (present === false) return 'Patient completed the session independently.';
  return '';
}

function getNextSteps(
  missedByCategory: Record<string, QuestionRow[]>,
  correctByCategory: Record<string, QuestionRow[]>
): string[] {
  const steps: string[] = [];

  // For each category with missed questions, add a review step
  Object.entries(missedByCategory).forEach(([cat, questions]) => {
    if (questions.length === 0) return;
    const label = CATEGORY_LABELS[cat] ?? cat;
    if (questions.length === 1) {
      steps.push(`Review ${label} — patient answered 1 question incorrectly.`);
    } else {
      steps.push(`Review ${label} — patient answered ${questions.length} questions incorrectly.`);
    }
  });

  // Specific reinforcement messages for common misses
  const allMissed = Object.values(missedByCategory).flat();
  const missedTexts = allMissed.map(q => q.questionText.toLowerCase());

  if (missedTexts.some(t => t.includes('before') && t.includes('labs'))) {
    steps.push('Reinforce: Tacrolimus should NOT be taken before labs are drawn.');
  }
  if (missedTexts.some(t => t.includes('pregnancy') || t.includes('pregnant'))) {
    steps.push('Reinforce: Mycophenolate (Cellcept) must be avoided during pregnancy — counsel on contraception if applicable.');
  }
  if (missedTexts.some(t => t.includes('7-day') || t.includes('supply'))) {
    steps.push('Reinforce: Patient should maintain at least a 7-day medication supply at all times.');
  }
  if (missedTexts.some(t => t.includes('ibuprofen') || t.includes('advil'))) {
    steps.push('Reinforce: NSAIDs (ibuprofen/Advil) are contraindicated — recommend acetaminophen (Tylenol) for pain.');
  }
  if (missedTexts.some(t => t.includes('bathroom'))) {
    steps.push('Reinforce: Medications should not be stored in the bathroom due to heat and moisture.');
  }
  if (missedTexts.some(t => t.includes('nystatin') && t.includes('wait'))) {
    steps.push('Reinforce: Patient should wait at least 30 minutes after nystatin before eating or drinking.');
  }

  // If all categories mastered
  if (steps.length === 0) {
    steps.push('Patient demonstrated strong medication knowledge across all categories. Continue to reinforce adherence at future visits.');
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

  // Group by category
  const missedByCategory: Record<string, QuestionRow[]> = {};
  const correctByCategory: Record<string, QuestionRow[]> = {};

  attempts.forEach(({ question, isCorrect }) => {
    const cat = question.category;
    if (!missedByCategory[cat]) missedByCategory[cat] = [];
    if (!correctByCategory[cat]) correctByCategory[cat] = [];
    if (isCorrect) {
      correctByCategory[cat].push(question);
    } else {
      missedByCategory[cat].push(question);
    }
  });

  const missedCategories = Object.entries(missedByCategory)
    .filter(([, qs]) => qs.length > 0)
    .map(([cat]) => CATEGORY_LABELS[cat] ?? cat);

  const masteredCategories = Object.entries(correctByCategory)
    .filter(([cat, qs]) => qs.length > 0 && (!missedByCategory[cat] || missedByCategory[cat].length === 0))
    .map(([cat]) => CATEGORY_LABELS[cat] ?? cat);

  // Build improvement/decline note
  let comparisonNote = '';
  if (previousScore !== null && previousScore !== undefined) {
    const prevPct = previousScore;
    const currPct = Math.round((correctCount / totalQuestions) * 100);
    const diff = currPct - prevPct;
    if (diff > 0) {
      comparisonNote = ` This represents an improvement of ${diff} percentage points from the previous session (${prevPct}%) on ${previousSessionDate ? formatDate(previousSessionDate) : 'a prior visit'}.`;
    } else if (diff < 0) {
      comparisonNote = ` This represents a decline of ${Math.abs(diff)} percentage points from the previous session (${prevPct}%) on ${previousSessionDate ? formatDate(previousSessionDate) : 'a prior visit'}.`;
    } else {
      comparisonNote = ` Score is unchanged from the previous session (${prevPct}%).`;
    }
  }

  // Opening paragraph
  let report = `Date of Session: ${formattedDate}\n`;
  report += `Age Group: ${ageGroup}\n\n`;
  report += `Patient participated in the transplant medication education game (Petiatrics) and scored ${scorePercent} (${scoreRaw} questions correct).${comparisonNote}\n\n`;

  // Engagement and caregiver
  const engText = getEngagementText(nurseEngagementRating);
  const careText = getCaregiverText(caregiverPresent);
  if (engText || careText) {
    report += [engText, careText].filter(Boolean).join(' ') + '\n\n';
  }

  // Nurse notes
  if (nurseNotes && nurseNotes.trim()) {
    report += `Clinical Notes: ${nurseNotes.trim()}\n\n`;
  }

  // Missed topics
  if (missedCategories.length > 0) {
    report += `The following topics had incorrect answers and were reviewed with the patient:\n`;
    missedCategories.forEach(cat => {
      report += `  • ${cat}\n`;
    });
    report += '\n';
  }

  // Mastered topics
  if (masteredCategories.length > 0) {
    report += `The following topics were answered correctly:\n`;
    masteredCategories.forEach(cat => {
      report += `  • ${cat}\n`;
    });
    report += '\n';
  }

  // Next steps
  const nextSteps = getNextSteps(missedByCategory, correctByCategory);
  report += `Next Steps for Provider:\n`;
  nextSteps.forEach(step => {
    report += `  • ${step}\n`;
  });
  report += '\n';

  // Standard closing
  report += `Plan: Continue to follow up at outpatient visits to review medications and provide further education. Transplant medication education was provided, and patient verbalized understanding of reviewed topics.\n\n`;
  report += `— Generated by Petiatrics App (Christine E. Tabulov, PharmD, BCPPS)`;

  return report;
}

// Save report to DB
import { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import * as schema from '@/db/schema';

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
