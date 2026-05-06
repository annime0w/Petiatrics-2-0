import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { eq } from 'drizzle-orm';
import * as schema from '@/db/schema';
import RadioPicker from '@/components/questions/RadioPicker';
import { drizzle } from 'drizzle-orm/expo-sqlite';

type QuestionBankRow = typeof schema.questionBank.$inferSelect;

type QuestionType = 'mcq' | 'tf';
type AgeGroup = '11-13' | '14-17' | '18-21';
type Category =
  | 'immunosuppression'
  | 'tacrolimus'
  | 'mycophenolate'
  | 'steroids'
  | 'infection_prophylaxis'
  | 'adherence';

interface FormState {
  questionText: string;
  questionType: QuestionType;
  ageGroup: AgeGroup;
  category: Category;
  medicationId: number | null;
  correctAnswer: string;
  options: string[];
  isActive: boolean;
}

const FORM_AGE_GROUPS: { label: string; value: AgeGroup }[] = [
  { label: '11-13', value: '11-13' },
  { label: '14-17', value: '14-17' },
  { label: '18-21', value: '18-21' },
];

const FORM_CATEGORIES: { label: string; value: Category }[] = [
  { label: 'Immunosuppression', value: 'immunosuppression' },
  { label: 'Tacrolimus', value: 'tacrolimus' },
  { label: 'Mycophenolate', value: 'mycophenolate' },
  { label: 'Steroids', value: 'steroids' },
  { label: 'Infection Prophylaxis', value: 'infection_prophylaxis' },
  { label: 'Adherence', value: 'adherence' },
];

const MEDICATIONS: { label: string; value: number | null }[] = [
  { label: 'General (none)', value: null },
  { label: 'Tacrolimus', value: 1 },
  { label: 'Mycophenolate mofetil', value: 2 },
  { label: 'Prednisone', value: 3 },
  { label: 'Cyclosporine', value: 4 },
  { label: 'Sirolimus', value: 5 },
  { label: 'Bactrim/Septra', value: 6 },
  { label: 'Nystatin', value: 7 },
  { label: 'Valganciclovir', value: 8 },
];

const EMPTY_FORM: FormState = {
  questionText: '',
  questionType: 'mcq',
  ageGroup: '11-13',
  category: 'immunosuppression',
  medicationId: null,
  correctAnswer: '',
  options: ['', ''],
  isActive: true,
};

interface QuestionFormModalProps {
  visible: boolean;
  editingQuestion: QuestionBankRow | null;
  onClose: () => void;
  onSaved: () => void;
  db: ReturnType<typeof drizzle>;
}

export default function QuestionFormModal({
  visible,
  editingQuestion,
  onClose,
  onSaved,
  db,
}: QuestionFormModalProps) {
  const isEditing = editingQuestion !== null;

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;

    if (editingQuestion) {
      const parsedOptions: string[] = (() => {
        try {
          const parsed = JSON.parse(editingQuestion.optionsJson ?? '[]');
          return Array.isArray(parsed) && parsed.length >= 2 ? parsed : ['', ''];
        } catch {
          return ['', ''];
        }
      })();

      const safeAgeGroup: AgeGroup =
        editingQuestion.ageGroup === '11-13' ||
        editingQuestion.ageGroup === '14-17' ||
        editingQuestion.ageGroup === '18-21'
          ? editingQuestion.ageGroup
          : '11-13';

      setForm({
        questionText: editingQuestion.questionText,
        questionType: (editingQuestion.questionType as QuestionType) ?? 'mcq',
        ageGroup: safeAgeGroup,
        category: (editingQuestion.category as Category) ?? 'immunosuppression',
        medicationId: editingQuestion.medicationId ?? null,
        correctAnswer: editingQuestion.correctAnswer ?? '',
        options: parsedOptions,
        isActive: editingQuestion.isActive ?? true,
      });
    } else {
      setForm({ ...EMPTY_FORM, options: ['', ''] });
    }
  }, [visible, editingQuestion]);

  const updateForm = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const updateOption = useCallback((index: number, value: string) => {
    setForm((prev) => {
      const nextOptions = [...prev.options];
      nextOptions[index] = value;
      return { ...prev, options: nextOptions };
    });
  }, []);

  const addOption = useCallback(() => {
    setForm((prev) => {
      if (prev.options.length >= 4) return prev;
      return { ...prev, options: [...prev.options, ''] };
    });
  }, []);

  const removeOption = useCallback((index: number) => {
    setForm((prev) => {
      if (prev.options.length <= 2) return prev;

      const removedOption = prev.options[index];
      const nextOptions = prev.options.filter((_, i) => i !== index);
      const nextCorrectAnswer =
        prev.correctAnswer === removedOption ? '' : prev.correctAnswer;

      return {
        ...prev,
        options: nextOptions,
        correctAnswer: nextCorrectAnswer,
      };
    });
  }, []);

  const markAsCorrect = useCallback((option: string) => {
    setForm((prev) => ({ ...prev, correctAnswer: option }));
  }, []);

  const validate = (): string | null => {
    if (!form.questionText.trim()) return 'Question text is required.';
    if (!form.correctAnswer.trim()) return 'Correct answer is required.';

    if (form.questionType === 'mcq') {
      const filledOptions = form.options.filter((option) => option.trim().length > 0);

      if (filledOptions.length < 2) {
        return 'At least 2 answer options are required.';
      }

      if (!filledOptions.includes(form.correctAnswer.trim())) {
        return 'Correct answer must match one of the MCQ options exactly.';
      }
    }

    return null;
  };

  const handleSave = async () => {
    const error = validate();
    if (error) {
      Alert.alert('Validation Error', error);
      return;
    }

    const filteredOptions =
      form.questionType === 'mcq'
        ? form.options.filter((option) => option.trim().length > 0)
        : [];

    setSaving(true);

    try {
      if (isEditing && editingQuestion) {
        await db
          .update(schema.questionBank)
          .set({
            questionText: form.questionText.trim(),
            questionType: form.questionType,
            optionsJson: JSON.stringify(filteredOptions),
            correctAnswer: form.correctAnswer.trim(),
            medicationId: form.medicationId,
            ageGroup: form.ageGroup,
            category: form.category,
            isActive: form.isActive,
          })
          .where(eq(schema.questionBank.id, editingQuestion.id));
      } else {
        await db.insert(schema.questionBank).values({
          questionText: form.questionText.trim(),
          questionType: form.questionType,
          optionsJson: JSON.stringify(filteredOptions),
          correctAnswer: form.correctAnswer.trim(),
          medicationId: form.medicationId,
          ageGroup: form.ageGroup,
          category: form.category,
          isActive: form.isActive,
          sortOrder: 0,
        });
      }

      onSaved();
      onClose();

      setTimeout(() => {
        Alert.alert('Success', isEditing ? 'Question updated.' : 'Question added.');
      }, 100);
    } catch (err) {
      console.error('Error saving question:', err);
      Alert.alert('Error', 'Failed to save question. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!editingQuestion) return;

    Alert.alert(
      'Delete Question',
      'Are you sure you want to permanently delete this question?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await db
                .delete(schema.questionBank)
                .where(eq(schema.questionBank.id, editingQuestion.id));

              onSaved();
              onClose();

              setTimeout(() => {
                Alert.alert('Success', 'Question deleted.');
              }, 100);
            } catch (err) {
              console.error('Error deleting question:', err);
              Alert.alert('Error', 'Failed to delete question.');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.kavWrapper}
        >
          <View style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.title}>
                {isEditing ? 'Edit Question' : 'Add Question'}
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.label}>Question Text *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={form.questionText}
                onChangeText={(value) => updateForm('questionText', value)}
                placeholder="Enter the question..."
                placeholderTextColor="#aaa"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <Text style={styles.label}>Question Type</Text>
              <RadioPicker
                options={[
                  { label: 'Multiple Choice', value: 'mcq' },
                  { label: 'True / False', value: 'tf' },
                ]}
                selected={form.questionType}
                onSelect={(value) => {
                  updateForm('questionType', value);
                  if (value === 'tf') {
                    updateForm('options', ['True', 'False']);
                  } else {
                    updateForm('options', ['', '']);
                  }
                  updateForm('correctAnswer', '');
                }}
              />

              <Text style={styles.label}>Age Group</Text>
              <RadioPicker
                options={FORM_AGE_GROUPS}
                selected={form.ageGroup}
                onSelect={(value) => updateForm('ageGroup', value)}
              />

              <Text style={styles.label}>Category</Text>
              <RadioPicker
                options={FORM_CATEGORIES}
                selected={form.category}
                onSelect={(value) => updateForm('category', value)}
              />

              <Text style={styles.label}>Medication</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.medScroll}
              >
                {MEDICATIONS.map((medication) => {
                  const isSelected = form.medicationId === medication.value;

                  return (
                    <TouchableOpacity
                      key={String(medication.value)}
                      style={[
                        styles.medChip,
                        isSelected && styles.medChipSelected,
                      ]}
                      onPress={() => updateForm('medicationId', medication.value)}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.medChipText,
                          isSelected && styles.medChipTextSelected,
                        ]}
                      >
                        {medication.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {form.questionType === 'mcq' && (
                <>
                  <Text style={styles.label}>Answer Options</Text>

                  {form.options.map((option, index) => (
                    <View key={index} style={styles.optionRow}>
                      <View style={styles.optionInputWrapper}>
                        <TextInput
                          style={styles.optionInput}
                          value={option}
                          onChangeText={(value) => updateOption(index, value)}
                          placeholder={`Option ${index + 1}`}
                          placeholderTextColor="#aaa"
                        />
                        <TouchableOpacity
                          onPress={() => markAsCorrect(option)}
                          style={[
                            styles.markCorrectBtn,
                            form.correctAnswer === option &&
                              option.trim().length > 0 &&
                              styles.markCorrectBtnActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.markCorrectText,
                              form.correctAnswer === option &&
                                option.trim().length > 0 &&
                                styles.markCorrectTextActive,
                            ]}
                          >
                            {form.correctAnswer === option && option.trim().length > 0
                              ? '✓ Correct'
                              : 'Mark correct'}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {form.options.length > 2 && (
                        <TouchableOpacity
                          onPress={() => removeOption(index)}
                          style={styles.removeOptionBtn}
                        >
                          <Text style={styles.removeOptionText}>✕</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}

                  {form.options.length < 4 && (
                    <TouchableOpacity
                      style={styles.addOptionBtn}
                      onPress={addOption}
                    >
                      <Text style={styles.addOptionText}>+ Add Option</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}

              {form.questionType === 'tf' && (
                <>
                  <Text style={styles.label}>Correct Answer</Text>
                  <RadioPicker
                    options={[
                      { label: 'True', value: 'True' },
                      { label: 'False', value: 'False' },
                    ]}
                    selected={
                      form.correctAnswer === 'True' || form.correctAnswer === 'False'
                        ? form.correctAnswer
                        : 'True'
                    }
                    onSelect={(value) => updateForm('correctAnswer', value)}
                  />
                </>
              )}

              {form.questionType === 'mcq' && (
                <>
                  <Text style={styles.label}>Correct Answer *</Text>
                  <TextInput
                    style={styles.input}
                    value={form.correctAnswer}
                    onChangeText={(value) => updateForm('correctAnswer', value)}
                    placeholder="Must match one of the options above"
                    placeholderTextColor="#aaa"
                  />
                </>
              )}

              <View style={styles.switchRow}>
                <Text style={styles.label}>Active</Text>
                <Switch
                  value={form.isActive}
                  onValueChange={(value) => updateForm('isActive', value)}
                  trackColor={{ false: '#9CA3AF', true: '#27AE60' }}
                  thumbColor="#fff"
                />
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={onClose}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.saveBtn,
                    saving && styles.saveBtnDisabled,
                  ]}
                  onPress={handleSave}
                  disabled={saving}
                  activeOpacity={0.8}
                >
                  <Text style={styles.saveBtnText}>
                    {saving ? 'Saving...' : 'Save Question'}
                  </Text>
                </TouchableOpacity>
              </View>

              {isEditing && (
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={handleDelete}
                  activeOpacity={0.8}
                >
                  <Text style={styles.deleteBtnText}>🗑 Delete Question</Text>
                </TouchableOpacity>
              )}

              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  kavWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '88%',
    paddingTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 12,
    },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8F4FD',
  },
  title: {
    fontFamily: 'pixelRegular',
    fontSize: 17,
    color: '#1a2a3a',
    fontWeight: 'bold',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    color: '#555',
    fontWeight: 'bold',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  label: {
    fontFamily: 'pixelRegular',
    fontSize: 13,
    color: '#333',
    fontWeight: 'bold',
    marginBottom: 4,
    marginTop: 6,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#D0E8F7',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontFamily: 'pixelRegular',
    fontSize: 13,
    color: '#222',
    backgroundColor: '#F7FBFF',
    marginBottom: 4,
  },
  textArea: {
    height: 88,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  medScroll: {
    marginBottom: 8,
  },
  medChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#E8F4FD',
    borderWidth: 1,
    borderColor: '#BDD7EE',
    marginRight: 6,
    marginBottom: 4,
  },
  medChipSelected: {
    backgroundColor: '#2E6DA4',
    borderColor: '#2E6DA4',
  },
  medChipText: {
    fontFamily: 'pixelRegular',
    fontSize: 12,
    color: '#2E6DA4',
  },
  medChipTextSelected: {
    color: '#fff',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  optionInputWrapper: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D0E8F7',
    borderRadius: 8,
    backgroundColor: '#F7FBFF',
    overflow: 'hidden',
  },
  optionInput: {
    height: 40,
    paddingHorizontal: 10,
    fontFamily: 'pixelRegular',
    fontSize: 13,
    color: '#222',
  },
  markCorrectBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: '#D0E8F7',
    backgroundColor: '#F0F7FF',
  },
  markCorrectBtnActive: {
    backgroundColor: '#EAF7EE',
    borderTopColor: '#B2DFBF',
  },
  markCorrectText: {
    fontFamily: 'pixelRegular',
    fontSize: 11,
    color: '#2E6DA4',
  },
  markCorrectTextActive: {
    color: '#27AE60',
    fontWeight: 'bold',
  },
  removeOptionBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FDECEA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeOptionText: {
    fontSize: 13,
    color: '#E74C3C',
    fontWeight: 'bold',
  },
  addOptionBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2E6DA4',
    backgroundColor: '#F0F7FF',
    marginTop: 2,
    marginBottom: 6,
  },
  addOptionText: {
    fontFamily: 'pixelRegular',
    fontSize: 13,
    color: '#2E6DA4',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F7FBFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D0E8F7',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#9CA3AF',
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontFamily: 'pixelRegular',
    fontSize: 14,
    color: '#555',
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#2E6DA4',
    alignItems: 'center',
    shadowColor: '#2E6DA4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  saveBtnDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveBtnText: {
    fontFamily: 'pixelRegular',
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
  deleteBtn: {
    marginTop: 10,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#E74C3C',
    alignItems: 'center',
    shadowColor: '#E74C3C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  deleteBtnText: {
    fontFamily: 'pixelRegular',
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
});