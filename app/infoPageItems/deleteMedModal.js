import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { useSQLiteContext } from 'expo-sqlite';
import { useUser } from '@/context/UserContext';
import { eq, inArray } from 'drizzle-orm';
import * as schema from '@/db/schema';

export default function DeleteMedModal({ visible, onClose, medications, onSave }) {
  const [selectedMedId, setSelectedMedId] = useState(null);
  const [medNames, setMedNames] = useState([]);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [isFocus, setIsFocus] = useState({ medication: false, dosageForm: false });

  const { user } = useUser();
  const db = useSQLiteContext();
  const drizzleDb = drizzle(db, { schema });

  useEffect(() => {
    const fetchNames = async () => {
      const medData = await drizzleDb
        .select({ id: schema.medications.id, name: schema.medications.generic })
        .from(schema.medications)
        .where(inArray(schema.medications.id, medications))
        .all();

      setMedNames(medData.map(m => ({ label: m.name, value: m.id })));
    };

    if (visible && medications?.length) {
      fetchNames();
    }
    if (visible) {
      setSelectedMedId(null);
      setConfirmChecked(false);
    }
  }, [visible, medications]);

  const handleSubmit = () => {
    if (confirmChecked && selectedMedId) {
      onSave(selectedMedId);
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
          <View style={styles.container}>
            <Text style={styles.header}>Delete Medication</Text>
            <ScrollView>
              <Text style={styles.label}>Select Medication</Text>
              <Dropdown
                style={[styles.dropdown, isFocus.medication && styles.dropdownFocus]}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                data={medNames}
                maxHeight={300}
                labelField="label"
                valueField="value"
                placeholder="Select medication..."
                value={selectedMedId}
                onFocus={() => setIsFocus(prev => ({ ...prev, medication: true }))}
                onBlur={() => setIsFocus(prev => ({ ...prev, medication: false }))}
                onChange={item => {
                  setSelectedMedId(item.value);
                  setIsFocus(prev => ({ ...prev, medication: false }));
                  setConfirmChecked(false);
                }}
              />
              {selectedMedId && (
                <View style={{ marginTop: 20 }}>
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center' }}
                    onPress={() => setConfirmChecked(prev => !prev)}
                  >
                    <Text style={{ fontSize: 20, marginRight: 8 }}>
                      {confirmChecked ? '☑️' : '⬜️'}
                    </Text>
                    <Text>Confirm medication deletion</Text>
                  </TouchableOpacity>
                </View>
              )}
              <View style={styles.buttonRow}>
                <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={!confirmChecked}
                  style={[
                    styles.deleteButton,
                    !confirmChecked && { opacity: 0.5 }
                  ]}
                >
                  <Text style={styles.buttonText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
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
    marginLeft: 3,
  },
  deleteButton: {
    backgroundColor: '#6e0a0a',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 3,
  },
  cancelButton: {
    backgroundColor: '#4e6d78',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 3,
    marginLeft: 3,
  },
  buttonText: {
    textAlign: 'center',
    color: '#fff',
    fontWeight: 'bold',
  },
});