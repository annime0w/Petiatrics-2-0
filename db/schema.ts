import { sqliteTable, text, integer, primaryKey, uniqueIndex } from 'drizzle-orm/sqlite-core';

// Users
export const users = sqliteTable('users', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name'),
    username: text('username').notNull(),
    passwordHash: text('password_hash').notNull(),
    coins: integer('coins').default(0),
    activeCatColorId: integer('active_cat_color_id').references(() => catColors.id),
    activeCatHatId: integer('active_cat_hat_id').references(() => catHats.id),
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


