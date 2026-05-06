import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { drizzle } from 'drizzle-orm/expo-sqlite';  
import { useSQLiteContext } from 'expo-sqlite';
import { useUser } from '@/context/UserContext';
import { eq, inArray } from 'drizzle-orm';
import * as schema from '@/db/schema';


export default function SetupMedModal({ visible, onClose, medication, onSave }) {
  const [selectedId, setSelectedId] = useState(null);
  const [medNames, setMedNames] = useState([]);
  const [formData, setFormData] = useState(null);
  const [dosageForms, setDosageForms] = useState([]);  
  const [dosageFormOptions, setDosageFormOptions] = useState([]); 
  const [isFocus, setIsFocus] = useState({
    medication: false,
    dosageForm: false
  });
  const { user } = useUser(); 

  const db = useSQLiteContext();
  const drizzleDb = drizzle(db, { schema });
  console.log(medication);
  useEffect(() => {
    if (medication) {
      setSelectedId(medication);
    }
  }, [medication]);

  useEffect(() => {
  const fetchMedicationData = async () => {
    try {
      if (visible && selectedId != null) {
        const medData = await drizzleDb
          .select()
          .from(schema.medications)
          .where(eq(schema.medications.id, selectedId))
          .get();

        const dosageOptions = await drizzleDb
          .select()
          .from(schema.dosageOptions)
          .all();

        setDosageFormOptions(
          dosageOptions.map(option => ({ label: option.form, value: option.id }))
        );
        const sideEffectList = await drizzleDb
            .select({description: schema.sideEffects.description})
            .from(schema.medicationSideEffects)
            .leftJoin(schema.sideEffects, eq(schema.medicationSideEffects.sideEffectId, schema.sideEffects.id))
            .where(eq(schema.medicationSideEffects.medicationId, medication))
            .all();
        const sideEffectsArray = sideEffectList.map(effect => effect.description);

        setFormData({
            id: user.id,
            medicationId: medication,
            generic: medData.generic,
            brand: medData.brand,
            dosageFormId: '',
            dosageAmount: '',
            notes: medication.notes || '',
            active: true,
            schedule: medication.schedule || {
            Morning: '',
            Afternoon: '',
            Evening: '',
            Bedtime: ''
          },
          sideEffects: (sideEffectsArray).join(', ')
        });
      }
    } catch (err) {
      console.error('Failed to fetch medication data:', err);
    }
  };

  fetchMedicationData();
}, [selectedId, visible]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleScheduleChange = (time, value) => {
    setFormData((prev) => ({
      ...prev,
      schedule: { ...prev.schedule, [time]: value },
    }));
  };

  const handleSubmit = async () => {
    const updatedMed = {
      ...formData,
      sideEffects: formData.sideEffects.split(',').map((s) => s.trim()), 
    };
    onSave(updatedMed);
    console.log('Updated Medication:', updatedMed);
    onClose();
  };



  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <View style={styles.container}>
          <Text style={styles.header}>Setup Medication</Text>
          <ScrollView style={{height: '80%', marginTop: 10}}>
            {formData && (
              <>
                <Text style={styles.label}>Generic Name</Text>
                <TextInput
                  style={styles.input}
                  value={formData.generic}
                />
                <Text style={styles.label}>Brand Name</Text>
                <TextInput
                  style={styles.input}
                  value={formData.brand}
                />
                <Text style={styles.label}>Dosage Form</Text>
                <Dropdown
                  style={[styles.dropdown, isFocus.dosageForm && styles.dropdownFocus]}
                  placeholderStyle={styles.placeholderStyle}
                  selectedTextStyle={styles.selectedTextStyle}
                  data={dosageFormOptions}
                  maxHeight={300}
                  labelField="label"
                  valueField="value"
                  placeholder="Select dosage form..."
                  value={formData.dosageFormId}
                  onFocus={() => setIsFocus(prev => ({ ...prev, dosageForm: true }))}
                  onBlur={() => setIsFocus(prev => ({ ...prev, dosageForm: false }))}
                  onChange={item => {
                    console.log(item);
                    handleChange('dosageFormId', item.value);
                    handleChange('dosageForm', item.label);
                    setIsFocus(prev => ({ ...prev, dosageForm: false }));
                  }}
                />
                <Text style={styles.label}>Dosage Amount</Text>
                <TextInput
                  style={styles.input}
                  value={formData.dosageAmount}
                  onChangeText={(text) => handleChange('dosageAmount', text)}
                />
                <Text style={styles.label}>Schedule</Text>
                {['Morning', 'Afternoon', 'Evening', 'Bedtime'].map((time) => (
                  <TextInput
                    key={time}
                    placeholder={time}
                    placeholderTextColor="#999"
                    style={styles.input}
                    value={formData.schedule[time]}
                    onChangeText={(text) => handleScheduleChange(time, text)}
                  />
                ))}
                <Text style={styles.label}>Side Effects (comma-separated)</Text>
                <TextInput
                  style={styles.SEinput}
                  value={formData.sideEffects}
                  multiline={true}
                  numberOfLines={6}
                  textAlignVertical="top"
                  onChangeText={(text) => handleChange('sideEffects', text)}
                />
              </>
            )}
          </ScrollView>
          <View style={styles.buttonRow}>
            <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSubmit} style={styles.saveButton}>
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}


const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#000000aa',
    justifyContent: 'center',
  },
  container: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 12,
    padding: 20,
    alignItems: 'stretch',
    marginTop: 60,
    marginBottom: 60,
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  label: {
    marginTop: 10,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#888',
    borderRadius: 6,
    padding: 8,
    marginTop: 4,
  },
  SEinput: {
    borderWidth: 1,
    borderColor: '#888',
    borderRadius: 6,
    padding: 8,
    marginTop: 4,
    height: 110,
    flexWrap: 'wrap',
    flexDirection: 'column',
  },
  dropdown: {
    height: 50,
    borderWidth: 1,
    borderColor: '#888',
    borderRadius: 6,
    paddingHorizontal: 8,
    marginTop: 4,
  },
  dropdownFocus: {
    borderColor: '#24693c',
  },
  placeholderStyle: {
    fontSize: 16,
    color: '#888',
  },
  selectedTextStyle: {
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  saveButton: {
    backgroundColor: '#24693c',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginLeft: 5,
  },
  cancelButton: {
    backgroundColor: '#4e6d78',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 5,
  },
  buttonText: {
    textAlign: 'center',
    color: '#fff',
    fontWeight: 'bold',
  },
});