import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  StatusBar,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { useRouter } from 'expo-router';

// ─── Types ──────────────────────────────────────────────────────────────────

type QuestionBankRow = typeof schema.questionBank.$inferSelect;

type QuestionType = 'mcq' | 'tf';
type AgeGroup = '11-13' | '14-21';
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

// ─── Constants ───────────────────────────────────────────────────────────────

const AGE_GROUPS: { label: string; value: string }[] = [
  { label: 'All', value: 'all' },
  { label: '11-13', value: '11-13' },
  { label: '14-16/17-21', value: '14-21' },
];

const CATEGORIES: { label: string; value: string }[] = [
  { label: 'All', value: 'all' },
  { label: 'Immunosuppression', value: 'immunosuppression' },
  { label: 'Tacrolimus', value: 'tacrolimus' },
  { label: 'Mycophenolate', value: 'mycophenolate' },
  { label: 'Steroids', value: 'steroids' },
  { label: 'Infection', value: 'infection_prophylaxis' },
  { label: 'Adherence', value: 'adherence' },
];

const FORM_AGE_GROUPS: { label: string; value: AgeGroup }[] = [
  { label: '11-13', value: '11-13' },
  { label: '14-21', value: '14-21' },
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMedLabel(medId: number | null): string {
  if (medId === null) return '';
  return `Med #${medId}`;
}

function getCategoryLabel(cat: string): string {
  const found = FORM_CATEGORIES.find((c) => c.value === cat);
  return found ? found.label : cat;
}

function getAgeLabel(age: string): string {
  if (age === '14-21') return '14-21';
  return age;
}

// ─── Subcomponents ───────────────────────────────────────────────────────────

interface RadioPickerProps<T extends string> {
  options: { label: string; value: T }[];
  selected: T;
  onSelect: (v: T) => void;
}

function RadioPicker<T extends string>({
  options,
  selected,
  onSelect,
}: RadioPickerProps<T>) {
  return (
    <View style={radioStyles.row}>
      {options.map((opt) => {
        const isSelected = opt.value === selected;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[radioStyles.chip, isSelected && radioStyles.chipSelected]}
            onPress={() => onSelect(opt.value)}
            activeOpacity={0.75}
          >
            <Text
              style={[
                radioStyles.chipText,
                isSelected && radioStyles.chipTextSelected,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const radioStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
    marginBottom: 10,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#E8F4FD',
    borderWidth: 1,
    borderColor: '#BDD7EE',
  },
  chipSelected: {
    backgroundColor: '#2E6DA4',
    borderColor: '#2E6DA4',
  },
  chipText: {
    fontFamily: 'pixelRegular',
    fontSize: 12,
    color: '#2E6DA4',
  },
  chipTextSelected: {
    color: '#fff',
  },
});

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────

interface QuestionModalProps {
  visible: boolean;
  editingQuestion: QuestionBankRow | null;
  onClose: () => void;
  onSaved: () => void;
  db: ReturnType<typeof drizzle>;
}

function QuestionModal({
  visible,
  editingQuestion,
  onClose,
  onSaved,
  db,
}: QuestionModalProps) {
  const isEditing = editingQuestion !== null;

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (visible) {
      if (editingQuestion) {
        const parsedOptions: string[] = (() => {
          try {
            const parsed = JSON.parse(editingQuestion.optionsJson ?? '[]');
            return Array.isArray(parsed) && parsed.length >= 2
              ? parsed
              : ['', ''];
          } catch {
            return ['', ''];
          }
        })();
        setForm({
          questionText: editingQuestion.questionText,
          questionType: (editingQuestion.questionType as QuestionType) ?? 'mcq',
          ageGroup: (editingQuestion.ageGroup as AgeGroup) ?? '11-13',
          category: (editingQuestion.category as Category) ?? 'immunosuppression',
          medicationId: editingQuestion.medicationId ?? null,
          correctAnswer: editingQuestion.correctAnswer,
          options: parsedOptions,
          isActive: editingQuestion.isActive ?? true,
        });
      } else {
        setForm({ ...EMPTY_FORM, options: ['', ''] });
      }
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
      const opts = [...prev.options];
      opts[index] = value;
      return { ...prev, options: opts };
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
      const opts = prev.options.filter((_, i) => i !== index);
      // If correct answer was this option, clear it
      const removed = prev.options[index];
      const newCorrect =
        prev.correctAnswer === removed ? '' : prev.correctAnswer;
      return { ...prev, options: opts, correctAnswer: newCorrect };
    });
  }, []);

  const markAsCorrect = useCallback((option: string) => {
    setForm((prev) => ({ ...prev, correctAnswer: option }));
  }, []);

  const validate = (): string | null => {
    if (!form.questionText.trim()) return 'Question text is required.';
    if (!form.correctAnswer.trim()) return 'Correct answer is required.';
    if (form.questionType === 'mcq') {
      const filled = form.options.filter((o) => o.trim().length > 0);
      if (filled.length < 2) return 'At least 2 answer options are required.';
      if (!filled.includes(form.correctAnswer.trim())) {
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
        ? form.options.filter((o) => o.trim().length > 0)
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
      <View style={modalStyles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={modalStyles.kavWrapper}
        >
          <View style={modalStyles.sheet}>
            {/* Header */}
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>
                {isEditing ? 'Edit Question' : 'Add Question'}
              </Text>
              <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
                <Text style={modalStyles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={modalStyles.scrollArea}
              contentContainerStyle={modalStyles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Question Text */}
              <Text style={modalStyles.label}>Question Text *</Text>
              <TextInput
                style={[modalStyles.input, modalStyles.textArea]}
                value={form.questionText}
                onChangeText={(v) => updateForm('questionText', v)}
                placeholder="Enter the question..."
                placeholderTextColor="#aaa"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              {/* Question Type */}
              <Text style={modalStyles.label}>Question Type</Text>
              <RadioPicker
                options={[
                  { label: 'Multiple Choice', value: 'mcq' },
                  { label: 'True / False', value: 'tf' },
                ]}
                selected={form.questionType}
                onSelect={(v) => {
                  updateForm('questionType', v);
                  if (v === 'tf') {
                    // Pre-fill TF options
                    updateForm('options', ['True', 'False']);
                  } else {
                    updateForm('options', ['', '']);
                  }
                  updateForm('correctAnswer', '');
                }}
              />

              {/* Age Group */}
              <Text style={modalStyles.label}>Age Group</Text>
              <RadioPicker
                options={FORM_AGE_GROUPS}
                selected={form.ageGroup}
                onSelect={(v) => updateForm('ageGroup', v)}
              />

              {/* Category */}
              <Text style={modalStyles.label}>Category</Text>
              <RadioPicker
                options={FORM_CATEGORIES}
                selected={form.category}
                onSelect={(v) => updateForm('category', v)}
              />

              {/* Medication */}
              <Text style={modalStyles.label}>Medication</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={modalStyles.medScroll}
              >
                {MEDICATIONS.map((med) => {
                  const isSelected = form.medicationId === med.value;
                  return (
                    <TouchableOpacity
                      key={String(med.value)}
                      style={[
                        modalStyles.medChip,
                        isSelected && modalStyles.medChipSelected,
                      ]}
                      onPress={() => updateForm('medicationId', med.value)}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          modalStyles.medChipText,
                          isSelected && modalStyles.medChipTextSelected,
                        ]}
                      >
                        {med.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* MCQ Options */}
              {form.questionType === 'mcq' && (
                <>
                  <Text style={modalStyles.label}>Answer Options</Text>
                  {form.options.map((option, index) => (
                    <View key={index} style={modalStyles.optionRow}>
                      <View style={modalStyles.optionInputWrapper}>
                        <TextInput
                          style={modalStyles.optionInput}
                          value={option}
                          onChangeText={(v) => updateOption(index, v)}
                          placeholder={`Option ${index + 1}`}
                          placeholderTextColor="#aaa"
                        />
                        <TouchableOpacity
                          onPress={() => markAsCorrect(option)}
                          style={[
                            modalStyles.markCorrectBtn,
                            form.correctAnswer === option &&
                              option.trim().length > 0 &&
                              modalStyles.markCorrectBtnActive,
                          ]}
                        >
                          <Text
                            style={[
                              modalStyles.markCorrectText,
                              form.correctAnswer === option &&
                                option.trim().length > 0 &&
                                modalStyles.markCorrectTextActive,
                            ]}
                          >
                            {form.correctAnswer === option &&
                            option.trim().length > 0
                              ? '✓ Correct'
                              : 'Mark correct'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      {form.options.length > 2 && (
                        <TouchableOpacity
                          onPress={() => removeOption(index)}
                          style={modalStyles.removeOptionBtn}
                        >
                          <Text style={modalStyles.removeOptionText}>✕</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                  {form.options.length < 4 && (
                    <TouchableOpacity
                      style={modalStyles.addOptionBtn}
                      onPress={addOption}
                    >
                      <Text style={modalStyles.addOptionText}>
                        + Add Option
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}

              {/* TF Correct Answer */}
              {form.questionType === 'tf' && (
                <>
                  <Text style={modalStyles.label}>Correct Answer</Text>
                  <RadioPicker
                    options={[
                      { label: 'True', value: 'True' },
                      { label: 'False', value: 'False' },
                    ]}
                    selected={form.correctAnswer as 'True' | 'False'}
                    onSelect={(v) => updateForm('correctAnswer', v)}
                  />
                </>
              )}

              {/* Correct Answer (MCQ free input confirmation) */}
              {form.questionType === 'mcq' && (
                <>
                  <Text style={modalStyles.label}>Correct Answer *</Text>
                  <TextInput
                    style={modalStyles.input}
                    value={form.correctAnswer}
                    onChangeText={(v) => updateForm('correctAnswer', v)}
                    placeholder="Must match one of the options above"
                    placeholderTextColor="#aaa"
                  />
                </>
              )}

              {/* Is Active */}
              <View style={modalStyles.switchRow}>
                <Text style={modalStyles.label}>Active</Text>
                <Switch
                  value={form.isActive}
                  onValueChange={(v) => updateForm('isActive', v)}
                  trackColor={{ false: '#9CA3AF', true: '#27AE60' }}
                  thumbColor="#fff"
                />
              </View>

              {/* Action Buttons */}
              <View style={modalStyles.buttonRow}>
                <TouchableOpacity
                  style={modalStyles.cancelBtn}
                  onPress={onClose}
                  activeOpacity={0.8}
                >
                  <Text style={modalStyles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    modalStyles.saveBtn,
                    saving && modalStyles.saveBtnDisabled,
                  ]}
                  onPress={handleSave}
                  disabled={saving}
                  activeOpacity={0.8}
                >
                  <Text style={modalStyles.saveBtnText}>
                    {saving ? 'Saving...' : 'Save Question'}
                  </Text>
                </TouchableOpacity>
              </View>

              {isEditing && (
                <TouchableOpacity
                  style={modalStyles.deleteBtn}
                  onPress={handleDelete}
                  activeOpacity={0.8}
                >
                  <Text style={modalStyles.deleteBtnText}>
                    🗑 Delete Question
                  </Text>
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

const modalStyles = StyleSheet.create({
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
    maxHeight: '92%',
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

// ─── Question Card ────────────────────────────────────────────────────────────

interface QuestionCardProps {
  question: QuestionBankRow;
  onEdit: (q: QuestionBankRow) => void;
  onToggleActive: (q: QuestionBankRow) => void;
}

function QuestionCard({ question, onEdit, onToggleActive }: QuestionCardProps) {
  const medLabel = getMedLabel(question.medicationId ?? null);
  const categoryLabel = getCategoryLabel(question.category);
  const ageLabel = getAgeLabel(question.ageGroup);

  return (
    <View style={cardStyles.card}>
      {/* Question text */}
      <Text style={cardStyles.questionText} numberOfLines={2}>
        {question.questionText}
      </Text>

      {/* Chips row */}
      <View style={cardStyles.chipsRow}>
        <View style={cardStyles.chip}>
          <Text style={cardStyles.chipText}>{ageLabel}</Text>
        </View>
        <View style={[cardStyles.chip, cardStyles.categoryChip]}>
          <Text style={[cardStyles.chipText, cardStyles.categoryChipText]}>
            {categoryLabel}
          </Text>
        </View>
        {medLabel ? (
          <View style={[cardStyles.chip, cardStyles.medChip]}>
            <Text style={[cardStyles.chipText, cardStyles.medChipText]}>
              {medLabel}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Bottom row: active toggle + edit */}
      <View style={cardStyles.bottomRow}>
        <TouchableOpacity
          style={cardStyles.activeRow}
          onPress={() => onToggleActive(question)}
          activeOpacity={0.75}
        >
          <View
            style={[
              cardStyles.activeDot,
              question.isActive ? cardStyles.dotActive : cardStyles.dotInactive,
            ]}
          />
          <Text style={cardStyles.activeLabel}>
            {question.isActive ? 'Active' : 'Inactive'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={cardStyles.editBtn}
          onPress={() => onEdit(question)}
          activeOpacity={0.75}
        >
          <Text style={cardStyles.editBtnText}>✏️ Edit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginHorizontal: 12,
    marginVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.09,
    shadowRadius: 4,
    elevation: 2,
  },
  questionText: {
    fontFamily: 'pixelRegular',
    fontSize: 13,
    color: '#1a2a3a',
    lineHeight: 19,
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 10,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: '#E8F4FD',
  },
  chipText: {
    fontFamily: 'pixelRegular',
    fontSize: 11,
    color: '#2E6DA4',
  },
  categoryChip: {
    backgroundColor: '#EDE7F6',
  },
  categoryChipText: {
    color: '#5E35B1',
  },
  medChip: {
    backgroundColor: '#FFF3E0',
  },
  medChipText: {
    color: '#E65100',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotActive: {
    backgroundColor: '#27AE60',
  },
  dotInactive: {
    backgroundColor: '#9CA3AF',
  },
  activeLabel: {
    fontFamily: 'pixelRegular',
    fontSize: 12,
    color: '#555',
  },
  editBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#EBF5FF',
    borderWidth: 1,
    borderColor: '#BDD7EE',
  },
  editBtnText: {
    fontFamily: 'pixelRegular',
    fontSize: 12,
    color: '#2E6DA4',
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AdminQuestions() {
  const router = useRouter();
  const sqliteContext = useSQLiteContext();
  const db = useMemo(
    () => drizzle(sqliteContext, { schema }),
    [sqliteContext]
  );

  const [questions, setQuestions] = useState<QuestionBankRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modal state
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingQuestion, setEditingQuestion] =
    useState<QuestionBankRow | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchQuestions = useCallback(async () => {
    try {
      const rows = await db
        .select()
        .from(schema.questionBank)
        .orderBy(schema.questionBank.sortOrder, schema.questionBank.id)
        .all();
      setQuestions(rows);
    } catch (err) {
      console.error('Error fetching questions:', err);
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // ── Filtering ──────────────────────────────────────────────────────────────

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const ageMatch =
        selectedAgeGroup === 'all' || q.ageGroup === selectedAgeGroup;
      const catMatch =
        selectedCategory === 'all' || q.category === selectedCategory;
      return ageMatch && catMatch;
    });
  }, [questions, selectedAgeGroup, selectedCategory]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleEdit = useCallback((q: QuestionBankRow) => {
    setEditingQuestion(q);
    setIsModalVisible(true);
  }, []);

  const handleAdd = useCallback(() => {
    setEditingQuestion(null);
    setIsModalVisible(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalVisible(false);
    setEditingQuestion(null);
  }, []);

  const handleSaved = useCallback(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const handleToggleActive = useCallback(
    async (q: QuestionBankRow) => {
      try {
        await db
          .update(schema.questionBank)
          .set({ isActive: !q.isActive })
          .where(eq(schema.questionBank.id, q.id));
        await fetchQuestions();
      } catch (err) {
        console.error('Error toggling active state:', err);
        Alert.alert('Error', 'Could not update question status.');
      }
    },
    [db, fetchQuestions]
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.75}
        >
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Question Bank</Text>
        <View style={styles.topBarRight}>
          <Text style={styles.countBadge}>
            {filteredQuestions.length}
          </Text>
        </View>
      </View>

      {/* Filter Bar */}
      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {/* Age group filters */}
          {AGE_GROUPS.map((ag) => {
            const isSelected = selectedAgeGroup === ag.value;
            return (
              <TouchableOpacity
                key={ag.value}
                style={[
                  styles.filterChip,
                  isSelected && styles.filterChipSelected,
                ]}
                onPress={() => setSelectedAgeGroup(ag.value)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isSelected && styles.filterChipTextSelected,
                  ]}
                >
                  {ag.label}
                </Text>
              </TouchableOpacity>
            );
          })}

          <View style={styles.filterDivider} />

          {/* Category filters */}
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.value;
            return (
              <TouchableOpacity
                key={cat.value}
                style={[
                  styles.filterChip,
                  isSelected && styles.filterChipSelected,
                ]}
                onPress={() => setSelectedCategory(cat.value)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isSelected && styles.filterChipTextSelected,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Question List */}
      {loading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Loading questions...</Text>
        </View>
      ) : filteredQuestions.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No questions found.</Text>
          <Text style={styles.emptySubtext}>
            Tap "+ Add Question" to create one.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {filteredQuestions.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              onEdit={handleEdit}
              onToggleActive={handleToggleActive}
            />
          ))}
          {/* Space for FAB */}
          <View style={{ height: 90 }} />
        </ScrollView>
      )}

      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleAdd}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+ Add Question</Text>
      </TouchableOpacity>

      {/* Add / Edit Modal */}
      <QuestionModal
        visible={isModalVisible}
        editingQuestion={editingQuestion}
        onClose={handleCloseModal}
        onSaved={handleSaved}
        db={db}
      />
    </View>
  );
}

// ─── Main Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#7CB5DD',
  },

  // Top bar
  topBar: {
    backgroundColor: '#5A9BC5',
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    paddingBottom: 14,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  backBtn: {
    paddingVertical: 4,
    paddingRight: 12,
    minWidth: 70,
  },
  backBtnText: {
    fontFamily: 'pixelRegular',
    fontSize: 15,
    color: '#fff',
  },
  topBarTitle: {
    flex: 1,
    fontFamily: 'pixelRegular',
    fontSize: 20,
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  topBarRight: {
    minWidth: 70,
    alignItems: 'flex-end',
  },
  countBadge: {
    fontFamily: 'pixelRegular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
  },

  // Filter bar
  filterBar: {
    backgroundColor: 'rgba(90,155,197,0.7)',
    paddingVertical: 10,
  },
  filterScroll: {
    paddingHorizontal: 12,
    gap: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#E8F4FD',
  },
  filterChipSelected: {
    backgroundColor: '#2E6DA4',
  },
  filterChipText: {
    fontFamily: 'pixelRegular',
    fontSize: 12,
    color: '#2E6DA4',
  },
  filterChipTextSelected: {
    color: '#fff',
  },
  filterDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginHorizontal: 4,
  },

  // List
  listScroll: {
    flex: 1,
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 20,
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 60,
  },
  emptyText: {
    fontFamily: 'pixelRegular',
    fontSize: 16,
    color: '#fff',
    marginBottom: 6,
  },
  emptySubtext: {
    fontFamily: 'pixelRegular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 20,
    backgroundColor: '#2E6DA4',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  fabText: {
    fontFamily: 'pixelRegular',
    fontSize: 15,
    color: '#fff',
    fontWeight: 'bold',
  },
});
