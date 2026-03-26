import { Stack } from "expo-router";
import { Suspense, useEffect } from 'react';
import { ActivityIndicator } from 'react-native';
import { SQLiteProvider, openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import migrations from '@/drizzle/migrations';
import { addMedData } from "@/db/medData";
import { UserProvider } from '@/context/UserContext';

export const DATABASE_NAME = 'medicationInfo'

export function MigrationWrapper() {
  const expoDb = openDatabaseSync(DATABASE_NAME);
  const db = drizzle(expoDb);

  const { success, error } = useMigrations(db, migrations);

  useEffect(() => {
    console.log('useEffect ran, success:', success, 'error:', error);
    if (success) {
      addMedData(db);
      console.log('Migrations successful');
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



