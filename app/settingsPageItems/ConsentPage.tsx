import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { eq } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { useUser } from '@/context/UserContext';

const CONSENT_VERSION = '1.0';

export default function ConsentPage() {
  const router = useRouter();
  const { user, updateUser } = useUser();

  const sqlite = useSQLiteContext();
  const db = useMemo(() => drizzle(sqlite, { schema }), [sqlite]);

  const [signedByName, setSignedByName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [signature, setSignature] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const ageGroup = user?.ageGroup ?? '';
  const isSelfConsent = ageGroup === '18-21';

  const canSave =
    !!user &&
    signedByName.trim().length > 0 &&
    signature.trim().length > 0 &&
    (isSelfConsent || relationship.trim().length > 0);

  const handleSaveConsent = async () => {
    if (!user) {
      Alert.alert('No patient found', 'Please log in or create a patient first.');
      return;
    }

    if (!canSave) {
      Alert.alert('Missing information', 'Please complete all required fields.');
      return;
    }

    setIsSaving(true);

    try {
      const signedAt = new Date().toISOString();

      await db.insert(schema.consentRecords).values({
        userId: user.id,
        patientName: user.name ?? user.username,
        signedByName: signedByName.trim(),
        relationshipToPatient: isSelfConsent ? null : relationship.trim(),
        signatureData: signature.trim(),
        consentVersion: CONSENT_VERSION,
        isSelfConsent,
        signedAt,
      });

      await db
        .update(schema.users)
        .set({ consentGiven: true })
        .where(eq(schema.users.id, user.id));

      updateUser({
        ...user,
        consentGiven: true,
      });

      Alert.alert('Consent saved', 'The consent was saved for this patient.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Consent could not be saved.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={localStyles.container}>
      <Text style={localStyles.title}>Consent Form</Text>

      <View style={localStyles.card}>
        <Text style={localStyles.label}>Patient name from database</Text>
        <Text style={localStyles.patientName}>
          {user?.name ?? user?.username ?? 'No patient selected'}
        </Text>

        <Text style={localStyles.label}>Consent text</Text>
        <Text style={localStyles.paragraph}>
          I confirm that I have read and understood the consent information for
          this patient to participate in the Petiatrics medication education app.
          Participation is voluntary and consent can be withdrawn.
        </Text>

        <Text style={localStyles.label}>
          {isSelfConsent ? 'Patient full name' : 'Parent / Guardian full name'} *
        </Text>
        <TextInput
          style={localStyles.input}
          value={signedByName}
          onChangeText={setSignedByName}
          placeholder="Type full name"
        />

        {!isSelfConsent && (
          <>
            <Text style={localStyles.label}>Relationship to patient *</Text>
            <TextInput
              style={localStyles.input}
              value={relationship}
              onChangeText={setRelationship}
              placeholder="Mother, Father, Guardian..."
            />
          </>
        )}

        <Text style={localStyles.label}>Signature *</Text>
        <TextInput
          style={localStyles.input}
          value={signature}
          onChangeText={setSignature}
          placeholder="Type signature"
        />

        <TouchableOpacity
          style={[localStyles.saveButton, !canSave && localStyles.disabledButton]}
          onPress={handleSaveConsent}
          disabled={!canSave || isSaving}
        >
          <Text style={localStyles.saveButtonText}>
            {isSaving ? 'Saving...' : 'Sign Consent'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={localStyles.backButton} onPress={() => router.back()}>
          <Text style={localStyles.backButtonText}>Back to Settings</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const localStyles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#7CB5DD',
    padding: 24,
    paddingTop: 80,
  },
  title: {
    fontSize: 36,
    fontFamily: 'pixelRegular',
    color: 'white',
    textAlign: 'center',
    marginBottom: 24,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 6,
    color: '#1a1a2e',
  },
  patientName: {
    fontSize: 20,
    color: '#2E6DA4',
    fontWeight: '700',
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  saveButton: {
    backgroundColor: '#2E6DA4',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  disabledButton: {
    backgroundColor: '#aaa',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  backButton: {
    alignItems: 'center',
    marginTop: 14,
  },
  backButtonText: {
    color: '#2E6DA4',
    fontSize: 16,
    fontWeight: '700',
  },
});