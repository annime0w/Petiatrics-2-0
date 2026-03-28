import React from "react";
import { View, Image, TouchableOpacity, ImageBackground } from "react-native";

const HatIconButton = ({iconImage, onPress }) => {
  
  
    return (
    <TouchableOpacity onPress={onPress} style={{ width: 90, height: 66}}>
        <ImageBackground
          source={iconImage}
          style={{width: 90, height: 66,}}
          >
        </ImageBackground>
    </TouchableOpacity>
  );
}

export default HatIconButton;

