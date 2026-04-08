import { Stack } from "expo-router";
import { Suspense, useEffect } from 'react';
import { ActivityIndicator } from 'react-native';
import { SQLiteProvider, openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import migrations from '@/drizzle/migrations';
import { addMedData, addQuestionData } from "@/db/medData";
import { UserProvider } from '@/context/UserContext';

export const DATABASE_NAME = 'medicationInfo'

export function MigrationWrapper() {
  const expoDb = openDatabaseSync(DATABASE_NAME);
  const db = drizzle(expoDb);

  const { success, error } = useMigrations(db, migrations);

  useEffect(() => {
    console.log('useEffect ran, success:', success, 'error:', error);
    if (success) {
      // Safety net: ensure Q&A tables exist even if migration partially failed
      // (e.g. ALTER TABLE failed because columns already existed on device)
      try { expoDb.execSync("ALTER TABLE users ADD COLUMN age_group TEXT;"); } catch (_) {}
      try { expoDb.execSync("ALTER TABLE users ADD COLUMN consent_given INTEGER DEFAULT 0;"); } catch (_) {}
      expoDb.execSync(`CREATE TABLE IF NOT EXISTS question_bank (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, question_text TEXT NOT NULL, question_type TEXT NOT NULL, options_json TEXT, correct_answer TEXT NOT NULL, medication_id INTEGER, age_group TEXT NOT NULL, category TEXT NOT NULL, is_active INTEGER DEFAULT 1, sort_order INTEGER DEFAULT 0, created_at TEXT)`);
      expoDb.execSync(`CREATE TABLE IF NOT EXISTS consent_records (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, user_id INTEGER NOT NULL, signed_by_name TEXT NOT NULL, relationship_to_patient TEXT, signature_data TEXT NOT NULL, consent_version TEXT DEFAULT '1.0', is_self_consent INTEGER DEFAULT 0, signed_at TEXT NOT NULL)`);
      expoDb.execSync(`CREATE TABLE IF NOT EXISTS game_sessions (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, user_id INTEGER NOT NULL, age_group TEXT NOT NULL, started_at TEXT NOT NULL, completed_at TEXT, total_questions INTEGER DEFAULT 0, correct_count INTEGER DEFAULT 0, nurse_notes TEXT, nurse_engagement_rating TEXT, caregiver_present INTEGER)`);
      expoDb.execSync(`CREATE TABLE IF NOT EXISTS question_attempts (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, session_id INTEGER NOT NULL, question_id INTEGER NOT NULL, user_id INTEGER NOT NULL, selected_answer TEXT, is_correct INTEGER NOT NULL, attempted_at TEXT NOT NULL)`);
      expoDb.execSync(`CREATE TABLE IF NOT EXISTS question_progress (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, user_id INTEGER NOT NULL, question_id INTEGER NOT NULL, correct_streak INTEGER DEFAULT 0, total_attempts INTEGER DEFAULT 0, graduated INTEGER DEFAULT 0, last_seen_at TEXT)`);
      expoDb.execSync(`CREATE TABLE IF NOT EXISTS session_reports (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, session_id INTEGER NOT NULL, report_text TEXT NOT NULL, generated_at TEXT NOT NULL)`);
      try { expoDb.execSync(`CREATE UNIQUE INDEX IF NOT EXISTS user_question_idx ON question_progress (user_id, question_id)`); } catch (_) {}
      addMedData(db);
      addQuestionData(db);
      console.log('Migrations + table safety check complete');
    }
    if (error) {
      console.error('Migrations failed:', error);
    }
  }, [success, error]);

  return (
    <UserProvider>
      <Suspense fallback={<ActivityIndicator size="large" />}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="infoPageItems/medicationSelection" options={{ headerShown: false }} />
          <Stack.Screen name="infoPageItems/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="gamesPageItems/matchGamePlay" options={{headerShown: false}}/>
          <Stack.Screen name="gamesPageItems/unscramble_game_final" options={{headerShown: false}}/>
          <Stack.Screen name="gamesPageItems/qaGame" options={{headerShown: false}}/>
          <Stack.Screen name="infoPageItems/AdminQuestions" options={{headerShown: false}}/>
        </Stack>
      </Suspense>
    </UserProvider>
  );
}

export default function RootLayout() {
  return (
  
    <SQLiteProvider
      databaseName={DATABASE_NAME}
      options={{ enableChangeListener: true }}
      // If your SQLiteProvider supports Suspense, you can keep this option
    >
      <MigrationWrapper />
    </SQLiteProvider>

  );
}



