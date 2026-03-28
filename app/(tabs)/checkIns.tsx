import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';

export default function CheckIns() {
  const hasPendingUpdate = true;
  const [modalVisible, setModalVisible] = useState(false);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);
  const userAge = 19; // change later
  

  const handleOpenUpdate = () => {
    if (userAge < 18) {
      setPinModalVisible(true);
    } else {
      setConsentGiven(false);
      setModalVisible(true);
    }
  };

  const handleSubmitPin = () => {
    if (enteredPin === '1234') {
      setEnteredPin('');
      setPinModalVisible(false);
      setConsentGiven(false);
      setModalVisible(true);
    } else {
      alert('Incorrect PIN');
    }
  };

  const handleCancelPin = () => {
    setEnteredPin('');
    setPinModalVisible(false);
  };

  const handleCloseUpdate = () => {
    setConsentGiven(false);
    setModalVisible(false);
  };

  const handleApplyChange = () => {
    if (!consentGiven) {
      alert('You must give consent before applying this medication change.');
      return;
    }

    alert('Medication change applied.');
    setConsentGiven(false);
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Check Ins</Text>

      {hasPendingUpdate ? (
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.alert}>!</Text>
            <View style={styles.textBox}>
              <Text style={styles.title}>Medication update available</Text>
              <Text style={styles.description}>
                A doctor has requested a medication change. Review and consent are needed before the update is applied.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleOpenUpdate}
          >
            <Text style={styles.buttonText}>Open Update</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.emptyText}>No new check-ins right now.</Text>
      )}

      <Modal
        visible={pinModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCancelPin}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Parental Approval Required</Text>

            <Text style={styles.modalText}>
              Enter parent PIN to continue
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Enter PIN"
              secureTextEntry
              value={enteredPin}
              onChangeText={setEnteredPin}
            />

            <TouchableOpacity
              style={styles.button}
              onPress={handleSubmitPin}
            >
              <Text style={styles.buttonText}>Submit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleCancelPin}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseUpdate}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Pending Medication Change</Text>

            <Text style={styles.modalText}>
              Medication: Tacrolimus
            </Text>
            <Text style={styles.modalText}>
              Current dosage: 5mg
            </Text>
            <Text style={styles.modalText}>
              New dosage: 10mg
            </Text>
            <Text style={styles.modalText}>
              Requested by: Provider
            </Text>

            <TouchableOpacity
              style={styles.consentRow}
              onPress={() => setConsentGiven(!consentGiven)}
            >
              <View style={[styles.checkbox, consentGiven && styles.checkedBox]}>
                {consentGiven && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.consentText}>
                I consent to this medication change
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={handleApplyChange}
            >
              <Text style={styles.buttonText}>Apply Change</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleCloseUpdate}
            >
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 24,
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 40,
    marginBottom: 24,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#f7f7f7',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  alert: {
    fontSize: 30,
    fontWeight: '700',
    color: '#d9534f',
    marginRight: 12,
    lineHeight: 34,
  },
  textBox: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  description: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#4c8bf5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButton: {
    backgroundColor: '#4c8bf5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#777',
    marginTop: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    marginBottom: 10,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
  },

  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 1.5,
    borderColor: '#4c8bf5',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: '#fff',
  },

  checkedBox: {
    backgroundColor: '#4c8bf5',
  },

  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  consentText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
});