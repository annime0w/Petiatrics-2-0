import { and, eq, inArray } from 'drizzle-orm';
import { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import * as schema from '@/db/schema';

export type MedicationRow = typeof schema.medications.$inferSelect;

export async function getActiveMedicationsForUser(
  db: ExpoSQLiteDatabase<typeof schema>,
  userId: number
): Promise<MedicationRow[]> {
  const activeMedicationLinks = await db
    .select({
      medicationId: schema.userMedications.medicationId,
    })
    .from(schema.userMedications)
    .where(
      and(
        eq(schema.userMedications.userId, userId),
        eq(schema.userMedications.active, true)
      )
    )
    .all();

  const medicationIds = activeMedicationLinks.map((row) => row.medicationId);

  if (medicationIds.length === 0) {
    return [];
  }

  return db
    .select()
    .from(schema.medications)
    .where(inArray(schema.medications.id, medicationIds))
    .all();
}