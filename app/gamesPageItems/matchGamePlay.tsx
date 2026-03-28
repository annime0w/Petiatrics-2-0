import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { styles } from '@/styles/auth.styles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import Block from '../../components/textBlock';
import medications from '../data/medications.json';

import { useUser } from '@/context/UserContext';
import { useSQLiteContext } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from '@/db/schema';
import { eq, inArray, and } from 'drizzle-orm';

export default function matchGamePlay() {
  const router = useRouter();
  const [gameMedications, setGameMedications] = useState<typeof medications>([]);
  const [gameIds, setGameIds] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [press1, setPress1] = useState(-1);
  const [press1Text, setPress1Text] = useState("");
  const [match1State, setMatch1State] = useState<number[]>([]);
  const [match2State, setMatch2State] = useState<number[]>([]);
  const [match3State, setMatch3State] = useState<number[]>([]);
  const [match4State, setMatch4State] = useState<number[]>([]);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [randomsGenerated, setGeneration] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const { user } = useUser();
  const db = useSQLiteContext();
  const drizzleDb = drizzle(db, { schema });


  const buttonPress = (id: number, text: string) => {
    if (press1 == -1) {
      console.log("This is press1, id before save is: ");
      console.log(press1);
      setPress1(id);
      setPress1Text(text);
      console.log("id after save is: ");
      console.log(id);
      console.log(text);
    } else if ((press1 != id) || (press1Text != text)) {
      console.log("This is press2");
      console.log(id);
      console.log(text);

      if (press1 == id) {
        console.log("Match Found!");
        if (incorrectCount == 0) {
          setScore(score + 500);
          console.log(score + 500);
        } else if (incorrectCount == 1) {
          setScore(score + 300);
          console.log(score + 300);
        } else if (incorrectCount == 2) {
          setScore(score + 100);
          console.log(score + 100);
        } else {
          setScore(score);
          console.log(score);
        }
        setIncorrectCount(0);

        if ((match1State.length == 0) || (match1State.length > 1)) {
          console.log("Marking match1 with id");
          setMatch1State([press1]);
        } else if ((match2State.length == 0) || (match2State.length > 1)) {
          console.log("Marking match2 with id");
          setMatch2State([press1]);
        } else if ((match3State.length == 0) || (match3State.length > 1)) {
          console.log("Marking match3 with id");
          setMatch3State([press1]);
        } else if ((match4State.length == 0) || (match4State.length > 1)) {
          console.log("Marking match4 with id");
          setMatch4State([press1]);
        }

      } else {
        console.log("Incorrect pair!");
        setIncorrectCount(incorrectCount + 1);
        if ((match1State.length == 0) || (match1State.length > 1)) {
          console.log("Marking match1 with ids");
          setMatch1State([press1, id]);
        } else if ((match2State.length == 0) || (match2State.length > 1)) {
          console.log("Marking match2 with ids");
          setMatch2State([press1, id]);
        } else if ((match3State.length == 0) || (match3State.length > 1)) {
          console.log("Marking match3 with ids");
          setMatch3State([press1, id]);
        } else if ((match4State.length == 0) || (match4State.length > 1)) {
          console.log("Marking match4 with ids");
          setMatch4State([press1, id]);
        }
      }
      setPress1(-1);
      setPress1Text("");
    } else if (press1Text == text) {
      setPress1(-1);
      setPress1Text("");
    }
  };

  if (!randomsGenerated && (gameMedications.length != 0)) {
    let pickedIds = [0];

    for (let i = 0; (i < 4) && (i < gameMedications.length); i++) {
      const randId = Math.floor((Math.random() * 10) + 1);
      // console.log(randId);
      if (gameIds.includes(randId) && !pickedIds.includes(randId)) {
        pickedIds[i] = randId;
      } else {
        i--;
      }
    }
    const pickedMeds = gameMedications.filter(med => pickedIds.includes(med.id));
    setGeneration(true);
    setGameMedications(pickedMeds);
  }

  useEffect(() => {
    const loadSelection = async () => {
      // 1. Get active medication IDs for the user
      const selectedRows = await drizzleDb
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
  
      const selectedIds = selectedRows.map(row => row.medicationId);
      setGameIds(selectedIds);
  
      if (selectedIds.length === 0) {
        setGameMedications([]);
        return;
      }
  
      // 2. Fetch full medication details from the medications table
      const meds = await drizzleDb
        .select()
        .from(schema.medications)
        .where(inArray(schema.medications.id, selectedIds))
        .all();
  
      setGameMedications(meds);
    };
  
    loadSelection();
  }, []);

  if (!gameOver && (((match1State.length == 1) && (match2State.length == 1) && (match3State.length == 1) && (match4State.length == 1))
    || ((gameMedications.length == 3) && ((match1State.length == 1) && (match2State.length == 1) && (match3State.length == 1)))
    || ((gameMedications.length == 2) && ((match1State.length == 1) && (match2State.length == 1))))) {
    setGameOver(true);
  }


  return (
    <View style={styles.container}>
      {!gameOver ? (
        <View style={styles.container}>
          {gameMedications.length <= 1 ? (
            <View>
              <Text style={[localStyles.medContainerText, { color: 'white', fontSize: 30, top: -100 }]}> Sorry! Not enough medications to play this game.</Text>
              <ImageBackground source={require('../../assets/images/Containers/contTest3.png')} style={localStyles.button}>
                <TouchableOpacity onPress={() => router.back()}>
                  <Text style={[localStyles.title, { top: 0, color: 'black', textAlign: 'center', position: 'relative', paddingTop: 5 }]}>Back to Games</Text>
                </TouchableOpacity>
              </ImageBackground>
            </View>
          ) : (
            <View style={localStyles.container}>
              <Text style={[localStyles.title, { top: -50 }]}>It's matching time!</Text>
              <Text style={localStyles.scoreboard}>Score: {score}</Text>
              {gameMedications.map((med, index) => (
                <View key={index / 2}>
                  {(((match1State.length == 1) && (match1State.includes(med.id)))
                    || ((match2State.length == 1) && (match2State.includes(med.id)))
                    || ((match3State.length == 1) && (match3State.includes(med.id)))
                    || ((match4State.length == 1) && (match4State.includes(med.id)))) ? (
                    <Block key={med.id} text={"✅"} imgSource={require("../../assets/images/Containers/contModal.png")} containerStyle={localStyles.medNameContainer} textStyle={localStyles.medContainerText}></Block>
                  ) : (
                    <TouchableOpacity key={index} onPress={() => buttonPress(med.id, med.generic)}>
                      <Block key={med.id} text={med.generic} imgSource={require("../../assets/images/Containers/contModal.png")} containerStyle={localStyles.medNameContainer} textStyle={localStyles.medContainerText}></Block>
                    </TouchableOpacity>
                  )}
                </View>
              ))
              }
              {gameMedications.map((med, index) => (
                <View key={index / 2}>
                  {(((match1State.length == 1) && (match1State.includes(med.id)))
                    || ((match2State.length == 1) && (match2State.includes(med.id)))
                    || ((match3State.length == 1) && (match3State.includes(med.id)))
                    || ((match4State.length == 1) && (match4State.includes(med.id)))) ? (
                    <Block key={med.id} text={"✅"} imgSource={require("../../assets/images/Containers/contModal.png")} containerStyle={localStyles.medNameContainer} textStyle={localStyles.medContainerText}></Block>
                  ) : (
                    <TouchableOpacity key={index} onPress={() => buttonPress(med.id, med.brand)}>
                      <Block key={med.id} text={med.brand} imgSource={require("../../assets/images/Containers/contModal.png")} containerStyle={localStyles.medNameContainer} textStyle={localStyles.medContainerText}></Block>
                    </TouchableOpacity>
                  )}
                </View>
              ))
              }
            </View>
          )}
        </View>) : (
        <View style={styles.container}>
          <Text style={[localStyles.title, { top: 250 }]}>You did it!</Text>
          <Text style={[localStyles.title, { top: 300 }]}>Final Score: {score}</Text>
          <ImageBackground source={require('../../assets/images/Containers/contTest3.png')} style={localStyles.button}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={[localStyles.title, { top: 0, color: 'black', textAlign: 'center', position: 'relative', paddingTop: 5 }]}>Back to Games</Text>
            </TouchableOpacity>
          </ImageBackground>
        </View>)}
    </View>
  );
}


const localStyles = StyleSheet.create({
  title: {
    fontSize: 30,
    fontFamily: 'pixelRegular',
    color: 'white',
    paddingBottom: 20,
    position: 'absolute',
    top: 50,
  },
  container: {
    width: 450,
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
    top: -250,
  },
  medNameContainer: {
    width: 140,
    height: 140,
    alignItems: 'center',
    alignSelf: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingTop: 5,
    paddingBottom: 5,
    paddingLeft: 10,
    paddingRight: 10,
    top: 25,
  },
  medContainerText: {
    fontSize: 20,
    fontFamily: 'pixelRegular',
    color: 'black',
    textAlign: 'center',
  },
  scoreboard: {
    fontSize: 30,
    fontFamily: 'pixelRegular',
    color: 'white',
    paddingBottom: 20,
    position: 'absolute',
    top: -5,
  },
  button: {
    width: 330,
    height: 108,
    alignItems: 'center',
    alignSelf: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingTop: 15,
    paddingLeft: 10,
    paddingRight: 10,
    margin: 9,
  }
});