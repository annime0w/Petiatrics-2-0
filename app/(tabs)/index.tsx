import { View, Text, StyleSheet, TouchableWithoutFeedback, ActivityIndicator  } from 'react-native';
import { styles } from '@/styles/auth.styles';
import * as Font from 'expo-font';
import { useEffect, useState } from 'react';
import fonts from '../../assets/fonts.js';
import React from 'react';
import { basicLoop, heartPop, layingDown } from '../petPageItems/animationSequences.js'

import { useSQLiteContext } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from '@/db/schema';
import { useDrizzleStudio } from 'expo-drizzle-studio-plugin';


import  { SpriteSheet, SegmentedLayeredSprite, SpriteLayer } from '../petPageItems/catAnimation.js';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '@/context/UserContext';
import { eq, inArray } from 'drizzle-orm';


export default function MainPage() {
  const db = useSQLiteContext();
  const drizzleDb = drizzle(db, { schema});
  useDrizzleStudio(db);

  const [fontsLoaded, setFontsLoaded] = useState(false);

  const { setUser } = useUser();
  const { user } = useUser();

  const [catColor, setCatColor] = useState('multiSprite');
  const [catHat, setCatHat] = useState('birthdaySprite');
  const [isLoading, setIsLoading] = useState(true);  // New loading state
  
  useEffect(() => {
    const loadApp = async () => {
      try {
        // Load fonts
        await Font.loadAsync({
          "pixelRegular": fonts.pixelRegular,
          "pixelBold": fonts.pixelBold,
          "pixelMedium": fonts.pixelMedium,
        });
        setFontsLoaded(true);

        // Set demo user
        const demoUser = await drizzleDb.select().from(schema.users).where(eq(schema.users.id, 1)).get();
        await AsyncStorage.setItem('userId', demoUser.id.toString());
        setUser(demoUser);

        console.log("demoUser:", demoUser);
        console.log("activeCatColorId (should be a number):", demoUser.activeCatColorId);   

        // Fetch cat color from the database
        const catLink = await drizzleDb.select().from(schema.catColors).where(eq(schema.catColors.id, demoUser.activeCatColorId)).get();
        const catColorName = catLink.spriteURL.toString();
        const cleanSpriteKey = catColorName.replace('.png', '');
        setCatColor(cleanSpriteKey);

        const catLink2 = await drizzleDb.select().from(schema.catHats).where(eq(schema.catHats.id, demoUser.activeCatHatId)).get();
        const catHatName = catLink2.spriteURL.toString();
        const cleanSpriteKey2 = catHatName.replace('.png', '');
        setCatHat(cleanSpriteKey2);

        // After fetching all data, set loading to false
        setIsLoading(false);


      } catch (error) {
        console.error("Error loading app data:", error);
        setIsLoading(false); // Ensure to stop loading in case of error
      }
    };
  
    loadApp();
  }, [user?.activeCatColorId, user?.activeCatHatId]);

  const [isHeartActive, setIsHeartActive] = useState(false);

  const handleCatTap = () => {
    setIsHeartActive(true);
    setTimeout(() => {
      setIsHeartActive(false);
    }, 1200); // Duration of the heart animation
  };

  const catSprites = {
    orangeSprite: require('../petPageItems/spritesheets/orangeSprite.png'),
    blackSprite: require('../petPageItems/spritesheets/blackSprite.png'),
    whiteSprite: require('../petPageItems/spritesheets/whiteSprite.png'),
    graySprite: require('../petPageItems/spritesheets/graySprite.png'),
    multiSprite: require('../petPageItems/spritesheets/multiSprite.png'),
    tuxedoSprite: require('../petPageItems/spritesheets/tuxedoSprite.png'),
    sphinxSprite: require('../petPageItems/spritesheets/sphinxSprite.png'),
    siameseSprite: require('../petPageItems/spritesheets/siameseSprite.png'),
    tabbySprite: require('../petPageItems/spritesheets/tabbySprite.png'),
  }
  const hatSprites = {
    bearSprite: require('../petPageItems/spritesheets/hats/bearSprite.png'),
    frogSprite: require('../petPageItems/spritesheets/hats/frogSprite.png'),
    orangeSprite: require('../petPageItems/spritesheets/hats/orangeSprite.png'),
    constructionSprite: require('../petPageItems/spritesheets/hats/constructionSprite.png'),
    appleSprite: require('../petPageItems/spritesheets/hats/appleSprite.png'),
    crownSprite: require('../petPageItems/spritesheets/hats/crownSprite.png'),
    flowerSprite: require('../petPageItems/spritesheets/hats/flowerSprite.png'),
    cowboySprite: require('../petPageItems/spritesheets/hats/cowboySprite.png'),
    noneSprite: require('../petPageItems/spritesheets/hats/birthdaySprite.png'),
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }
        
  return (
    <View style={styles.container}>
      <Text style={localStyles.title}>
        {user ? `Welcome, ${user.name}!` : 'Welcome!'}
      </Text>
      <TouchableWithoutFeedback onPress={handleCatTap}>
        <View style={{justifyContent: 'center', alignItems: 'center', position: 'absolute', top: 150, width: 208, height: 208}}>
            <SpriteSheet
              spriteSheetImage={require('../petPageItems/spritesheets/heartPop.png')} // Your sprite sheet image
              frameWidth={208} // Width of one frame
              frameHeight={208} // Height of one frame
              animationSequence={heartPop} 
              frameNum={9}// Number of frames in the sprite sheet
              loop={false} // Loop the animation
              style={{position: 'absolute', top: 0, left: 30}}
              isActive={isHeartActive}
            />
          <SegmentedLayeredSprite 
            width={208} 
            height={208} 
            animationSequence={layingDown} // <-- cat's sequence
          >
            <SpriteLayer 
              spriteSheetImage={catSprites[catColor as keyof typeof catSprites]} 
              frameWidth={208} 
              frameHeight={208} 
              frameCount={56} 
            />
            <SpriteLayer 
              spriteSheetImage={hatSprites[catHat as keyof typeof hatSprites]} 
              frameWidth={208} 
              frameHeight={208} 
              frameCount={56} 
            />
          </SegmentedLayeredSprite>
        </View>
      </TouchableWithoutFeedback>
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
      textAlign: 'center',
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
    }

});