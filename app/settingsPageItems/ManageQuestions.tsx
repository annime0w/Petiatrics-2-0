import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { useRouter } from 'expo-router';
import QuestionFormModal from '@/components/questions/QuestionFormModal';
import QuestionCard from '@/components/questions/QuestionCard';

// ─── Types ──────────────────────────────────────────────────────────────────

type QuestionBankRow = typeof schema.questionBank.$inferSelect;


// ─── Constants ───────────────────────────────────────────────────────────────

const AGE_GROUPS = [
  { label: 'All', value: 'all' },
  { label: '11-13', value: '11-13' },
  { label: '14-17', value: '14-17' },
  { label: '18-21', value: '18-21' },
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


// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AdminQuestions() {
  const router = useRouter();
  const sqliteContext = useSQLiteContext();
  const db = useMemo(() => drizzle(sqliteContext, { schema }), [sqliteContext]);

  const [questions, setQuestions] = useState<QuestionBankRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionBankRow | null>(null);

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

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const ageMatch = selectedAgeGroup === 'all' || q.ageGroup === selectedAgeGroup;
      const catMatch = selectedCategory === 'all' || q.category === selectedCategory;
      return ageMatch && catMatch;
    });
  }, [questions, selectedAgeGroup, selectedCategory]);

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

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />

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
          <Text style={styles.countBadge}>{filteredQuestions.length}</Text>
        </View>
      </View>

      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
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

      {loading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Loading questions...</Text>
        </View>
      ) : filteredQuestions.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No questions found.</Text>
          <Text style={styles.emptySubtext}>Tap "+ Add Question" to create one.</Text>
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
          <View style={{ height: 90 }} />
        </ScrollView>
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={handleAdd}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+ Add Question</Text>
      </TouchableOpacity>

      <QuestionFormModal
        visible={isModalVisible}
        editingQuestion={editingQuestion}
        onClose={handleCloseModal}
        onSaved={handleSaved}
        db={db}
        />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#7CB5DD',
  },
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
  listScroll: {
    flex: 1,
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 20,
  },
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