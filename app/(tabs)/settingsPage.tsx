import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';

import { styles } from '@/styles/auth.styles';

import React, { useState, useEffect } from 'react';

export default function Settings() {
  const router = useRouter();
  const [soundState, setSoundState] = useState(true);
  const [musicState, setMusicState] = useState(true);
  const [vibrationState, setVibrationState] = useState(true);

  const setSound = () => {
    // console.log("SoundState should change to: ");
    // if (!soundState) console.log("On"); else console.log("Off");
    setSoundState(!soundState);
  };

  const setMusic = () => {
    // console.log("MusicState should change to: ");
    // if (!musicState) console.log("On"); else console.log("Off");
    setMusicState(!musicState);
  };

  const setVibration = () => {
    // console.log("VibrationState should change to: ");
    // if (!vibrationState) console.log("On"); else console.log("Off");
    setVibrationState(!vibrationState);
  };

  return (
    <View style={styles.container}>
      <Text style={localStyles.title}>Settings</Text>
      <View style={localStyles.section}>
        <ImageBackground source={require('../../assets/images/Containers/contTest3.png')} style={localStyles.container}>
          <TouchableOpacity onPress={() => setSound()} style={localStyles.textContainer}>
            <Text style={[localStyles.button, localStyles.leftAlign]}>
              Sound
            </Text>
            <Text style={[localStyles.button, localStyles.rightAlign]}>
              {soundState ? "✅ " : "⬜ "}
            </Text>
          </TouchableOpacity>
        </ImageBackground>
        <ImageBackground source={require('../../assets/images/Containers/contTest3.png')} style={localStyles.container}>
          <TouchableOpacity onPress={() => setMusic()} style={localStyles.textContainer}>
            <Text style={[localStyles.button, localStyles.leftAlign]}>
              Music
            </Text>
            <Text style={[localStyles.button, localStyles.rightAlign]}>
              {musicState ? "✅ " : "⬜ "}
            </Text>
          </TouchableOpacity>
        </ImageBackground>
        <ImageBackground source={require('../../assets/images/Containers/contTest3.png')} style={localStyles.container}>
          <TouchableOpacity onPress={() => setVibration()} style={localStyles.textContainer}>
            <Text style={[localStyles.button, localStyles.leftAlign]}>
              Vibration
            </Text>
            <Text style={[localStyles.button, localStyles.rightAlign]}>
              {vibrationState ? "✅ " : "⬜ "}
            </Text>
          </TouchableOpacity>
        </ImageBackground>
      </View>
        <ImageBackground source={require('../../assets/images/Containers/contTest3.png')} style={localStyles.container}>
          <TouchableOpacity onPress={() => router.push('../settingsPageItems/ConsentPage')} style={localStyles.textContainer}>
            <Text style={[localStyles.button, localStyles.leftAlign]}>Consent</Text>
            <Text style={[localStyles.button, localStyles.rightAlign]}>📋 </Text>
          </TouchableOpacity>
        </ImageBackground>
        <ImageBackground source={require('../../assets/images/Containers/contTest3.png')} style={localStyles.container}>
          <TouchableOpacity onPress={() => router.push('../infoPageItems/AdminQuestions')} style={localStyles.textContainer}>
            <Text style={[localStyles.button, localStyles.leftAlign]}>Q Bank</Text>
            <Text style={[localStyles.button, localStyles.rightAlign]}>✏️ </Text>
          </TouchableOpacity>
        </ImageBackground>
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
    top: -16,
  },
  textContainer: {
    width: 330,
    height: 80,
    alignItems: 'center',
    alignSelf: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingLeft: 20,
    paddingRight: 20,
  },
  button: {
    fontSize: 40,
    fontFamily: 'pixelRegular',
    color: 'black',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  section: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    alignSelf: 'center',
  },
  leftAlign: {
    textAlign: 'left',
  },
  rightAlign: {
    textAlign: 'right',
  },
});
