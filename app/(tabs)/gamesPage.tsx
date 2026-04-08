import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ImageBackground, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { styles } from '@/styles/auth.styles';
const PlaceholderImage = require('@/assets/images/Containers/contTest3.png');
import { Link } from "expo-router"

export default function Tab() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={localStyles.title}>Games</Text>
      <ScrollView style={{marginTop: 150, marginBottom: 150}} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => router.push({ pathname: '../gamesPageItems/matchGamePlay'})}>
          <ImageBackground
            source={require('../../assets/images/Containers/matchCont.png')}
            style={localStyles.container}
            >
          </ImageBackground>
        </TouchableOpacity>
        <TouchableOpacity >
            <Link href = "../gamesPageItems/unscramble_game_final" asChild> 
              <Pressable>
                <ImageBackground
                source={require('../../assets/images/Containers/unscrambleCont.png')}
                style={localStyles.container}
                ></ImageBackground>
              </Pressable>
            </Link>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push({ pathname: '../gamesPageItems/qaGame'})}>
          <ImageBackground
            source={require('../../assets/images/Containers/squareCont.png')}
            style={localStyles.container}
          >
            <View style={localStyles.qaInner}>
              <Text style={localStyles.qaTitle}>Q&A</Text>
              <View style={localStyles.qaSymbols}>
                <View style={localStyles.qaChip}><Text style={localStyles.qaChipText}>?</Text></View>
                <View style={localStyles.qaChip}><Text style={localStyles.qaChipText}>!</Text></View>
                <View style={localStyles.qaChip}><Text style={localStyles.qaChipText}>✓</Text></View>
              </View>
              <Text style={localStyles.qaSubtitle}>MEDICATION QUIZ</Text>
            </View>
          </ImageBackground>
        </TouchableOpacity>
        <TouchableOpacity >
          <ImageBackground
            source={require('../../assets/images/Containers/sortCont.png')}
            style={localStyles.container}
            >
          </ImageBackground>
        </TouchableOpacity>

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
  
  container: {
    width: 330, 
    height: 210, 
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
  qaInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qaTitle: {
    fontSize: 52,
    fontFamily: 'pixelRegular',
    color: '#1a1a2e',
    marginBottom: 10,
    letterSpacing: 2,
  },
  qaSymbols: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  qaChip: {
    width: 48,
    height: 48,
    backgroundColor: '#f5a623',
    borderRadius: 6,
    borderWidth: 3,
    borderColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qaChipText: {
    fontFamily: 'pixelRegular',
    fontSize: 22,
    color: '#1a1a2e',
    fontWeight: 'bold',
  },
  qaSubtitle: {
    fontSize: 14,
    fontFamily: 'pixelRegular',
    color: '#2E6DA4',
  },
});