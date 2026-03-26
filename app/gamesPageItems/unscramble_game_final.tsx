import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import medications from '../data/medications.json'; 
import Block from '@/components/textBlock';
import {Dimensions} from 'react-native'; //used to get the screen width and height

import { useUser } from '@/context/UserContext';
import { useSQLiteContext } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from '@/db/schema';
import { eq, inArray, and } from 'drizzle-orm';

const TileImage = require('@/assets/images/Containers/contModal.png');
const NextButton = require('@/assets/images/Containers/contTest3.png');
const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;

export default function UnscrambleGame() {
  const [tiles, setTiles] = useState<string[]>([]); //array of letters
  const [answer, setAnswer] = useState<string>('');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null); //null when no tile is selected, index of selected tile when one is selected
  const [correct, setCorrect] = useState<boolean>(false); //when the tiles are in the correct order this becomes true
  const [time, setTime] = useState<number>(0); //intiialize seconds to 0
  const [noMedsSelected, setNoMedsSelected] = useState(false);

  const { user } = useUser();
  const db = useSQLiteContext();
  const drizzleDb = drizzle(db, { schema });

  useEffect(() => {
    const loadGame = async () => {
      const stored = await drizzleDb
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

      const selectedIds = stored.map(row => row.medicationId);

      const meds = await drizzleDb
        .select()
        .from(schema.medications)
        .where(inArray(schema.medications.id, selectedIds))
        .all();
  

      // Check for null, undefined, empty string, or empty array
      if (!stored) {
        setNoMedsSelected(true);
        return;
      }
    
      if (selectedIds.length === 0) {
        setNoMedsSelected(true);
        return;
      }

      //will return a random medication brand from the filtered list, undefined if no medications are selected
      const randomBrand = meds[Math.floor(Math.random() * meds.length)]?.brand;

      if (randomBrand) {
        const charArray = randomBrand.split('');
        shuffleArray(charArray); //these functions will update the states of the corresponding variables
        setTiles(charArray);
        setAnswer(randomBrand);
      }
    };

    loadGame();

  }, []);

  useEffect(() => {
    const joinedTiles = tiles.join('');
    if (joinedTiles === answer && joinedTiles !== '') {
        setCorrect(true);
    } else {
        setCorrect(false);
    }
  }, [tiles, answer]); // This will run whenever tiles or answer changes

  useEffect(() => {
    let interval: NodeJS.Timeout;
  
    if (!correct && !noMedsSelected) {
      interval = setInterval(() => {
        setTime((prevTime) => prevTime + 1);
      }, 1000);
    }
  
    return () => clearInterval(interval);
  }, [correct, noMedsSelected]);
  
  //Fisher-Yates shuffle algorithm
  const shuffleArray = (arr: string[]) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      //swap elements with es6 destructuring
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  };

  const handlePress = (index: number) => {
    //If no tile is selected, select the current tile
    if (selectedIndex === null) {
      setSelectedIndex(index);
    } else {
      //this is the second tile selected, swap the letters
      //spread operator to create a copy of the tiles array
      const newTiles = [...tiles];
      //swap the letters in the array
      [newTiles[selectedIndex], newTiles[index]] = [newTiles[index], newTiles[selectedIndex]];
      setTiles(newTiles);
      //reset the selected index
      setSelectedIndex(null);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <View style = {styles.outer_container}>
      <Text style={styles.title}>Unscramble</Text>
      {noMedsSelected ? (
      <Text style={styles.correctText}>No medications remaining.</Text>
      ) : (
      <>
        <View style={styles.tileContainer}>
          {tiles.map((letter, i) => (
            <Pressable
              key={i}
              style={[
                styles.pressableContainer,
                selectedIndex === i && styles.selectedPressable
              ]}
              onPress={() => handlePress(i)}
            >
              <Block 
                text={letter} 
                imgSource={TileImage} 
                containerStyle={styles.character}
                textStyle={styles.tileText}
              />
            </Pressable>
          ))}
        </View>
        {correct && <Text style={styles.correctText}>✅ Correct!</Text>}
        <Text style={styles.timerText}>Time: {formatTime(time)} seconds</Text>
        {correct && <Text style={styles.correctText}>Score: {Math.max((100 - time) * 10, 0)}</Text>}
        {/* {correct && (
          <Block 
            text={"Continue"} 
            imgSource={NextButton} 
            containerStyle={styles.NextButton}
            textStyle={styles.tileText} 
          />
        )} */}
      </>
    )}
    </View>
  );
}

const styles = StyleSheet.create({
  outer_container: {
    flex: 1,
    backgroundColor: "#7CB5DD",
    alignItems: 'center', 
  },

  // Remove absolute positioning
  title: {
    fontSize: 40,
    fontFamily: 'pixelRegular',
    color: 'white',
    marginTop: 75, // Same visual position
    marginBottom: 30,
  },

  tileContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },

  tileText: {
    fontSize: 24,
  },
  
  correctText: {
    marginTop: 30,
    fontSize: 20,
    color: 'white',
    fontFamily: 'pixelRegular',
  },
  
  character: { 
    width: Math.min(screenWidth * 0.15, screenHeight * 0.15),
    height: Math.min(screenWidth * 0.15, screenHeight * 0.15), 
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
  },

  NextButton: { 
    width: 230,
    height: 75,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
  },

  pressableContainer: {
    borderWidth: 0,
    borderRadius: 10,
  },

  selectedPressable: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)', // Semi-transparent white
    borderRadius: 10,
  },

  timerText: {
    fontSize: 20,
    color: 'white',
    fontFamily: 'pixelRegular',
    marginTop: 20,
    marginBottom: 15, // Add space between timer and continue button
  },
});
