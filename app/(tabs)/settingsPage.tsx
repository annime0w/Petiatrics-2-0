import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, Modal, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { styles } from '@/styles/auth.styles';
import React, { useState } from 'react';
import { useUser } from '@/context/UserContext';

const STAFF_PIN = '1234'; // change this later

export default function Settings() {
  const router = useRouter();
  const { user } = useUser();

  const [soundState, setSoundState] = useState(true);
  const [musicState, setMusicState] = useState(true);
  const [vibrationState, setVibrationState] = useState(true);

  const [staffModalVisible, setStaffModalVisible] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState('');

  const setSound = () => setSoundState(!soundState);
  const setMusic = () => setMusicState(!musicState);
  const setVibration = () => setVibrationState(!vibrationState);

  

  const openStaffModal = () => {
    setEnteredPin('');
    setPinError('');
    setStaffModalVisible(true);
  };

  const closeStaffModal = () => {
    setEnteredPin('');
    setPinError('');
    setStaffModalVisible(false);
  };

  const handleStaffLogin = () => {
    if (enteredPin === STAFF_PIN) {
      closeStaffModal();
      router.push('../settingsPageItems/ManageQuestions');
    } else {
      setPinError('Incorrect PIN');
    }
  };


  return (
    <View style={styles.container}>
      <TouchableOpacity onLongPress={openStaffModal} activeOpacity={1} style={{ alignSelf: 'center' }}>
        <Text style={localStyles.title}>Settings</Text>
      </TouchableOpacity>

      <View style={localStyles.section}>
        <ImageBackground source={require('../../assets/images/Containers/contTest3.png')} style={localStyles.container}>
          <TouchableOpacity onPress={setSound} style={localStyles.textContainer}>
            <Text style={[localStyles.button, localStyles.leftAlign]}>Sound</Text>
            <Text style={[localStyles.button, localStyles.rightAlign]}>
              {soundState ? '✅ ' : '⬜ '}
            </Text>
          </TouchableOpacity>
        </ImageBackground>

        <ImageBackground source={require('../../assets/images/Containers/contTest3.png')} style={localStyles.container}>
          <TouchableOpacity onPress={setMusic} style={localStyles.textContainer}>
            <Text style={[localStyles.button, localStyles.leftAlign]}>Music</Text>
            <Text style={[localStyles.button, localStyles.rightAlign]}>
              {musicState ? '✅ ' : '⬜ '}
            </Text>
          </TouchableOpacity>
        </ImageBackground>

        <ImageBackground source={require('../../assets/images/Containers/contTest3.png')} style={localStyles.container}>
          <TouchableOpacity onPress={setVibration} style={localStyles.textContainer}>
            <Text style={[localStyles.button, localStyles.leftAlign]}>Vibration</Text>
            <Text style={[localStyles.button, localStyles.rightAlign]}>
              {vibrationState ? '✅ ' : '⬜ '}
            </Text>
          </TouchableOpacity>
        </ImageBackground>

        <ImageBackground source={require('../../assets/images/Containers/contTest3.png')} style={localStyles.container}>
          <TouchableOpacity onPress={() => router.push('../settingsPageItems/ConsentPage')} style={localStyles.textContainer}>
            <Text style={[localStyles.button, localStyles.leftAlign]}>Consent</Text>
            <Text style={[localStyles.button, localStyles.rightAlign]}>📋 </Text>
          </TouchableOpacity>
        </ImageBackground>
      </View>

      <Modal
        visible={staffModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeStaffModal}
      >
        <View style={localStyles.modalOverlay}>
          <View style={localStyles.modalBox}>
            <Text style={localStyles.modalTitle}>Staff Access</Text>

            <TextInput
              style={localStyles.input}
              placeholder="Enter staff PIN"
              secureTextEntry
              value={enteredPin}
              onChangeText={(text) => {
                setEnteredPin(text);
                if (pinError) setPinError('');
              }}
            />

            {pinError ? <Text style={localStyles.errorText}>{pinError}</Text> : null}

            <TouchableOpacity style={localStyles.modalButton} onPress={handleStaffLogin}>
              <Text style={localStyles.modalButtonText}>Enter</Text>
            </TouchableOpacity>

            <TouchableOpacity style={localStyles.cancelButton} onPress={closeStaffModal}>
              <Text style={localStyles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const localStyles = StyleSheet.create({
  title: {
    fontSize: 40,
    fontFamily: 'pixelRegular',
    color: 'white',
    marginTop: 75,
    marginBottom: 20,
    textAlign: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 28,
    fontFamily: 'pixelRegular',
    color: '#2E6DA4',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  errorText: {
    color: '#d9534f',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: '#4c8bf5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  cancelButton: {
    backgroundColor: '#7a7a7a',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});