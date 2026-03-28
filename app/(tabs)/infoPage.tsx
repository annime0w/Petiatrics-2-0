import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, ScrollView } from 'react-native';
import { styles } from '@/styles/auth.styles';
import PasswordModal from '../infoPageItems/infoPagePasswordModal.js';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import { useUser } from '@/context/UserContext';
import { useSQLiteContext } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from '@/db/schema';
import { eq, inArray, and } from 'drizzle-orm';

export default function InfoPage() {
    const [isModalVisible, setModalVisible] = useState(false);
    const router = useRouter();
    const [selectedMedications, setSelectedMedications] = useState<typeof medications>([]);

    const { user } = useUser();
    const db = useSQLiteContext();
    const drizzleDb = drizzle(db, { schema });

    useFocusEffect(
        React.useCallback(() => {
          const loadSelection = async () => {
            console.log('Refetching meds...');
            if (!user || !user.id) {
                console.log('User not loaded');
                return;
            }

            const debug = await drizzleDb.select().from(schema.userMedications).where(eq(schema.userMedications.active, true)).all();
            console.log('user_medications:', debug);
            console.log('user.id:', user?.id);
        
            const results = await drizzleDb
                .select({
                medicationId: schema.userMedications.medicationId,
                })
                .from(schema.userMedications)
                .where(
                    and(
                        eq(schema.userMedications.userId, user.id),
                        eq(schema.userMedications.active, true)
                    )
                )
                .all();
            
            const medIds = results.map(r => r.medicationId);
            console.log('medIds:', medIds);
            

            if (medIds.length > 0) {
                const meds = await drizzleDb
                .select()
                .from(schema.medications)
                .where(inArray(schema.medications.id, medIds))
                .all();

                console.log('meds:', meds);
                setSelectedMedications(meds);
            } else {
                setSelectedMedications([]);
            }
          };

      
          loadSelection();
        }, [user])
      );

    const toggleModal = () => {
        //router.navigate('/infoPageItems/medicationSelection');
        setModalVisible(true);
    };


    return (
        <View style={styles.container}>
            <TouchableOpacity onPress={toggleModal}>
                <ImageBackground
                    source={(require('../../assets/images/ExtraButtons/editPencil3.png'))}
                    style={localStyles.editButton}>
                </ImageBackground>
            </TouchableOpacity>
            {/* Logic for screen transitioning handled as part of the passwordmodal construction in infoPagePasswordModal */}
            <PasswordModal 
                isVisible={isModalVisible} 
                onClose={() => setModalVisible(false)}
                onPasswordCorrect={() => setModalVisible(false)}
            />
            <Text style={localStyles.title}>My Meds</Text>
            <ScrollView style={{marginTop: 150, marginBottom: 150}} showsVerticalScrollIndicator={false}>
                {selectedMedications.length > 0 ? (
                    console.log('Rendering selected medications:', selectedMedications),
                    selectedMedications.map((med) => (
                        <TouchableOpacity key={med.id} onPress={() => router.push({ pathname: '../infoPageItems/[id]', params: { id: med.id } }) }>
                            <ImageBackground
                                source={require('../../assets/images/Containers/contTest3.png')}
                                style={localStyles.container}
                            >
                                <Text style={localStyles.medTitle}>
                                    {med.generic} 
                                    <Text style={localStyles.genericTitle}>{"\n"} ({med.brand})</Text>
                                </Text>
                            </ImageBackground>
                        </TouchableOpacity>
                    ))
                ) : (
                    <Text style={{ color: 'white', textAlign: 'center', fontSize: 20 }}>No medications selected</Text>
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
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center'
    },
    genericTitle: {
        fontSize: 25,
        fontFamily: 'pixelRegular',
        color: 'black',
        alignItems: 'center',
        justifyContent: 'center',
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
        left: 110
        
    }
});