import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, ScrollView } from 'react-native';
import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';

import { styles } from '@/styles/auth.styles';
import * as schema from '@/db/schema';
import { useUser } from '@/context/UserContext';
import PasswordModal from '../infoPageItems/infoPagePasswordModal.js';
import {
  getActiveMedicationsForUser,
  type MedicationRow,
} from '@/db/medicationsService';

export default function InfoPage() {
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedMedications, setSelectedMedications] = useState<MedicationRow[]>([]);

  const router = useRouter();
  const { user } = useUser();

  const sqliteDb = useSQLiteContext();
  const drizzleDb = useMemo(() => drizzle(sqliteDb, { schema }), [sqliteDb]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadSelection() {
        if (!user?.id) {
          if (isActive) {
            setSelectedMedications([]);
          }
          return;
        }

        try {
          const meds = await getActiveMedicationsForUser(drizzleDb, user.id);

          if (isActive) {
            setSelectedMedications(meds);
          }
        } catch (error) {
          console.error('InfoPage: failed to load medications', error);
          if (isActive) {
            setSelectedMedications([]);
          }
        }
      }

      loadSelection();

      return () => {
        isActive = false;
      };
    }, [drizzleDb, user?.id])
  );

  const toggleModal = () => {
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={toggleModal}>
        <ImageBackground
          source={require('../../assets/images/ExtraButtons/editPencil3.png')}
          style={localStyles.editButton}
        />
      </TouchableOpacity>

      <PasswordModal
        isVisible={isModalVisible}
        onClose={() => setModalVisible(false)}
        onPasswordCorrect={() => setModalVisible(false)}
      />

      <Text style={localStyles.title}>My Meds</Text>

      <ScrollView
        style={{ marginTop: 150, marginBottom: 150 }}
        showsVerticalScrollIndicator={false}
      >
        {selectedMedications.length > 0 ? (
          selectedMedications.map((med) => (
            <TouchableOpacity
              key={med.id}
              onPress={() =>
                router.push({
                  pathname: '../infoPageItems/[id]',
                  params: { id: String(med.id) },
                })
              }
            >
              <ImageBackground
                source={require('../../assets/images/Containers/contTest3.png')}
                style={localStyles.container}
              >
                <Text style={localStyles.medTitle}>
                  {med.generic}
                  <Text style={localStyles.genericTitle}>{'\n'}({med.brand})</Text>
                </Text>
              </ImageBackground>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={localStyles.emptyText}>No medications selected</Text>
        )}
      </ScrollView>
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
  medTitle: {
    fontSize: 30,
    fontFamily: 'pixelRegular',
    color: 'black',
    textAlign: 'center',
  },
  genericTitle: {
    fontSize: 25,
    fontFamily: 'pixelRegular',
    color: 'black',
  },
  container: {
    width: 330,
    height: 108,
    alignItems: 'center',
    alignSelf: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingTop: 15,
    paddingLeft: 10,
    paddingRight: 10,
    margin: 9,
  },
  editButton: {
    width: 72,
    height: 72,
    position: 'absolute',
    top: 55,
    left: 110,
  },
  emptyText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 20,
    fontFamily: 'pixelRegular',
    marginTop: 20,
  },
});