//import { medications, dosageOptions, sideEffects, catColors, users, userMedications, medicationSideEffects, catHats, questionBank } from './schema';

import { questionBank } from './schema';
import { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import AsyncStorage from 'expo-sqlite/kv-store';

export const addMedData = async (db: ExpoSQLiteDatabase) => {
  const value = AsyncStorage.getItemSync('medData');
  console.log('medData value:', value);

  const existingQuestions = await db.select().from(questionBank).all();

  if (existingQuestions.length === 0) {
    console.log('Adding question bank data...');

    await db.insert(questionBank).values([
      {
        questionText: 'How many times a day do you take tacrolimus (Prograf)?',
        questionType: 'mcq',
        optionsJson: JSON.stringify(['Once a day', 'Twice a day', 'Only when sick']),
        correctAnswer: 'Twice a day',
        medicationId: 1,
        ageGroup: '11-13',
        category: 'tacrolimus',
        isActive: true,
        sortOrder: 1,
      },
      {
        questionText: 'What is an early sign of brain and nerve damage (neurotoxicity) from tacrolimus (Prograf)?',
        questionType: 'mcq',
        optionsJson: JSON.stringify(['Tremors', 'Hair loss', 'Sneezing']),
        correctAnswer: 'Tremors',
        medicationId: 1,
        ageGroup: '14-17',
        category: 'tacrolimus',
        isActive: true,
        sortOrder: 2,
      },
      {
        questionText: 'True/False: You should take your transplant medications every day, even when you feel healthy.',
        questionType: 'tf',
        optionsJson: JSON.stringify(['True', 'False']),
        correctAnswer: 'True',
        medicationId: null,
        ageGroup: '11-13',
        category: 'adherence',
        isActive: true,
        sortOrder: 3,
      },
      {
        questionText: 'How do we ensure your tacrolimus (Prograf) is safe and effective?',
        questionType: 'mcq',
        optionsJson: JSON.stringify([
          'By checking labs regularly',
          'By skipping doses',
          'By changing the dose yourself',
        ]),
        correctAnswer: 'By checking labs regularly',
        medicationId: 1,
        ageGroup: '18-21',
        category: 'tacrolimus',
        isActive: true,
        sortOrder: 4,
      },
    ]);
  }

  AsyncStorage.setItemSync('medData', 'true');
};