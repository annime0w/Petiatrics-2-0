import React from "react";
import { View, Image, TouchableOpacity, ImageBackground } from "react-native";

const CatIconButton = ({iconImage, onPress }) => {
  
  
    return (
    <TouchableOpacity onPress={onPress} style={{ width: 70, height: 60}}>
        <ImageBackground
          source={iconImage}
          style={{width: 66, height: 60,}}
          >
        </ImageBackground>
    </TouchableOpacity>
  );
}

export default CatIconButton;

