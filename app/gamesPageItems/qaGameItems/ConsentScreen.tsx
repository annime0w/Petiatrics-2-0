import React, { useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  PanResponder,
  Alert,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import Svg, { Path } from 'react-native-svg';

interface ConsentScreenProps {
  userId: number;
  ageGroup: string; // '11-13' | '14-16' | '17-21'
  onConsented: () => void;
}

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
}

const CONSENT_VERSION = '1.0';
const SIGNATURE_PAD_HEIGHT = 150;
const SIGNATURE_PAD_WIDTH = 300;
const SCROLL_BOTTOM_THRESHOLD = 50;

function buildSVGPath(strokes: Stroke[]): string {
  return strokes
    .map((stroke) => {
      if (stroke.points.length === 0) return '';
      const [first, ...rest] = stroke.points;
      const moveTo = `M ${first.x.toFixed(1)} ${first.y.toFixed(1)}`;
      const lineTos = rest
        .map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
        .join(' ');
      return rest.length > 0 ? `${moveTo} ${lineTos}` : moveTo;
    })
    .filter(Boolean)
    .join(' ');
}

export default function ConsentScreen({
  userId,
  ageGroup,
  onConsented,
}: ConsentScreenProps) {
  const sqliteContext = useSQLiteContext();
  const db = useMemo(() => drizzle(sqliteContext, { schema }), [sqliteContext]);

  const isSelfConsent = ageGroup === '17-21';
  const isParental = !isSelfConsent;

  // Scroll state
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const scrollIndicatorOpacity = useRef(new Animated.Value(1)).current;

  // Checkbox
  const [checked, setChecked] = useState(false);

  // Signature
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const currentStroke = useRef<Point[]>([]);
  const [hasSignature, setHasSignature] = useState(false);

  // Text inputs
  const [printedName, setPrintedName] = useState('');
  const [relationship, setRelationship] = useState('');

  // Saving state
  const [isSaving, setIsSaving] = useState(false);

  // Derived: can agree
  const canAgree =
    hasScrolledToBottom &&
    checked &&
    printedName.trim().length > 0 &&
    hasSignature &&
    (!isParental || relationship.trim().length > 0);

  // Replace pronoun based on consent type
  const pronoun = isSelfConsent ? 'yourself' : 'your child';
  const childPronoun = isSelfConsent ? 'yourself' : 'your child';

  const sections = [
    {
      title: '1. Introduction',
      body: `You are being asked to allow ${childPronoun} to take part in a research study using Petiatrics, a mobile app that uses a quiz-style game to help kidney transplant patients learn about their medications. Please read carefully before signing.`,
    },
    {
      title: '2. Purpose',
      body: `The purpose of this study is to evaluate whether a gamified app can help pediatric kidney transplant patients better understand their transplant medications, including tacrolimus, mycophenolate, prednisone, and infection prevention medications.`,
    },
    {
      title: '3. Who Can Participate',
      body: `${isSelfConsent ? 'You are' : 'Your child is'} being asked to participate because ${isSelfConsent ? 'you are' : 'they are'} a kidney transplant patient between the ages of 11 and 21 who receives care at Tampa General Hospital.`,
    },
    {
      title: '4. What Will Happen',
      body: `${isSelfConsent ? 'You' : 'Your child'} will play a quiz game of 10–15 questions about ${isSelfConsent ? 'your' : 'their'} transplant medications during clinic visits. Each session takes approximately 15–20 minutes. The game will be repeated at follow-up visits to track learning progress.`,
    },
    {
      title: '5. Risks',
      body: `Risks are minimal. There are no physical risks. Some patients may feel mild discomfort if questions about their illness cause momentary anxiety. All data is stored only on this device and is never sent to an external server.`,
    },
    {
      title: '6. Benefits',
      body: `${isSelfConsent ? 'You' : 'Your child'} may develop improved understanding of ${isSelfConsent ? 'your' : 'their'} transplant medications, better preparation for managing ${isSelfConsent ? 'your' : 'their'} own care as ${isSelfConsent ? 'you transition' : 'they transition'} to adult care, and potentially improved medication adherence.`,
    },
    {
      title: '7. Alternatives',
      body: `Participation is not required. The alternative is standard medication education through verbal counseling and written materials. Medical care will not be affected by this decision.`,
    },
    {
      title: '8. Privacy & Confidentiality',
      body: `No names, dates of birth, or medical record numbers are collected. Only age group, quiz responses, and session progress are stored — locally on this device only. Study results shared in publications will never identify any participant.`,
    },
    {
      title: '9. Questions',
      body: `For questions about this study, contact: Christine E. Tabulov, PharmD, BCPPS — ctabulov@usf.edu. For questions about your rights as a research participant, contact the USF Institutional Review Board.`,
    },
    {
      title: '10. Voluntary',
      body: `Participation is entirely voluntary. You may decide not to participate without any effect on ${isSelfConsent ? 'your' : "your child's"} medical care at Tampa General Hospital.`,
    },
    {
      title: '11. Right to Withdraw',
      body: `You may withdraw ${childPronoun} from this study at any time, for any reason, without penalty. Data from prior sessions can be deleted upon request.`,
    },
    {
      title: '12. Complete Disclosure',
      body: `All known information about this study has been shared with you. If new information becomes available that may affect your decision, you will be informed promptly.`,
    },
  ];

  // Scroll handler
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
      const distanceFromBottom =
        contentSize.height - layoutMeasurement.height - contentOffset.y;

      if (!hasScrolledToBottom && distanceFromBottom <= SCROLL_BOTTOM_THRESHOLD) {
        setHasScrolledToBottom(true);
        Animated.timing(scrollIndicatorOpacity, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }).start();
      }
    },
    [hasScrolledToBottom, scrollIndicatorOpacity]
  );

  // PanResponder for signature
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          currentStroke.current = [{ x: locationX, y: locationY }];
        },
        onPanResponderMove: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          const x = Math.max(0, Math.min(locationX, SIGNATURE_PAD_WIDTH));
          const y = Math.max(0, Math.min(locationY, SIGNATURE_PAD_HEIGHT));
          currentStroke.current.push({ x, y });
          // Trigger re-render by updating strokes with current in-progress stroke
          setStrokes((prev) => {
            // Replace last stroke if it's the current one, else append
            const withoutCurrent = prev.filter((_, i) => i < prev.length);
            return [...withoutCurrent.slice(0, -1 >>> 0), { points: [...currentStroke.current] }];
          });
        },
        onPanResponderRelease: () => {
          if (currentStroke.current.length > 0) {
            const finishedStroke = { points: [...currentStroke.current] };
            setStrokes((prev) => {
              // Remove the in-progress stroke we kept pushing and finalize
              return [...prev.slice(0, prev.length - 1), finishedStroke];
            });
            setHasSignature(true);
            currentStroke.current = [];
          }
        },
        onPanResponderTerminate: () => {
          if (currentStroke.current.length > 0) {
            const finishedStroke = { points: [...currentStroke.current] };
            setStrokes((prev) => [...prev.slice(0, prev.length - 1), finishedStroke]);
            setHasSignature(true);
            currentStroke.current = [];
          }
        },
      }),
    []
  );

  const clearSignature = useCallback(() => {
    setStrokes([]);
    setHasSignature(false);
    currentStroke.current = [];
  }, []);

  const handleAgree = useCallback(async () => {
    if (!canAgree || isSaving) return;

    if (printedName.trim().length === 0) {
      Alert.alert('Missing Information', 'Please enter your printed name.');
      return;
    }
    if (!hasSignature) {
      Alert.alert('Missing Signature', 'Please provide a signature.');
      return;
    }
    if (isParental && relationship.trim().length === 0) {
      Alert.alert(
        'Missing Information',
        'Please enter your relationship to the patient.'
      );
      return;
    }

    setIsSaving(true);
    try {
      const signatureData = buildSVGPath(strokes);
      const signedAt = new Date().toISOString();

      await db.insert(schema.consent_records).values({
        userId,
        signedByName: printedName.trim(),
        relationshipToPatient: isParental ? relationship.trim() : null,
        signatureData,
        consentVersion: CONSENT_VERSION,
        isSelfConsent: isSelfConsent ? 1 : 0,
        signedAt,
      });

      await db
        .update(schema.users)
        .set({ consentGiven: true })
        .where(eq(schema.users.id, userId));

      onConsented();
    } catch (error) {
      console.error('Failed to save consent:', error);
      Alert.alert(
        'Error',
        'Failed to save consent. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    canAgree,
    isSaving,
    printedName,
    hasSignature,
    isParental,
    relationship,
    strokes,
    db,
    userId,
    isSelfConsent,
    onConsented,
  ]);

  const svgPathData = buildSVGPath(strokes);

  return (
    <View style={styles.container}>
      {/* Scroll indicator */}
      <Animated.View
        style={[styles.scrollIndicator, { opacity: scrollIndicatorOpacity }]}
        pointerEvents="none"
      >
        <Text style={styles.scrollIndicatorText}>
          ↓ Scroll to read the full document
        </Text>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator
      >
        {/* Consent document */}
        <View style={styles.documentCard}>
          <Text style={styles.docHeader}>
            INFORMED CONSENT / PARENTAL PERMISSION
          </Text>
          <Text style={styles.docSubheader}>
            Petiatrics: A Gamified Medication Education Program
          </Text>
          <Text style={styles.docInstitution}>
            Tampa General Hospital | University of South Florida Taneja College
            of Pharmacy
          </Text>

          <View style={styles.divider} />

          {sections.map((section) => (
            <View key={section.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionBody}>{section.body}</Text>
            </View>
          ))}

          <View style={styles.divider} />

          <Text style={styles.confirmationStatement}>
            By signing below, you confirm that you have read this entire
            document, had the opportunity to ask questions, and voluntarily
            agree to allow {pronoun} to participate.
          </Text>
        </View>

        {/* Scroll-to-bottom confirmation */}
        {hasScrolledToBottom && (
          <View style={styles.documentReadBanner}>
            <Text style={styles.documentReadText}>✓ Document read</Text>
          </View>
        )}

        {/* Checkbox */}
        <View style={styles.checkboxRow}>
          <TouchableOpacity
            style={[
              styles.checkbox,
              !hasScrolledToBottom && styles.checkboxDisabled,
              checked && styles.checkboxChecked,
            ]}
            onPress={() => {
              if (hasScrolledToBottom) {
                setChecked((prev) => !prev);
              }
            }}
            disabled={!hasScrolledToBottom}
            activeOpacity={0.7}
            accessibilityRole="checkbox"
            accessibilityState={{ checked, disabled: !hasScrolledToBottom }}
          >
            {checked && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>
          <Text
            style={[
              styles.checkboxLabel,
              !hasScrolledToBottom && styles.checkboxLabelDisabled,
            ]}
          >
            I have read and understood this document
          </Text>
        </View>

        {/* Signature and inputs — show after checkbox is checked */}
        {checked && (
          <View style={styles.signatureSection}>
            {/* Printed name */}
            <Text style={styles.inputLabel}>Printed Name *</Text>
            <TextInput
              style={styles.textInput}
              value={printedName}
              onChangeText={setPrintedName}
              placeholder="Enter your full name"
              placeholderTextColor="#aaa"
              autoCapitalize="words"
              returnKeyType="done"
              maxLength={100}
            />

            {/* Relationship (parental only) */}
            {isParental && (
              <>
                <Text style={styles.inputLabel}>
                  Relationship to Patient *
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={relationship}
                  onChangeText={setRelationship}
                  placeholder="e.g. Mother, Father, Guardian"
                  placeholderTextColor="#aaa"
                  autoCapitalize="words"
                  returnKeyType="done"
                  maxLength={60}
                />
              </>
            )}

            {/* Signature pad */}
            <Text style={styles.inputLabel}>Signature *</Text>
            <Text style={styles.signatureHint}>
              Draw your signature below using your finger
            </Text>
            <View
              style={styles.signaturePadContainer}
              {...panResponder.panHandlers}
            >
              <Svg
                width={SIGNATURE_PAD_WIDTH}
                height={SIGNATURE_PAD_HEIGHT}
                style={styles.signatureSvg}
              >
                {svgPathData ? (
                  <Path
                    d={svgPathData}
                    stroke="#1a1a1a"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                ) : null}
              </Svg>
              {!hasSignature && (
                <View style={styles.signaturePlaceholder} pointerEvents="none">
                  <Text style={styles.signaturePlaceholderText}>
                    Sign here
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={clearSignature}
              activeOpacity={0.7}
            >
              <Text style={styles.clearButtonText}>Clear Signature</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Agree button */}
        <TouchableOpacity
          style={[
            styles.agreeButton,
            !canAgree && styles.agreeButtonDisabled,
          ]}
          onPress={handleAgree}
          disabled={!canAgree || isSaving}
          activeOpacity={0.8}
        >
          <Text style={styles.agreeButtonText}>
            {isSaving ? 'Saving...' : 'I Agree & Continue'}
          </Text>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#7CB5DD',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 40,
  },

  // Scroll indicator
  scrollIndicator: {
    position: 'absolute',
    bottom: 90,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 10,
  },
  scrollIndicatorText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'pixelRegular',
  },

  // Document card
  documentCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    margin: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  docHeader: {
    fontFamily: 'pixelRegular',
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1a1a2e',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  docSubheader: {
    fontFamily: 'pixelRegular',
    fontSize: 13,
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  docInstitution: {
    fontFamily: 'pixelRegular',
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 14,
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: 'pixelRegular',
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  sectionBody: {
    fontFamily: 'pixelRegular',
    fontSize: 13,
    color: '#444',
    lineHeight: 20,
  },
  confirmationStatement: {
    fontFamily: 'pixelRegular',
    fontSize: 13,
    color: '#333',
    lineHeight: 20,
    fontStyle: 'italic',
    marginTop: 4,
  },

  // Document read banner
  documentReadBanner: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: 'rgba(40, 167, 69, 0.15)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(40, 167, 69, 0.4)',
  },
  documentReadText: {
    fontFamily: 'pixelRegular',
    fontSize: 13,
    color: '#1a7a35',
    fontWeight: 'bold',
  },

  // Checkbox
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 10,
    padding: 14,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#2E6DA4',
    backgroundColor: '#fff',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDisabled: {
    borderColor: '#aaa',
    backgroundColor: '#f0f0f0',
  },
  checkboxChecked: {
    backgroundColor: '#2E6DA4',
    borderColor: '#2E6DA4',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  checkboxLabel: {
    flex: 1,
    fontFamily: 'pixelRegular',
    fontSize: 13,
    color: '#333',
    lineHeight: 19,
  },
  checkboxLabelDisabled: {
    color: '#888',
  },

  // Signature section
  signatureSection: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
  },
  inputLabel: {
    fontFamily: 'pixelRegular',
    fontSize: 13,
    color: '#333',
    fontWeight: 'bold',
    marginBottom: 6,
    marginTop: 10,
  },
  textInput: {
    height: 44,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontFamily: 'pixelRegular',
    fontSize: 14,
    color: '#222',
    backgroundColor: '#fff',
  },
  signatureHint: {
    fontFamily: 'pixelRegular',
    fontSize: 11,
    color: '#777',
    marginBottom: 8,
  },
  signaturePadContainer: {
    width: SIGNATURE_PAD_WIDTH,
    height: SIGNATURE_PAD_HEIGHT,
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
    alignSelf: 'center',
  },
  signatureSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  signaturePlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signaturePlaceholderText: {
    fontFamily: 'pixelRegular',
    fontSize: 14,
    color: '#ccc',
  },
  clearButton: {
    alignSelf: 'center',
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#999',
    backgroundColor: '#f7f7f7',
  },
  clearButtonText: {
    fontFamily: 'pixelRegular',
    fontSize: 12,
    color: '#555',
  },

  // Agree button
  agreeButton: {
    backgroundColor: '#2E6DA4',
    marginHorizontal: 20,
    marginTop: 8,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  agreeButtonDisabled: {
    backgroundColor: '#aaa',
    shadowOpacity: 0,
    elevation: 0,
  },
  agreeButtonText: {
    fontFamily: 'pixelRegular',
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },

  bottomPadding: {
    height: 20,
  },
});
