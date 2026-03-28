import { View, Text, StyleSheet, ImageBackground, ActivityIndicator, TouchableOpacity } from 'react-native';
import React, { act, useEffect, useState } from 'react';
import { styles } from '@/styles/auth.styles';
import { SpriteLayer, SegmentedLayeredSprite } from '../petPageItems/catAnimation.js';
import { basicLoop, heartPop, layingDown, hatBasicLoop } from '../petPageItems/animationSequences.js'
import CatIconButton from '../petPageItems/catIconButtons.js';
import HatIconButton from '../petPageItems/hatIconButtons.js';
import { useUser } from '@/context/UserContext';
import { eq, inArray } from 'drizzle-orm';
import { useSQLiteContext } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from '@/db/schema';

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

export default function PetPage() {
  const db = useSQLiteContext();
  const drizzleDb = drizzle(db, { schema});
  const { user } = useUser();
  const { updateUser } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState("colorSelect");
  const [startAnimation, setStartAnimation] = useState(false);

  const [catColor, setCatColor] = useState('');
  const [spriteSheetImage, setSpriteSheetImage] = useState(
    require("../petPageItems/spritesheets/multiSprite.png")
  );
  const [hatSpriteImage, setHatSpriteImage] = useState(require("../petPageItems/spritesheets/hats/bearSprite.png"));
  
  const [catHat, setCatHat] = useState('');
  useEffect(() => {
    if (spriteSheetImage && hatSpriteImage) {
      setStartAnimation(false); // Reset just in case
      console.log("animation paused")
      setTimeout(() => {
        setStartAnimation(true);
        console.log("animation started"); // Trigger both at the same time
      }, 0); // slight delay to allow React to apply changes
    }
  }, [spriteSheetImage, hatSpriteImage]);
  useEffect(() => {
    const loadCat = async () => {
      if (!user) return;
      console.log("user:", user);
  
      try {
        const catLink = await drizzleDb
          .select()
          .from(schema.catColors)
          .where(eq(schema.catColors.id, user.activeCatColorId))
          .get();
        console.log("catLink:", catLink);
        const catColorId = catLink.spriteURL.toString();
        const cleanSpriteKey = catColorId.replace(".png", "");
        console.log("Clean sprite key:", cleanSpriteKey);

        const hatLink = await drizzleDb
          .select()
          .from(schema.catHats)
          .where(eq(schema.catHats.id, user.activeCatHatId))
          .get();
        console.log("hatLink:", hatLink);
        const catHatId = hatLink.spriteURL.toString();
        const cleanHatSpriteKey = catHatId.replace(".png", "");

  
        setCatColor(cleanSpriteKey);
        setCatHat(cleanHatSpriteKey);
        setSpriteSheetImage(catSprites[cleanSpriteKey as keyof typeof catSprites]);
        setHatSpriteImage(hatSprites[cleanHatSpriteKey as keyof typeof hatSprites]);
        console.error("Error loading cat sprite:", error);
      } finally {
        setIsLoading(false);
      }
    };
  
    loadCat();
  }, [user?.activeCatColorId, user?.activeCatHatId]);

  useEffect(() => {
    console.log("Updated cat color:", catColor);
  }, [catColor]);
  
  useEffect(() => {
    console.log("Updated cat hat:", catHat);
  }, [catHat]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  const handleCatIconPress = async (spriteKey, spriteImg, activeCatColorId) => {
    setSpriteSheetImage(spriteImg);
    setCatColor(spriteKey);
    console.log("catColorId:", activeCatColorId);
    console.log("catColor:", spriteKey);
  
    // Directly update user with the provided catColorId
    await drizzleDb
      .update(schema.users)
      .set({ activeCatColorId: activeCatColorId })  // make sure your column is called catColorId
      .where(eq(schema.users.id, user.id));
    updateUser({ activeCatColorId: activeCatColorId });
  };

  const handleHatIconPress = async (spriteKey, spriteImg, activeCatHatId) => {
    setHatSpriteImage(spriteImg);
    setCatHat(spriteKey);
    console.log("catHatId:", activeCatHatId);
    console.log("catHat:", spriteKey);
  
    // Directly update user with the provided catHatId
    await drizzleDb
      .update(schema.users)
      .set({ activeCatHatId: activeCatHatId })  
      .where(eq(schema.users.id, user.id));
    updateUser({ activeCatHatId: activeCatHatId });
  };

  return (
    <View style={styles.container}>
      <Text style={localStyles.title}>My Pet</Text>
        <View style={localStyles.stackContainer}>
          <View style={{justifyContent: 'center', alignItems: 'center',width: 208, height: 208, marginBottom: -30}}>
            <SegmentedLayeredSprite 
              width={208} 
              height={208} 
              animationSequence={basicLoop}
            >
              <SpriteLayer 
                spriteSheetImage={spriteSheetImage} 
                frameWidth={208} 
                frameHeight={208} 
                frameCount={56} 
              />
              <SpriteLayer 
                spriteSheetImage={hatSpriteImage} 
                frameWidth={208} 
                frameHeight={208} 
                frameCount={56} 
              />
            </SegmentedLayeredSprite>
          </View>
          <ImageBackground
            source={require('../../assets/images/Containers/squareCont.png')}
            style={localStyles.containerImage}>
              {view === "colorSelect" ? (
                <View style={localStyles.caticonRow}>
                  <CatIconButton
                    iconImage={require("../petPageItems/catIcons/multiCatIcon.png")}
                    onPress={() => handleCatIconPress("multiSprite", catSprites.multiSprite, 5)}
                  />
                  <CatIconButton
                    iconImage={require("../petPageItems/catIcons/tuxedoCatIcon.png")}
                    onPress={() => handleCatIconPress("tuxedoSprite", catSprites.tuxedoSprite, 9)}
                  />
                  <CatIconButton
                    iconImage={require("../petPageItems/catIcons/blackCatIcon.png")}
                    onPress={() => handleCatIconPress("blackSprite", catSprites.blackSprite, 1)}
                  />
                  <CatIconButton
                    iconImage={require("../petPageItems/catIcons/sphinxCatIcon.png")}
                    onPress={() => handleCatIconPress("sphinxSprite", catSprites.sphinxSprite, 7)}
                  />
                  <CatIconButton
                    iconImage={require("../petPageItems/catIcons/whiteCatIcon.png")}
                    onPress={() => handleCatIconPress("whiteSprite", catSprites.whiteSprite, 2)}
                  />
                  <CatIconButton
                    iconImage={require("../petPageItems/catIcons/tabbyCatIcon.png")}
                    onPress={() => handleCatIconPress("tabbySprite", catSprites.tabbySprite, 8)}
                  />
                  <CatIconButton
                    iconImage={require("../petPageItems/catIcons/siameseCatIcon.png")}
                    onPress={() => handleCatIconPress("siameseSprite", catSprites.siameseSprite, 6)}
                  />
                  <CatIconButton
                    iconImage={require("../petPageItems/catIcons/orangeCatIcon.png")}
                    onPress={() => handleCatIconPress("orangeSprite", catSprites.orangeSprite, 4)}
                  />
                  <CatIconButton
                    iconImage={require("../petPageItems/catIcons/grayCatIcon.png")}
                    onPress={() => handleCatIconPress("graySprite", catSprites.graySprite, 3)}
                  />
                  </View>
              ) : (
                <View style={localStyles.haticonRow}>
                  <HatIconButton
                    iconImage={require("../petPageItems/hatIcons/bearHatIcon.png")}
                    onPress={() => handleHatIconPress("bearSprite", hatSprites.bearSprite, 1)}
                  />
                  <HatIconButton
                    iconImage={require("../petPageItems/hatIcons/frogHatIcon.png")}
                    onPress={() => handleHatIconPress("frogSprite", hatSprites.frogSprite, 2)}
                  />
                  <HatIconButton
                    iconImage={require("../petPageItems/hatIcons/orangeHatIcon.png")}
                    onPress={() => handleHatIconPress("orangeSprite", hatSprites.orangeSprite, 3)}
                  />
                  <HatIconButton
                    iconImage={require("../petPageItems/hatIcons/constructionHatIcon.png")}
                    onPress={() => handleHatIconPress("constructionSprite", hatSprites.constructionSprite, 4)}
                  />
                  <HatIconButton
                    iconImage={require("../petPageItems/hatIcons/appleHatIcon.png")}
                    onPress={() => handleHatIconPress("appleSprite", hatSprites.appleSprite, 5)}
                  />
                  <HatIconButton
                    iconImage={require("../petPageItems/hatIcons/crownHatIcon.png")}
                    onPress={() => handleHatIconPress("crownSprite", hatSprites.crownSprite, 6)}
                  />
                  <HatIconButton
                    iconImage={require("../petPageItems/hatIcons/flowersHatIcon.png")}
                    onPress={() => handleHatIconPress("flowerSprite", hatSprites.flowerSprite, 8)}
                  />
                  <HatIconButton
                    iconImage={require("../petPageItems/hatIcons/cowboyHatIcon.png")}
                    onPress={() => handleHatIconPress("cowboySprite", hatSprites.cowboySprite, 9)}
                  />
                  <HatIconButton
                    iconImage={require("../petPageItems/hatIcons/birthdayHatIcon.png")}
                    onPress={() => handleHatIconPress("noneSprite", hatSprites.noneSprite, 7)}
                  />
                </View>
              )}
          </ImageBackground>

          <View style={localStyles.tabs}>
            <TouchableOpacity onPress={() => setView('colorSelect')} style={localStyles.tabButton}>
              <Text style={[localStyles.tabText, view === 'colorSelect' && localStyles.activeTab]}>COLORS</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setView('hatSelect')} style={localStyles.tabButton}>
              <Text style={[localStyles.tabText, view === 'hatSelect' && localStyles.activeTab]}>HATS</Text>
            </TouchableOpacity>
          </View>
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
  stackContainer: {
    marginTop: 155,
    marginBottom: 150,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center', // optional: add space between stacked items
  },
  catSprite: {
    width: 208,
    height: 208,
    marginBottom: -50,
    marginTop: 10, // Adjust this value to control the space between the sprite and the container
    zIndex: 1, // Ensure the sprite is above the container
    position: 'absolute',
  },
  hatSprite: {
    width: 208,
    height: 208,
    marginBottom: -50,
    marginTop: 10, // Adjust this value to control the space between the sprite and the container
    zIndex: 4, // Ensure the sprite is above the container
    position: 'absolute',
  },
  containerImage: {
    width: 330,
    height: 330,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caticonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 20,
    marginTop: 5,
    zIndex: 2, // Ensure the icons are above the container
  },
  haticonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    marginTop: 5,
    zIndex: 2, // Ensure the icons are above the container
  },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'space-around',

  },
  tabButton: {
    // borderWidth: 6,
    margin: 3,
    marginTop: -6,
    zIndex: 0,
  },
  activeTab: {
    fontSize: 30,
    fontFamily: 'pixelRegular',
    color: 'white',
    backgroundColor: '#1e1c40',
    padding: 6,
    borderWidth: 6,
    borderColor: '#1e1c40',
    fontWeight: 'bold',
  },
  tabText: {
    fontWeight: 'bold',
    fontSize: 30,
    fontFamily: 'pixelBold',
    color: '#1e1c40',
    backgroundColor: 'white',
    padding: 6,
    paddingBottom: 0,
    paddingTop: 0,
    borderWidth: 6,
    borderColor: '#1e1c40'
  },
});