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
});