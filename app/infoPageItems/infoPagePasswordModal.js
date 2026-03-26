import React, { useState, useEffect } from 'react';
import { View, TextInput, Button, StyleSheet, Text, Alert, ImageBackground, TouchableOpacity, Keyboard } from 'react-native';
import Modal from 'react-native-modal';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import medSelection from '../infoPageItems/medicationSelection.tsx';
import { useRouter } from 'expo-router';

const Stack = createNativeStackNavigator();


const PasswordModal = ({ isVisible, onClose, onPasswordCorrect }) => {
  const router = useRouter();

  const [password, setPassword] = useState('');
  const correctPassword = 'password'; 

  useEffect(() => {
    if (!isVisible) {
      setTimeout(() => setPassword(''), 300);
    }
  }, [isVisible]);

  const handlePasswordSubmit = () => {
    if (password === correctPassword) {
      setTimeout(() => onPasswordCorrect(), 50);
      Keyboard.dismiss();
      router.navigate('../infoPageItems/medicationSelection');
    } else {
      Alert.alert('Incorrect Password');
    }
  };

  return (
    <Modal isVisible={isVisible} onBackdropPress={onClose} animationInTiming={150} animationOutTiming={300} backdropColor='transparent'>
      <View style={styles.modalContainer}>
        <ImageBackground
          source={require('../../assets/images/Containers/contModal.png')}
          style={{ width: 342, height: 342, justifyContent: 'center', alignItems: 'center', shadowColor: '#000',  shadowOpacity: 0.75, shadowRadius: 10, elevation: 5, }}
          >
          <Text style={styles.title}>Enter Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            returnKeyType='done'
            onSubmitEditing={handlePasswordSubmit}
            autoCorrect={false}
            keyboardType='web-search'
            autoCapitalize='none'
          />
          <TouchableOpacity onPress={handlePasswordSubmit}>
            <Text style={styles.button}>Submit</Text>
          </TouchableOpacity>
        </ImageBackground>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    padding: 20,
    borderRadius: 10,
  },
  title: {
    fontSize: 25,
    marginBottom: 20,
    fontFamily: 'pixelRegular'
  },
  input: {
    width: '80%',
    padding: 10,
    borderWidth: 6,
    borderColor: '#ccc',
    color: '#000',
    fontFamily: 'pixelRegular',
    fontSize: 20,
    marginBottom: 20,
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
  }
});

export default PasswordModal;