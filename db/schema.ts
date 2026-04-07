import { sqliteTable, text, integer, primaryKey, uniqueIndex, sql } from 'drizzle-orm/sqlite-core';

// Users
export const users = sqliteTable('users', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name'),
    username: text('username').notNull(),
    passwordHash: text('password_hash').notNull(),
    coins: integer('coins').default(0),
    activeCatColorId: integer('active_cat_color_id').references(() => catColors.id),
    activeCatHatId: integer('active_cat_hat_id').references(() => catHats.id),
    ageGroup: text('age_group'),
    consentGiven: integer('consent_given', { mode: 'boolean' }).default(false),
}, (table) => ({
    usernameIndex: uniqueIndex('username_idx').on(table.username),
}));

// Medications
export const medications = sqliteTable('medications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  generic: text('generic').notNull(),
  brand: text('brand').notNull(),
});

// Dosage Options (forms)
export const dosageOptions = sqliteTable('dosage_options', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  form: text('form').notNull(), // e.g., Tablet, Capsule, etc.
});

// Side Effects
export const sideEffects = sqliteTable('side_effects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  description: text('description').notNull(),
});

// Medication ↔ Side Effects (many-to-many)
export const medicationSideEffects = sqliteTable('medication_side_effects', {
  medicationId: integer('medication_id').notNull().references(() => medications.id),
  sideEffectId: integer('side_effect_id').notNull().references(() => sideEffects.id),
}, (table) => ({
  pk: primaryKey({ columns: [table.medicationId, table.sideEffectId] }),
}));

// User ↔ Medications
export const userMedications = sqliteTable('user_medications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  medicationId: integer('medication_id').notNull().references(() => medications.id),
  dosageFormId: integer('dosage_form_id').references(() => dosageOptions.id), // optional
  active: integer('active', { mode: 'boolean' }).default(true),
  morning: text('morning'), // e.g., "8:00 AM"
  afternoon: text('afternoon'), // e.g., "1:00 PM"
  evening: text('evening'), // e.g., "6:00 PM"
  bedtime: text('bedtime'), // e.g., "10:00 PM"
  dosageAmount: text('dosage_amount'), // e.g., "500mg"
  notes: text('notes'),
});


export const catColors = sqliteTable('cat_colors', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    color: text('color').notNull(),
    spriteURL: text('sprite_url').notNull(),
});

export const catHats = sqliteTable('cat_hats', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    spriteURL: text('sprite_url').notNull(),
});

export const questionBank = sqliteTable('question_bank', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  questionText: text('question_text').notNull(),
  questionType: text('question_type').notNull(), // 'mcq' | 'tf'
  optionsJson: text('options_json'),             // JSON array of option strings for MCQ
  correctAnswer: text('correct_answer').notNull(),
  medicationId: integer('medication_id').references(() => medications.id), // null = general
  ageGroup: text('age_group').notNull(),         // '11-13' | '14-21' | '17-21' | '14-16'
  category: text('category').notNull(),          // 'immunosuppression'|'tacrolimus'|'mycophenolate'|'steroids'|'infection_prophylaxis'|'adherence'
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  sortOrder: integer('sort_order').default(0),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const consentRecords = sqliteTable('consent_records', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  signedByName: text('signed_by_name').notNull(),
  relationshipToPatient: text('relationship_to_patient'),
  signatureData: text('signature_data').notNull(),  // SVG path string
  consentVersion: text('consent_version').default('1.0'),
  isSelfConsent: integer('is_self_consent', { mode: 'boolean' }).default(false),
  signedAt: text('signed_at').notNull(),
});

export const gameSessions = sqliteTable('game_sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  ageGroup: text('age_group').notNull(),
  startedAt: text('started_at').notNull(),
  completedAt: text('completed_at'),
  totalQuestions: integer('total_questions').default(0),
  correctCount: integer('correct_count').default(0),
  nurseNotes: text('nurse_notes'),
  nurseEngagementRating: text('nurse_engagement_rating'), // 'yes' | 'somewhat' | 'no'
  caregiverPresent: integer('caregiver_present', { mode: 'boolean' }),
});

export const questionAttempts = sqliteTable('question_attempts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: integer('session_id').notNull().references(() => gameSessions.id),
  questionId: integer('question_id').notNull().references(() => questionBank.id),
  userId: integer('user_id').notNull().references(() => users.id),
  selectedAnswer: text('selected_answer'),
  isCorrect: integer('is_correct', { mode: 'boolean' }).notNull(),
  attemptedAt: text('attempted_at').notNull(),
});

export const questionProgress = sqliteTable('question_progress', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  questionId: integer('question_id').notNull().references(() => questionBank.id),
  correctStreak: integer('correct_streak').default(0),
  totalAttempts: integer('total_attempts').default(0),
  graduated: integer('graduated', { mode: 'boolean' }).default(false),
  lastSeenAt: text('last_seen_at'),
}, (table) => ({
  userQuestionIndex: uniqueIndex('user_question_idx').on(table.userId, table.questionId),
}));

export const sessionReports = sqliteTable('session_reports', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: integer('session_id').notNull().references(() => gameSessions.id),
  reportText: text('report_text').notNull(),
  generatedAt: text('generated_at').notNull(),
});

