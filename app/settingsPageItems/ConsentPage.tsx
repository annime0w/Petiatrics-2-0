import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { eq } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { useUser } from '@/context/UserContext';

const CONSENT_VERSION = '1.0';
const SCROLL_THRESHOLD = 50;

const CONSENT_TEXT = `
INFORMED CONSENT / PARENTAL PERMISSION

Petiatrics: A Gamified Medication Education Program
Tampa General Hospital | University of South Florida Taneja College of Pharmacy

Principal Investigator: Christine Tabulov, PharmD, BCPPS

────────────────────────────────────────

1. Introduction

You are being asked to allow your child to take part in a research study using Petiatrics, a mobile app that uses a quiz-style game to help kidney transplant patients learn about their medications. Please read carefully before signing.

2. Purpose

The purpose of this study is to evaluate whether a gamified app can help pediatric kidney transplant patients better understand their transplant medications, including tacrolimus, mycophenolate, prednisone, and infection prevention medications.

3. Who Can Participate

Your child is being asked to participate because they are a kidney transplant patient between the ages of 11 and 21 who receives care at Tampa General Hospital.

4. What Will Happen

Your child will play a quiz game of 10–15 questions about their transplant medications during clinic visits. Each session takes approximately 15–20 minutes. The game will be repeated at follow-up visits to track learning progress.

5. Risks

Risks are minimal. There are no physical risks. Some patients may feel mild discomfort if questions about their illness cause momentary anxiety. All data is stored only on this device and is never sent to an external server.

6. Benefits

Your child may develop improved understanding of their transplant medications, better preparation for managing their own care as they transition to adult care, and potentially improved medication adherence.

7. Alternatives

Participation is not required. The alternative is standard medication education through verbal counseling and written materials. Medical care will not be affected by this decision.

8. Privacy & Confidentiality

No names, dates of birth, or medical record numbers are collected. Only age group, quiz responses, and session progress are stored — locally on this device only. Study data may be published in aggregate form with no identifying information.

9. Voluntary Participation

Participation is entirely voluntary. You or your child may stop at any time without any effect on medical care.

10. Contact Information

For questions about this study, contact:
Christine Tabulov, PharmD, BCPPS
ctabulov@usf.edu
USF Taneja College of Pharmacy

For questions about your rights as a research participant, contact the USF Institutional Review Board (IRB) at (813) 974-5638.

11. IRB Approval

This study has been reviewed and approved by the USF Institutional Review Board.

12. Agreement

By signing below, you confirm that you have read and understood the information above, have had the opportunity to ask questions, and agree to allow your child (or yourself, if age 17–21) to participate in this study.
`.trim();

export default function ConsentPage() {
  const router = useRouter();
  const { user, updateUser } = useUser();
  const expoDb = useSQLiteContext();
  const db = useMemo(() => drizzle(expoDb, { schema }), [expoDb]);

  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [printedName, setPrintedName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const isParental = user ? (parseInt(user.ageGroup ?? '17', 10) < 17 || !user.ageGroup) : true;

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const distFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    if (distFromBottom < SCROLL_THRESHOLD) {
      setHasScrolledToBottom(true);
    }
  };

  const canSubmit = hasScrolledToBottom && agreed && printedName.trim().length > 0 &&
    (!isParental || relationship.trim().length > 0);

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Error', 'No patient profile found. Please set up a patient profile first.');
      return;
    }
    if (!canSubmit) return;

    setIsSaving(true);
    try {
      const signedAt = new Date().toISOString();

      await db.insert(schema.consentRecords).values({
        userId: user.id,
        signedByName: printedName.trim(),
        relationshipToPatient: isParental ? relationship.trim() : null,
        signatureData: `typed:${printedName.trim()}`,
        consentVersion: CONSENT_VERSION,
        isSelfConsent: isParental ? 0 : 1,
        signedAt,
      });

      await db.update(schema.users)
        .set({ consentGiven: true })
        .where(eq(schema.users.id, user.id));

      updateUser({ ...user, consentGiven: true });
      setSaved(true);
    } catch (e) {
      console.error('Failed to save consent:', e);
      Alert.alert('Error', 'Failed to save consent. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (saved) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successIcon}>✓</Text>
        <Text style={styles.successTitle}>Consent Recorded</Text>
        <Text style={styles.successSub}>
          Thank you. Consent has been saved to this device.
        </Text>
        <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
          <Text style={styles.doneBtnText}>Back to Settings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Parental Consent</Text>
      </View>

      {/* Scroll gate hint */}
      {!hasScrolledToBottom && (
        <View style={styles.scrollHint}>
          <Text style={styles.scrollHintText}>↓ Scroll to read the full document before signing</Text>
        </View>
      )}

      {/* Consent text */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={100}
        showsVerticalScrollIndicator={true}
      >
        <Text style={styles.consentText}>{CONSENT_TEXT}</Text>
      </ScrollView>

      {/* Signature area */}
      <View style={styles.signatureArea}>
        {/* Checkbox */}
        <TouchableOpacity
          style={styles.checkRow}
          onPress={() => hasScrolledToBottom && setAgreed(!agreed)}
          disabled={!hasScrolledToBottom}
        >
          <View style={[styles.checkbox, agreed && styles.checkboxChecked, !hasScrolledToBottom && styles.checkboxDisabled]}>
            {agreed && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={[styles.checkLabel, !hasScrolledToBottom && styles.checkLabelDisabled]}>
            I have read and understand the consent document above
          </Text>
        </TouchableOpacity>

        {/* Name */}
        <Text style={styles.fieldLabel}>
          {isParental ? 'Parent / Guardian full name' : 'Patient full name'}
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Print full name"
          value={printedName}
          onChangeText={setPrintedName}
          editable={hasScrolledToBottom}
          placeholderTextColor="#aaa"
          autoCapitalize="words"
        />

        {/* Relationship (parents only) */}
        {isParental && (
          <>
            <Text style={styles.fieldLabel}>Relationship to patient</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Mother, Father, Legal Guardian"
              value={relationship}
              onChangeText={setRelationship}
              editable={hasScrolledToBottom}
              placeholderTextColor="#aaa"
              autoCapitalize="words"
            />
          </>
        )}

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit || isSaving}
        >
          {isSaving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.submitBtnText}>I Agree & Submit Consent</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8f9fb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  backBtn: {
    marginRight: 16,
  },
  backBtnText: {
    fontSize: 16,
    color: '#2E6DA4',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  scrollHint: {
    backgroundColor: '#2E6DA4',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  scrollHintText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  scrollArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  consentText: {
    fontSize: 14.5,
    lineHeight: 24,
    color: '#222',
    fontFamily: undefined, // system font intentionally
  },
  signatureArea: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    padding: 20,
    paddingBottom: 36,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: '#2E6DA4',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 1,
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#2E6DA4',
  },
  checkboxDisabled: {
    borderColor: '#ccc',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  checkLabel: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  checkLabelDisabled: {
    color: '#aaa',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    backgroundColor: '#fafafa',
    marginBottom: 12,
    color: '#1a1a2e',
  },
  submitBtn: {
    backgroundColor: '#2E6DA4',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  submitBtnDisabled: {
    backgroundColor: '#b0c4d8',
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  successContainer: {
    flex: 1,
    backgroundColor: '#f8f9fb',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  successIcon: {
    fontSize: 64,
    color: '#2E6DA4',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 10,
  },
  successSub: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  doneBtn: {
    backgroundColor: '#2E6DA4',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
  },
  doneBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
