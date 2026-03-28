import { medications, dosageOptions, sideEffects, catColors, users, userMedications, medicationSideEffects, catHats } from './schema';
import { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';

import AsyncStorage from 'expo-sqlite/kv-store';


export const addMedData = async (db: ExpoSQLiteDatabase) => {
    const value = AsyncStorage.getItemSync('medData');
    console.log('medData value:', value);
    if (value) return;

    console.log('Adding medication data...');

    await db.insert(medications).values([
        {generic: "Tacrolimus", brand: "Prograf"},
        {generic: "Mycophenolate mofetil", brand: "CellCept"},
        {generic: "Prednisone/Prednisolone", brand: "Deltasone"},
        {generic: "Cyclosporine", brand: "Neoral"},
        {generic: "Sirolimus", brand: "Rapamune"},
        {generic: "Trimethoprim/Sulfamethoxazole (TMP/SMX)", brand: "Bactrim/Septra"},
        {generic: "Nystatin", brand: "Mycostatin"},
        {generic: "Valganciclovir", brand: "Valcyte"}
    ]);

    await db.insert(dosageOptions).values([
        {form: "Tablet"},
        {form: "Capsule"},
        {form: "Extended Release Capsule"},
        {form: "Extended Release Tablet"},
        {form: "Liquid Suspension"},
        {form: "Granules"},
        {form: "Liquid Solution"},
        {form: "Oral Solution"}
    ]);

    await db.insert(sideEffects).values([
        { description: "Nausea" }, // 1
        { description: "Decreased magnesium levels" }, // 2
        { description: "Increased potassium levels" }, // 3
        { description: "Increased blood sugar" }, // 4
        { description: "Increased blood pressure" }, // 5
        { description: "Kidney damage" }, // 6
        { description: "Tremors" }, // 7
        { description: "Diarrhea" }, // 8
        { description: "Vomiting" }, // 9
        { description: "Headache" }, // 10
        { description: "Seizures" }, // 11
        { description: "Leg cramps" }, // 12
        { description: "Hair loss" }, // 13
        { description: "Insomnia" }, // 14
        { description: "Heartburn" }, // 15
        { description: "Abdominal pain" }, // 16
        { description: "Fatigue" }, // 17
        { description: "Low WBC count" }, // 18
        { description: "Low RBC count" }, // 19
        { description: "Low platelet count" }, // 20
        { description: "Increased appetite" }, // 21
        { description: "Weight gain" }, // 22
        { description: "Edema" }, // 23
        { description: "Mood swings" }, // 24
        { description: "Irritability" }, // 25
        { description: "Increased sweating" }, // 26
        { description: "Acne" },    // 27
        { description: "Slow wound healing" }, // 28
        { description: "Stretch marks" }, // 29
        { description: "Weaker bones" }, // 30
        { description: "Slower growth" }, // 31
        { description: "Cataracts" }, // 32
        { description: "Glaucoma" }, // 33
        { description: "Increased body hair growth" }, // 34
        { description: "Tender or swollen gums" }, // 35
        { description: "Mouth sores" }, // 36
        { description: "Increased protein in urine" }, // 37
        { description: "Swelling" }, // 38
        { description: "Increase in liver functions tests" }, // 39
        { description: "Lung inflammation" }, // 40
        { description: "Rash" }, // 41
        { description: "Increased sun sensitivity" },   // 42
        { description: "Cavities" }, // 43
        { description: "Metallic taste" }, // 44
        { description: "Reduced kidney function" } // 45
    ]);

    await db.insert(catColors).values([
        { color: "Black", spriteURL: "blackSprite.png"},
        { color: "White", spriteURL: "whiteSprite.png"},
        { color: "Gray", spriteURL: "graySprite.png"},
        { color: "Orange", spriteURL: "orangeSprite.png"},
        { color: "Multi", spriteURL: "multiSprite.png"},
        { color: "Siamese", spriteURL: "siameseSprite.png"},
        { color: "sphinx", spriteURL: "sphinxSprite.png"},
        { color: "Tabby", spriteURL: "tabbySprite.png"},
        { color: "Tuxedo", spriteURL: "tuxedoSprite.png"},
    ]);

    await db.insert(catHats).values([
        { name: "bear", spriteURL: "bearSprite.png"},
        { name: "frog", spriteURL: "frogSprite.png"},
        { name: "orange", spriteURL: "orangeSprite.png"},
        { name: "construction", spriteURL: "constructionSprite.png"},
        { name: "apple", spriteURL: "appleSprite.png"},
        { name: "crown", spriteURL: "crownSprite.png"},
        { name: "birthday", spriteURL: "birthdaySprite.png"},
        { name: "flower", spriteURL: "flowerSprite.png"},
        { name: "cowboy", spriteURL: "cowboySprite.png"},
    ]);


    await db.insert(users).values([
        { name: "Test User", username: "testUser", passwordHash: "testPassword", coins: 0, activeCatColorId: 1, activeCatHatId: 1 },
    ]);

    await db.insert(userMedications).values([
        {userId: 1, medicationId: 1, dosageFormId: 1, dosageAmount: "5mg", morning: "8:00 AM", evening: "8:00 PM", notes: "Take with food", },
        {userId: 1, medicationId: 2, dosageFormId: 2, dosageAmount: "500mg", morning: "8:00 AM", evening: "8:00 PM", notes: "Take on an empty stomach", },
    ]);

    await db.insert(medicationSideEffects).values([
        {medicationId: 1, sideEffectId: 1},
        {medicationId: 1, sideEffectId: 2},
        {medicationId: 1, sideEffectId: 3},
        {medicationId: 1, sideEffectId: 4},
        {medicationId: 1, sideEffectId: 5},
        {medicationId: 1, sideEffectId: 6},
        {medicationId: 1, sideEffectId: 7},
        {medicationId: 1, sideEffectId: 8},
        {medicationId: 1, sideEffectId: 10},
        {medicationId: 1, sideEffectId: 11},
        {medicationId: 1, sideEffectId: 12},
        {medicationId: 1, sideEffectId: 13},
        {medicationId: 1, sideEffectId: 14},

        {medicationId: 2, sideEffectId: 1},
        {medicationId: 2, sideEffectId: 15},
        {medicationId: 2, sideEffectId: 8},
        {medicationId: 2, sideEffectId: 9},
        {medicationId: 2, sideEffectId: 10},
        {medicationId: 2, sideEffectId: 16},
        {medicationId: 2, sideEffectId: 17},
        {medicationId: 2, sideEffectId: 18},
        {medicationId: 2, sideEffectId: 19},
        {medicationId: 2, sideEffectId: 20},

        {medicationId: 3, sideEffectId: 5},
        {medicationId: 3, sideEffectId: 4},
        {medicationId: 3, sideEffectId: 9},
        {medicationId: 3, sideEffectId: 8},
        {medicationId: 3, sideEffectId: 21},
        {medicationId: 3, sideEffectId: 22},
        {medicationId: 3, sideEffectId: 23},
        {medicationId: 3, sideEffectId: 24},
        {medicationId: 3, sideEffectId: 25},
        {medicationId: 3, sideEffectId: 14},
        {medicationId: 3, sideEffectId: 26},
        {medicationId: 3, sideEffectId: 27},
        {medicationId: 3, sideEffectId: 28},
        {medicationId: 3, sideEffectId: 29},

        {medicationId: 4, sideEffectId: 2},
        {medicationId: 4, sideEffectId: 3},
        {medicationId: 4, sideEffectId: 4},
        {medicationId: 4, sideEffectId: 5},
        {medicationId: 4, sideEffectId: 6},
        {medicationId: 4, sideEffectId: 10},
        {medicationId: 4, sideEffectId: 7},
        {medicationId: 4, sideEffectId: 1},
        {medicationId: 4, sideEffectId: 8},
        {medicationId: 4, sideEffectId: 9},
        {medicationId: 4, sideEffectId: 34},
        {medicationId: 4, sideEffectId: 35},

        {medicationId: 5, sideEffectId: 1},
        {medicationId: 5, sideEffectId: 8},
        {medicationId: 5, sideEffectId: 9},
        {medicationId: 5, sideEffectId: 10},
        {medicationId: 5, sideEffectId: 18},
        {medicationId: 5, sideEffectId: 19},
        {medicationId: 5, sideEffectId: 20},
        {medicationId: 5, sideEffectId: 17},
        {medicationId: 5, sideEffectId: 36},
        {medicationId: 5, sideEffectId: 5},
        {medicationId: 5, sideEffectId: 28},
        {medicationId: 5, sideEffectId: 27},
        {medicationId: 5, sideEffectId: 37},
        {medicationId: 5, sideEffectId: 38},
        {medicationId: 5, sideEffectId: 39},
        {medicationId: 5, sideEffectId: 12},
        {medicationId: 5, sideEffectId: 40},

        {medicationId: 6, sideEffectId: 1},
        {medicationId: 6, sideEffectId: 8},
        {medicationId: 6, sideEffectId: 9},
        {medicationId: 6, sideEffectId: 41},
        {medicationId: 6, sideEffectId: 42},
        {medicationId: 6, sideEffectId: 18},
        {medicationId: 6, sideEffectId: 19},
        {medicationId: 6, sideEffectId: 20},
        {medicationId: 6, sideEffectId: 17},
        {medicationId: 6, sideEffectId: 3},

        {medicationId: 7, sideEffectId: 1},
        {medicationId: 7, sideEffectId: 8},
        {medicationId: 7, sideEffectId: 9},
        {medicationId: 7, sideEffectId: 43},
        {medicationId: 7, sideEffectId: 44},

        {medicationId: 8, sideEffectId: 18},
        {medicationId: 8, sideEffectId: 19},
        {medicationId: 8, sideEffectId: 20},
        {medicationId: 8, sideEffectId: 45},
        {medicationId: 8, sideEffectId: 1},
        {medicationId: 8, sideEffectId: 8},
        {medicationId: 8, sideEffectId: 9},
        {medicationId: 8, sideEffectId: 10}

    ]);

    AsyncStorage.setItemSync('medData', 'true');
};
