import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { useSQLiteContext } from 'expo-sqlite';
import { useUser } from '@/context/UserContext';
import { eq, inArray } from 'drizzle-orm';
import * as schema from '@/db/schema';

export default function AddMedModal({ visible, onClose, medications, onSave }) {
  const [selectedMedId, setSelectedMedId] = useState(null);
  const [medNames, setMedNames] = useState([]);
  const [formData, setFormData] = useState(null);
  const [isFocus, setIsFocus] = useState({ medication: false, dosageForm: false });

  const { user } = useUser();
  const db = useSQLiteContext();
  const drizzleDb = drizzle(db, { schema });

  const [dosageFormOptions, setDosageFormOptions] = useState({
    id: user.id,
    generic: '',
    brand: '',
    dosageFormId: null,
    dosageAmount: '',
    notes: '',
    active: true,
    schedule: { 
      Morning:'',
      Afternoon: '',
      Evening: '', 
      Bedtime: ''
    },
    sideEffects: '',
  });

  useEffect(() => {
    const fetchMedicationData = async () => {
      if (!visible) return;
  
      const dosageForms = await drizzleDb
        .select()
        .from(schema.dosageOptions)
        .all();
  
      const dosageList = dosageForms.map(option => ({
        label: option.form,
        value: option.id,
      }));
      console.log('Dosage Form Options:', dosageList);
      setDosageFormOptions(dosageList);
  
      // Initialize form with default empty values
      setFormData({
        id: user.id ,
        generic: '',
        brand: '',
        dosageFormId: null,
        dosageAmount: '',
        notes: '',
        active: true,
        schedule: {
          Morning: '',
          Afternoon: '',
          Evening: '',
          Bedtime: '',
        },
        sideEffects: '',
      });
    };
  
    fetchMedicationData();
  }, [visible]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleScheduleChange = (time, value) => {
    setFormData(prev => ({ ...prev, schedule: { ...prev.schedule, [time]: value } }));
  };

  const handleSubmit = () => {
    const updatedMed = {
      ...formData,
      sideEffects: formData.sideEffects.split(',').map(s => s.trim()),
    };
    console.log('Added Medication:', updatedMed);
    onSave(updatedMed);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <View style={styles.container}>
          <Text style={styles.header}>Add New Medication</Text>
          <ScrollView>
            {formData && (
            <>
              <Text style={styles.label}>Generic Name</Text>
              <TextInput
                style={styles.input}
                value={formData?.generic}
                onChangeText={(text) => handleChange('generic', text)}
              />

              <Text style={styles.label}>Brand Name</Text>
              <TextInput
                style={styles.input}
                value={formData?.brand}
                onChangeText={(text) => handleChange('brand', text)}
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
                  placeholderTextColor="#888"
                  style={styles.input}
                  value={formData.schedule[time]}
                  onChangeText={(text) => handleScheduleChange(time, text)}
                />
              ))}

              <Text style={styles.label}>Side Effects (comma-separated)</Text>
              <TextInput
                style={styles.input}
                value={formData.sideEffects}
                multiline={true}
                numberOfLines={5}
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
    marginTop: 100,
    marginBottom: 100,
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