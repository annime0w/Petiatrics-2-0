import { View, Text, StyleSheet } from 'react-native';
import { styles } from '@/styles/auth.styles';
import { TouchableOpacity, ImageBackground, ScrollView } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import AddMedModal from './addMedModal';
import EditMedModal from './editMedModal';
import SetupMedModal from './setupMedModal';
import deleteMedModal from './deleteMedModal.js';

import { useUser } from '@/context/UserContext';
import { useSQLiteContext } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from '@/db/schema';
import { eq, and, inArray} from 'drizzle-orm';
import DeleteMedModal from './deleteMedModal.js';

export default function medSelection() {
  const capitalizeFirst = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
  const router = useRouter();
  const [selectedMedicationIds, setSelectedMedicationIds] = useState<number[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [setupModalVisible, setSetupModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [medList, setMedList] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);

  const { user } = useUser();
  const db = useSQLiteContext();
  const drizzleDb = drizzle(db, { schema });

  console.log("RENDER - selectedMedications:", selectedMedicationIds);
  
  // Check available methods on the db object
  console.log("DB methods:", Object.keys(db).join(", "));

  const refreshMedList = async () => {
    const medsFromDb = await drizzleDb.select().from(schema.medications).all();
    setMedList(medsFromDb);
  };

  // Load user's medications from database on mount
  useEffect(() => {
    const loadUserMedications = async () => {
      if (!user) {
        console.log("No user found, skipping medication load");
        return;
      }
      refreshMedList();
  
      try {
        const results = await drizzleDb
          .select({medicationId: schema.userMedications.medicationId})
          .from(schema.userMedications)
          .where(
            and( 
              eq(schema.userMedications.userId, user.id),
              eq(schema.userMedications.active, true)
            )
          )
          .all();
        setSelectedMedicationIds(results.map(r => r.medicationId));
        console.log("Loaded selected medications:", selectedMedicationIds);
      } catch (error) {
        console.error("Error loading user medications:", error);
      }
    };
  
    loadUserMedications();
  }, [user, db]);

  const handleAddMed = async (newMed) => {
    console.log("Adding new med with data:", newMed);
    try {
      // 1. Insert into medications table (if not exists)
      console.log("Adding new medication:", newMed);
      const newMedNames = await drizzleDb
        .insert(schema.medications)
        .values({
          generic: newMed.generic,
          brand: newMed.brand,
        })
        .returning()
        .get();
      const medId = newMedNames.id;
  
      // 2. Add to userMedications
      await drizzleDb
      .insert(schema.userMedications)
      .values({
        userId: user.id, // replace with your actual userId
        medicationId: medId,
        dosageFormId: newMed.dosageFormId,
        dosageAmount: newMed.dosageAmount,
        notes: '',
        active: true,
        morning: newMed.schedule.Morning,
        afternoon: newMed.schedule.Afternoon,
        evening: newMed.schedule.Evening,
        bedtime: newMed.schedule.Bedtime,
      })
      .run();
  
      // 3. Handle side effects
      const cleanedSideEffects = newMed.sideEffects.map(s => capitalizeFirst(s).trim());
  
      const sideEffectIds = [];
      for (const effect of cleanedSideEffects) {
        let existingEffect = await drizzleDb
          .select()
          .from(schema.sideEffects)
          .where(eq(schema.sideEffects.description, effect))
          .get();
  
        if (!existingEffect) {
          const inserted = await drizzleDb
            .insert(schema.sideEffects)
            .values({ description: effect })
            .returning()
            .get();
          sideEffectIds.push(inserted.id);
        } else {
          sideEffectIds.push(existingEffect.id);
        }
      }
  
      // 4. Link med <-> sideEffects
      for (const id of sideEffectIds) {
        await drizzleDb.insert(schema.medicationSideEffects).values({
          medicationId: medId,
          sideEffectId: id,
        }).run();
      }
  

    await refreshMedList();
    setSelectedMedicationIds((prev) => [...prev, medId]);
    } catch (err) {
      console.error("Error adding medication:", err);
    }

  };

  const handleEditMed = async (updatedMed) => {
    console.log("Editing med with data:", updatedMed);
    try {
      // update medication table
      await drizzleDb
        .update(schema.medications)
        .set({
          brand: updatedMed.brand,
          generic: updatedMed.generic
        })
        .where(eq(schema.medications.id, updatedMed.medicationId))
        .run();

      // 1. Update the userMedications table with the new med info
      await drizzleDb
        .update(schema.userMedications)
        .set({
          dosageFormId: updatedMed.dosageFormId,
          dosageAmount: updatedMed.dosageAmount,
          notes: updatedMed.notes,
          active: updatedMed.active,
          morning: updatedMed.schedule.Morning,
          afternoon: updatedMed.schedule.Afternoon,
          evening: updatedMed.schedule.Evening,
          bedtime: updatedMed.schedule.Bedtime,
        })
        .where(
          and(
            eq(schema.userMedications.userId, updatedMed.id),
            eq(schema.userMedications.medicationId, updatedMed.medicationId)
          )
        )
        .run();
  
      // 2. Clean side effects
      const cleanedSideEffects = Array.from(
        new Set(
          updatedMed.sideEffects
            .map(s => capitalizeFirst(s).trim())
            .filter(s => s.length > 0)
        )
      );
  
      // 3. Insert new side effects if not in DB
      try {
        for (const effect of cleanedSideEffects) {
          const existing = await drizzleDb
            .select()
            .from(schema.sideEffects)
            .where(eq(schema.sideEffects.description, effect))
            .get();
      
          if (!existing) {
            await drizzleDb
              .insert(schema.sideEffects)
              .values({ description: effect })
              .run();

            
          }
        }
      } catch (error) {
        console.error('Error inserting new side effects:', error);
      }
  
      // 4. Get all IDs
      const allSideEffects = await drizzleDb
        .select()
        .from(schema.sideEffects)
        .where(inArray(schema.sideEffects.description, cleanedSideEffects))
        .all();
  
      // 5. Clear old links and insert new ones
      for (const effect of allSideEffects) {
        const existingLink = await drizzleDb
          .select()
          .from(schema.medicationSideEffects)
          .where(
            and(
            eq(schema.medicationSideEffects.medicationId, updatedMed.medicationId),
            eq(schema.medicationSideEffects.sideEffectId, effect.id)
            )
          )
          .get();
      
        if (!existingLink) {
          await drizzleDb
            .insert(schema.medicationSideEffects)
            .values({
              medicationId: updatedMed.medicationId,
              sideEffectId: effect.id,
            })
            .run();
        }
      }
  
      console.log('Medication and side effects updated successfully');
    } catch (err) {
      console.error('Error updating medication:', err);
    }
  };

  const handleDeleteMed = async (deletedMed) => {
    console.log("Deleting med with data:", deletedMed);
    try {
      await drizzleDb
        .delete(schema.medications)
        .where(eq(schema.medications.id, deletedMed));

      await drizzleDb
        .delete(schema.userMedications)
        .where(eq(schema.userMedications.medicationId, deletedMed));

      await drizzleDb
        .delete(schema.medicationSideEffects)
        .where(eq(schema.medicationSideEffects.medicationId, deletedMed));
    } catch (err) {
      console.error('Error deleting medication:', err);
    }
    await refreshMedList();
    setSelectedMedicationIds((prev) => [...prev, deletedMed]);
  };

  const handleSetupSave = async (updatedMed) => {
    console.log("Saving med with data:", updatedMed);
    await drizzleDb
      .insert(schema.userMedications)
        .values({
            userId: user.id,
            medicationId: updatedMed.medicationId,
            dosageFormId: updatedMed.dosageFormId,
            dosageAmount: updatedMed.dosageAmount,
            notes: updatedMed.notes,
            morning: updatedMed.schedule.Morning,
            afternoon: updatedMed.schedule.Afternoon,
            evening: updatedMed.schedule.Evening,
            bedtime: updatedMed.schedule.Bedtime,
        })
      .run();

      setSelectedMedicationIds((prev) => [...prev, updatedMed.medicationId]);

    setSetupModalVisible(false);
    setSelectedId(null);
  };

  const toggleMed = async (medicationId: number) => {
    if (!user) return;
    setIsUpdating(true);
  
    try {
      const isSelected = selectedMedicationIds.includes(medicationId);
  
      if (isSelected) {
        // Deactivate the medication
        await drizzleDb
          .update(schema.userMedications)
          .set({ active: false })
          .where(
            and(
              eq(schema.userMedications.userId, user.id),
              eq(schema.userMedications.medicationId, medicationId)
            )
          )
          .run();
  
        setSelectedMedicationIds((prev) => prev.filter((id) => id !== medicationId));
        console.log(`Deselected medication ${medicationId}`);
      } else {
        // Check if an inactive record already exists
        const existingEntry = await drizzleDb
          .select()
          .from(schema.userMedications)
          .where(
            and(
              eq(schema.userMedications.userId, user.id),
              eq(schema.userMedications.medicationId, medicationId)
            )
          )
          .get();
  
        if (existingEntry) {
          // Reactivate existing medication
          await drizzleDb
            .update(schema.userMedications)
            .set({ active: true })
            .where(
              and(
                eq(schema.userMedications.userId, user.id),
                eq(schema.userMedications.medicationId, medicationId)
              )
            )
            .run();
  
          setSelectedMedicationIds((prev) => [...prev, medicationId]);
          console.log(`Reactivated existing medication ${medicationId}`);
        } else {
          // No record exists, show setup modal
          setSelectedId(medicationId);
          setSetupModalVisible(true);
          console.log(`Selected new medication ${medicationId}`);
        }
      }
    } catch (error) {
      console.error("Error toggling medication:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <View style={styles.container}>
      <AddMedModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        medications={medList}
        onSave={handleAddMed}
      />
      <EditMedModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        medications={selectedMedicationIds}
        onSave={handleEditMed}
      />  
      <SetupMedModal
        visible={setupModalVisible}
        onClose={() => {
          setSetupModalVisible(false);
          setSelectedId(null);
        }}
        medication={selectedId}
        onSave={handleSetupSave}
      />
      <DeleteMedModal
        visible={deleteModalVisible}
        onClose={() => setDeleteModalVisible(false)}
        medications={selectedMedicationIds}
        onSave={handleDeleteMed}
      />  
      <Text style={localStyles.title}>My Meds</Text>
      <View style={{marginTop: 200, marginBottom: 150}}>
        <View style={localStyles.buttonView}>
          <TouchableOpacity onPress={() => setDeleteModalVisible(true)}>
            <Text style={localStyles.upperButton0}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setEditModalVisible(true)}>
            <Text style={localStyles.upperButton1}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setAddModalVisible(true)}>
            <Text style={localStyles.upperButton2}>Add</Text>
          </TouchableOpacity>
        </View>
        <ImageBackground source={require('../../assets/images/Containers/tallContFS.png')} style={localStyles.container}>
          <ScrollView style={localStyles.section}>
            {medList.map((med) => {
              console.log(`Rendering med ${med.id} (${med.generic}) - Selected: ${selectedMedicationIds.includes(med.id)}`);
              return (
                <TouchableOpacity 
                  key={med.id} 
                  onPress={() => {
                    console.log(`Pressed medication ${med.id} (${med.generic})`);
                    toggleMed(med.id);
                  }}
                  disabled={isUpdating}
                >
                  <Text style={localStyles.sectionText}>
                    {selectedMedicationIds.includes(med.id) ? "✅ " : "⬜ "} {med.generic}{"\n"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </ImageBackground>
        <TouchableOpacity 
          onPress={() => {
            console.log("Done button pressed, navigating back");
            router.back();
          }}
        >
          <Text style={localStyles.button}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}



const localStyles = StyleSheet.create({
  title: {
      fontSize: 40,
      fontFamily: 'pixelRegular',
      color: 'white',
      paddingBottom: 20,
      position: 'absolute',
      top: 75,
  },
  container: {
      width: 330, 
      height: 480, 
      alignItems: 'center', 
      alignSelf: 'center',
      justifyContent: 'flex-start',
      flexDirection: 'column',
      flexWrap: 'wrap',
      paddingTop: 12,
      paddingLeft: 12,
      paddingRight: 12,
      margin: 9,
      marginTop: -1,
  },
  editButton: {
      width: 72, 
      height: 72, 
      top: 55, 
      left: 110
  },
  section: {
    flexDirection: 'column',
    marginBottom: 12,
    marginTop: 12
  },
  sectionText: {
    marginLeft: 10,
    fontSize: 20,
    color: 'black',
  },
  checkbox: {
    alignSelf: 'center',
  },
  button: {
    width: '80%',
    padding: 10,
    fontFamily: 'pixelRegular',
    fontSize: 20,
    color: '#fff',
    borderColor: '#474387',
    backgroundColor: '#7f7bbe',
    borderWidth: 6,
    alignSelf: 'center',
    textAlign: 'center',
  },
  buttonView: {
    flexDirection: 'row',
    alignItems: 'center', 
    alignSelf: 'center',
  },
  upperButton0: {
    width: 100,
    padding: 6,
    fontFamily: 'pixelRegular',
    fontSize: 20,
    color: '#fff',
    borderColor: '#4d0e0e',
    backgroundColor: '#8a3333',
    borderWidth: 6,
    alignSelf: 'center',
    textAlign: 'center',
    margin: 10,
  },
  upperButton1: {
    width: 80,
    padding: 6,
    fontFamily: 'pixelRegular',
    fontSize: 20,
    color: '#fff',
    borderColor: '#665016',
    backgroundColor: '#a68738',
    borderWidth: 6,
    alignSelf: 'center',
    textAlign: 'center',
    margin: 10,
  },
  upperButton2: {
    width: 80,
    padding: 6,
    fontFamily: 'pixelRegular',
    fontSize: 20,
    color: '#fff',
    borderColor: '#0b3319',
    backgroundColor: '#24693c',
    borderWidth: 6,
    alignSelf: 'center',
    textAlign: 'center',
    margin: 10,
  },
});