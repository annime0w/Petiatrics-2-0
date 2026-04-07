import { medications, dosageOptions, sideEffects, catColors, users, userMedications, medicationSideEffects, catHats, questionBank, consentRecords, gameSessions, questionAttempts, questionProgress, sessionReports } from './schema';
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

export const addQuestionData = async (db: ExpoSQLiteDatabase) => {
    const value = AsyncStorage.getItemSync('questionData_v1');
    if (value) return;

    console.log('Adding question bank data...');

    // ============================================================
    // AGE GROUP 14-21 QUESTIONS (from published article appendix)
    // These 23 questions are shown to both 14-16 and 17-21 groups
    // medication_id null = general question (not tied to specific med)
    // ============================================================
    await db.insert(questionBank).values([
        // --- IMMUNOSUPPRESSION (general) ---
        {
            questionText: "What does immunosuppression mean?",
            questionType: "mcq",
            optionsJson: JSON.stringify([
                "Your body's immune system is stronger",
                "Your body's immune system is weakened"
            ]),
            correctAnswer: "Your body's immune system is weakened",
            medicationId: null,
            ageGroup: "14-21",
            category: "immunosuppression",
            sortOrder: 1,
        },
        {
            questionText: "Which of the following is NOT an immunosuppression medication?",
            questionType: "mcq",
            optionsJson: JSON.stringify([
                "Tacrolimus (Prograf)",
                "Prednisone",
                "Mycophenolate mofetil (Cellcept)",
                "Valganciclovir (Valcyte)"
            ]),
            correctAnswer: "Valganciclovir (Valcyte)",
            medicationId: null,
            ageGroup: "14-21",
            category: "immunosuppression",
            sortOrder: 2,
        },
        // --- TACROLIMUS ---
        {
            questionText: "What is an early sign of brain and nerve damage (neurotoxicity) from tacrolimus (Prograf)?",
            questionType: "mcq",
            optionsJson: JSON.stringify([
                "Upset stomach",
                "Hives",
                "Diarrhea",
                "Tremor"
            ]),
            correctAnswer: "Tremor",
            medicationId: 1,
            ageGroup: "14-21",
            category: "tacrolimus",
            sortOrder: 3,
        },
        {
            questionText: "How do we ensure your tacrolimus (Prograf) is safe and effective?",
            questionType: "mcq",
            optionsJson: JSON.stringify([
                "Stool levels",
                "Urine levels",
                "Snot levels",
                "Blood levels"
            ]),
            correctAnswer: "Blood levels",
            medicationId: 1,
            ageGroup: "14-21",
            category: "tacrolimus",
            sortOrder: 4,
        },
        {
            questionText: "True/False: My tacrolimus (Prograf) dose will always be the same after my transplant.",
            questionType: "tf",
            optionsJson: JSON.stringify(["True", "False"]),
            correctAnswer: "False",
            medicationId: 1,
            ageGroup: "14-21",
            category: "tacrolimus",
            sortOrder: 5,
        },
        {
            questionText: "What can happen when my tacrolimus (Prograf) level is too high?",
            questionType: "mcq",
            optionsJson: JSON.stringify([
                "My chance of having side effects is increased",
                "My chance of having side effects is decreased"
            ]),
            correctAnswer: "My chance of having side effects is increased",
            medicationId: 1,
            ageGroup: "14-21",
            category: "tacrolimus",
            sortOrder: 6,
        },
        {
            questionText: "How many times a day do you need to take your tacrolimus (Prograf)?",
            questionType: "mcq",
            optionsJson: JSON.stringify([
                "Once a day",
                "Twice a day",
                "Three times a day",
                "Four times a day"
            ]),
            correctAnswer: "Twice a day",
            medicationId: 1,
            ageGroup: "14-21",
            category: "tacrolimus",
            sortOrder: 7,
        },
        {
            questionText: "What can happen when my tacrolimus (Prograf) level is too low?",
            questionType: "mcq",
            optionsJson: JSON.stringify([
                "The chance of having my kidney rejected increases",
                "The chance of having my kidney rejected decreases"
            ]),
            correctAnswer: "The chance of having my kidney rejected increases",
            medicationId: 1,
            ageGroup: "14-21",
            category: "tacrolimus",
            sortOrder: 8,
        },
        {
            questionText: "Which medication causes low magnesium levels in the blood?",
            questionType: "mcq",
            optionsJson: JSON.stringify([
                "Trimethoprim/sulfamethoxazole (Bactrim, Septra)",
                "Tacrolimus (Prograf)",
                "Prednisone",
                "Multivitamin"
            ]),
            correctAnswer: "Tacrolimus (Prograf)",
            medicationId: 1,
            ageGroup: "14-21",
            category: "tacrolimus",
            sortOrder: 9,
        },
        {
            questionText: "True/False: On days I have my labs taken, I can take my tacrolimus (Prograf) before I get my blood drawn.",
            questionType: "tf",
            optionsJson: JSON.stringify(["True", "False"]),
            correctAnswer: "False",
            medicationId: 1,
            ageGroup: "14-21",
            category: "tacrolimus",
            sortOrder: 10,
        },
        // --- MYCOPHENOLATE ---
        {
            questionText: "Which medication needs to be avoided during pregnancy?",
            questionType: "mcq",
            optionsJson: JSON.stringify([
                "Tacrolimus (Prograf)",
                "Prednisone",
                "Mycophenolate mofetil (Cellcept)",
                "Nystatin"
            ]),
            correctAnswer: "Mycophenolate mofetil (Cellcept)",
            medicationId: 2,
            ageGroup: "14-21",
            category: "mycophenolate",
            sortOrder: 11,
        },
        {
            questionText: "How many times a day do you need to take your mycophenolate mofetil (Cellcept)?",
            questionType: "mcq",
            optionsJson: JSON.stringify([
                "Once a day",
                "Twice a day",
                "Three times a day",
                "Four times a day"
            ]),
            correctAnswer: "Twice a day",
            medicationId: 2,
            ageGroup: "14-21",
            category: "mycophenolate",
            sortOrder: 12,
        },
        {
            questionText: "What should I do if I have a lot of diarrhea from my mycophenolate mofetil (Cellcept)?",
            questionType: "mcq",
            optionsJson: JSON.stringify([
                "Do nothing",
                "Stop taking my Cellcept",
                "Call my kidney doctor",
                "Don't eat"
            ]),
            correctAnswer: "Call my kidney doctor",
            medicationId: 2,
            ageGroup: "14-21",
            category: "mycophenolate",
            sortOrder: 13,
        },
        // --- STEROIDS ---
        {
            questionText: "What is something that can occur from taking steroids?",
            questionType: "mcq",
            optionsJson: JSON.stringify([
                "Sores on your feet",
                "White patches in your mouth",
                "Blisters on your hand",
                "Tenderness in the knee"
            ]),
            correctAnswer: "White patches in your mouth",
            medicationId: 3,
            ageGroup: "14-21",
            category: "steroids",
            sortOrder: 14,
        },
        // --- INFECTION PROPHYLAXIS ---
        {
            questionText: "What medication is used to prevent a rare fungus (PCP) that can be seen in transplant patients?",
            questionType: "mcq",
            optionsJson: JSON.stringify([
                "Tacrolimus (Prograf)",
                "Trimethoprim/sulfamethoxazole (Bactrim, Septra)",
                "Mycophenolate mofetil (Cellcept)",
                "Prednisone"
            ]),
            correctAnswer: "Trimethoprim/sulfamethoxazole (Bactrim, Septra)",
            medicationId: 6,
            ageGroup: "14-21",
            category: "infection_prophylaxis",
            sortOrder: 15,
        },
        {
            questionText: "What medication prevents cytomegalovirus (CMV)?",
            questionType: "mcq",
            optionsJson: JSON.stringify([
                "Valganciclovir (Valcyte)",
                "Prednisone",
                "Fluconazole (Diflucan)",
                "Trimethoprim/sulfamethoxazole (Bactrim, Septra)"
            ]),
            correctAnswer: "Valganciclovir (Valcyte)",
            medicationId: 8,
            ageGroup: "14-21",
            category: "infection_prophylaxis",
            sortOrder: 16,
        },
        {
            questionText: "Which medication is used to prevent thrush (white patches in the mouth)?",
            questionType: "mcq",
            optionsJson: JSON.stringify([
                "Prednisone",
                "Azathioprine (Imuran)",
                "Trimethoprim/sulfamethoxazole (Bactrim, Septra)",
                "Nystatin"
            ]),
            correctAnswer: "Nystatin",
            medicationId: 7,
            ageGroup: "14-21",
            category: "infection_prophylaxis",
            sortOrder: 17,
        },
        {
            questionText: "When I take my nystatin, what is the shortest amount of time I need to wait before eating or drinking anything?",
            questionType: "mcq",
            optionsJson: JSON.stringify([
                "15 minutes",
                "30 minutes",
                "1 hour",
                "2 hours"
            ]),
            correctAnswer: "30 minutes",
            medicationId: 7,
            ageGroup: "14-21",
            category: "infection_prophylaxis",
            sortOrder: 18,
        },
        // --- GENERAL ADHERENCE ---
        {
            questionText: "True/False: I always need to keep at least a 7-day supply of my medications on hand at all times.",
            questionType: "tf",
            optionsJson: JSON.stringify(["True", "False"]),
            correctAnswer: "True",
            medicationId: null,
            ageGroup: "14-21",
            category: "adherence",
            sortOrder: 19,
        },
        {
            questionText: "True/False: I can keep my medications in the bathroom.",
            questionType: "tf",
            optionsJson: JSON.stringify(["True", "False"]),
            correctAnswer: "False",
            medicationId: null,
            ageGroup: "14-21",
            category: "adherence",
            sortOrder: 20,
        },
        {
            questionText: "What should I do if I am experiencing any side effects from my transplant medication(s)?",
            questionType: "mcq",
            optionsJson: JSON.stringify([
                "Do nothing",
                "Call the kidney doctor or kidney nurse"
            ]),
            correctAnswer: "Call the kidney doctor or kidney nurse",
            medicationId: null,
            ageGroup: "14-21",
            category: "adherence",
            sortOrder: 21,
        },
        {
            questionText: "If I have pain, which one of these medicines am I NOT allowed to take?",
            questionType: "mcq",
            optionsJson: JSON.stringify([
                "Acetaminophen (Tylenol)",
                "Ibuprofen (Advil)",
                "Tramadol (Ultram)",
                "Oxycodone/acetaminophen (Percocet)"
            ]),
            correctAnswer: "Ibuprofen (Advil)",
            medicationId: null,
            ageGroup: "14-21",
            category: "adherence",
            sortOrder: 22,
        },
        {
            questionText: "True/False: I always need to check with the Kidney Doctor before starting any new medicines, herbs, vitamins, supplements, or home remedies.",
            questionType: "tf",
            optionsJson: JSON.stringify(["True", "False"]),
            correctAnswer: "True",
            medicationId: null,
            ageGroup: "14-21",
            category: "adherence",
            sortOrder: 23,
        },

        // ============================================================
        // AGE GROUP 11-13 QUESTIONS (simpler language, 6th grade level)
        // Focus: med names, indications, basic adherence
        // ============================================================
        {
            questionText: "What is the main reason you take tacrolimus (Prograf) every day?",
            questionType: "mcq",
            optionsJson: JSON.stringify([
                "To help you grow faster",
                "To stop your body from rejecting your kidney",
                "To help you sleep better",
                "To prevent headaches"
            ]),
            correctAnswer: "To stop your body from rejecting your kidney",
            medicationId: 1,
            ageGroup: "11-13",
            category: "tacrolimus",
            sortOrder: 1,
        },
        {
            questionText: "How many times a day do you take tacrolimus (Prograf)?",
            questionType: "mcq",
            optionsJson: JSON.stringify([
                "Once a day",
                "Twice a day",
                "Three times a day",
                "Only when you feel sick"
            ]),
            correctAnswer: "Twice a day",
            medicationId: 1,
            ageGroup: "11-13",
            category: "tacrolimus",
            sortOrder: 2,
        },
        {
            questionText: "True/False: You should take your transplant medications every day, even when you feel healthy.",
            questionType: "tf",
            optionsJson: JSON.stringify(["True", "False"]),
            correctAnswer: "True",
            medicationId: null,
            ageGroup: "11-13",
            category: "adherence",
            sortOrder: 3,
        },
        {
            questionText: "What happens if you miss taking your tacrolimus (Prograf)?",
            questionType: "mcq",
            optionsJson: JSON.stringify([
                "Nothing happens",
                "Your kidney could be rejected",
                "You grow taller",
                "You get a cold"
            ]),
            correctAnswer: "Your kidney could be rejected",
            medicationId: 1,
            ageGroup: "11-13",
            category: "tacrolimus",
            sortOrder: 4,
        },
        {
            questionText: "What is the liquid medicine you swish around in your mouth?",
            questionType: "mcq",
            optionsJson: JSON.stringify([
                "Tacrolimus (Prograf)",
                "Nystatin (Mycostatin)",
                "Prednisone",
                "Bactrim"
            ]),
            correctAnswer: "Nystatin (Mycostatin)",
            medicationId: 7,
            ageGroup: "11-13",
            category: "infection_prophylaxis",
            sortOrder: 5,
        },
        {
            questionText: "Bactrim (the antibiotic pill) helps protect you from a type of...",
            questionType: "mcq",
            optionsJson: JSON.stringify([
                "Cold virus",
                "Stomach flu",
                "Rare lung infection (PCP)",
                "Headache"
            ]),
            correctAnswer: "Rare lung infection (PCP)",
            medicationId: 6,
            ageGroup: "11-13",
            category: "infection_prophylaxis",
            sortOrder: 6,
        },
        {
            questionText: "True/False: It is okay to stop taking your medications when you start feeling better.",
            questionType: "tf",
            optionsJson: JSON.stringify(["True", "False"]),
            correctAnswer: "False",
            medicationId: null,
            ageGroup: "11-13",
            category: "adherence",
            sortOrder: 7,
        },
        {
            questionText: "Where should you store your medications?",
            questionType: "mcq",
            optionsJson: JSON.stringify([
                "In the bathroom",
                "In a cool, dry place away from steam and heat",
                "In the refrigerator always",
                "Under your bed"
            ]),
            correctAnswer: "In a cool, dry place away from steam and heat",
            medicationId: null,
            ageGroup: "11-13",
            category: "adherence",
            sortOrder: 8,
        },
        {
            questionText: "Who should you call if you notice something strange or feel different after taking your medications?",
            questionType: "mcq",
            optionsJson: JSON.stringify([
                "Your best friend",
                "Your kidney doctor or kidney nurse",
                "Your teacher",
                "A pharmacist at any store"
            ]),
            correctAnswer: "Your kidney doctor or kidney nurse",
            medicationId: null,
            ageGroup: "11-13",
            category: "adherence",
            sortOrder: 9,
        },
        {
            questionText: "True/False: CellCept (mycophenolate) is taken twice a day.",
            questionType: "tf",
            optionsJson: JSON.stringify(["True", "False"]),
            correctAnswer: "True",
            medicationId: 2,
            ageGroup: "11-13",
            category: "mycophenolate",
            sortOrder: 10,
        },
        {
            questionText: "What does your immune system do after a kidney transplant if you don't take your medications?",
            questionType: "mcq",
            optionsJson: JSON.stringify([
                "It helps the new kidney grow",
                "It tries to attack and reject the new kidney",
                "It makes you stronger",
                "Nothing — the kidney is safe on its own"
            ]),
            correctAnswer: "It tries to attack and reject the new kidney",
            medicationId: null,
            ageGroup: "11-13",
            category: "immunosuppression",
            sortOrder: 11,
        },
        {
            questionText: "True/False: Before trying any new vitamin, herb, or supplement, you should always ask your kidney doctor first.",
            questionType: "tf",
            optionsJson: JSON.stringify(["True", "False"]),
            correctAnswer: "True",
            medicationId: null,
            ageGroup: "11-13",
            category: "adherence",
            sortOrder: 12,
        },
    ]);

    AsyncStorage.setItemSync('questionData_v1', 'true');
    console.log('Question bank seeded successfully.');
};
