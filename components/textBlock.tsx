import { StyleSheet, View, Text, ImageBackground} from 'react-native';
import { type ImageSource } from 'expo-image';

//properties to pass into exportable function
type Props = {
    imgSource: ImageSource; 
    text: string;
    containerStyle?: object; //not explicity used but can be passed in "?"
    textStyle?: object;
  };
  
//pass in the image to use as the background and the text to write over it 
export default function Block({imgSource, text, containerStyle, textStyle}: Props){
    return (
        <View>
            <ImageBackground 
                source = {imgSource}
                style={[styles.alignment, containerStyle]}>
                <Text style={[styles.text, textStyle]}>{text}</Text>
            </ImageBackground>
        </View>
    );
}

const styles = StyleSheet.create({
    text: {
        fontSize: 24,
        fontFamily: 'pixelRegular',
        color: 'black',
    },

    alignment: {
        width: 330, 
        height: 108, 
        alignItems: 'center', 
        alignSelf: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        //flexWrap: 'wrap',
        margin: 3,
    },
});
