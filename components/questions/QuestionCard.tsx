import * as schema from '@/db/schema';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type QuestionBankRow = typeof schema.questionBank.$inferSelect;

interface QuestionCardProps {
  question: QuestionBankRow;
  onEdit: (question: QuestionBankRow) => void;
  onToggleActive: (question: QuestionBankRow) => void;
}

function getMedicationLabel(medicationId: number | null): string {
  if (medicationId === null) return '';
  return `Med #${medicationId}`;
}

function getCategoryLabel(category: string): string {
  switch (category) {
    case 'immunosuppression':
      return 'Immunosuppression';
    case 'tacrolimus':
      return 'Tacrolimus';
    case 'mycophenolate':
      return 'Mycophenolate';
    case 'steroids':
      return 'Steroids';
    case 'infection_prophylaxis':
      return 'Infection';
    case 'adherence':
      return 'Adherence';
    default:
      return category;
  }
}

export default function QuestionCard({
  question,
  onEdit,
  onToggleActive,
}: QuestionCardProps) {
  const medicationLabel = getMedicationLabel(question.medicationId);
  const categoryLabel = getCategoryLabel(question.category);

  return (
    <View style={styles.card}>
      <Text style={styles.questionText} numberOfLines={2}>
        {question.questionText}
      </Text>

      <View style={styles.chipsRow}>
        <View style={styles.chip}>
          <Text style={styles.chipText}>{question.ageGroup}</Text>
        </View>

        <View style={[styles.chip, styles.categoryChip]}>
          <Text style={[styles.chipText, styles.categoryChipText]}>
            {categoryLabel}
          </Text>
        </View>

        {medicationLabel ? (
          <View style={[styles.chip, styles.medicationChip]}>
            <Text style={[styles.chipText, styles.medicationChipText]}>
              {medicationLabel}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.bottomRow}>
        <TouchableOpacity
          style={styles.activeRow}
          onPress={() => onToggleActive(question)}
          activeOpacity={0.75}
        >
          <View
            style={[
              styles.activeDot,
              question.isActive === true ? styles.dotActive : styles.dotInactive,
            ]}
          />
          <Text style={styles.activeLabel}>
            {question.isActive === true ? 'Active' : 'Inactive'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.editButton}
          onPress={() => onEdit(question)}
          activeOpacity={0.75}
        >
          <Text style={styles.editButtonText}>✏️ Edit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  medicationChip: {
    backgroundColor: '#FFF3E0',
  },
  medicationChipText: {
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
  editButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#EBF5FF',
    borderWidth: 1,
    borderColor: '#BDD7EE',
  },
  editButtonText: {
    fontFamily: 'pixelRegular',
    fontSize: 12,
    color: '#2E6DA4',
  },
});