import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { addDays, formatDayFriendly, isValidTime, normalizeTimeInput, todayKey } from './date-utils';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { formatMinutes } from '@/components/timer/time-utils';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addTask } from '@/storage';

const ACCENT = '#208AEF';

// Варианты длительности задачи. Это время попадёт в трекер, когда задачу отметят выполненной.
const DURATIONS = [15, 30, 45, 60, 90, 120];
const DEFAULT_DURATION = 60;

// Окно «Добавить план на день».
// Человек выбирает дату, пишет задачи и для каждой указывает время.
// После сохранения каждая задача попадает в общее хранилище (storage.js),
// поэтому её видят и другие экраны приложения.
//
// Параметры:
//   initialDate — дата, которая выбрана в форме при открытии ("2026-10-13")
//   onClose()   — закрыть окно без сохранения
//   onSaved(date) — план сохранён, date — дата плана
export function AddPlanModal({ initialDate, onClose, onSaved }) {
  const theme = useTheme();
  const nextRowId = useRef(2);

  const [date, setDate] = useState(initialDate);
  const [rows, setRows] = useState([{ id: 1, title: '', time: '', durationMin: DEFAULT_DURATION }]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const inputStyle = [styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }];

  function changeRow(id, changes) {
    setError('');
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...changes } : row)));
  }

  function addRow() {
    const id = nextRowId.current;
    nextRowId.current = id + 1;
    setRows((current) => [...current, { id, title: '', time: '', durationMin: DEFAULT_DURATION }]);
  }

  function removeRow(id) {
    setRows((current) => current.filter((row) => row.id !== id));
  }

  async function save() {
    if (saving) return;

    // Пустые строки (ни названия, ни времени) просто пропускаем.
    const filled = rows.filter((row) => row.title.trim() !== '' || row.time !== '');
    if (filled.length === 0) {
      setError('Добавьте хотя бы одну задачу');
      return;
    }
    for (const row of filled) {
      if (row.title.trim() === '') {
        setError('Напишите название задачи для времени ' + row.time);
        return;
      }
      if (!isValidTime(row.time)) {
        setError('Укажите время как ЧЧ:ММ, например 09:30 (задача «' + row.title.trim() + '»)');
        return;
      }
    }

    setSaving(true);
    try {
      // Сохраняем по одной, по очереди: addTask читает и перезаписывает весь список,
      // и если запустить несколько сразу, часть задач потеряется.
      for (const row of filled) {
        await addTask({
          title: row.title.trim(),
          date,
          time: row.time,
          durationMin: row.durationMin,
        });
      }
      onSaved(date);
    } catch (e) {
      setError('Не удалось сохранить. Попробуйте ещё раз.');
      setSaving(false);
    }
  }

  return (
    <Modal animationType="slide" onRequestClose={onClose}>
      <ThemedView style={styles.flex}>
        <SafeAreaView style={styles.flex}>
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.header}>
              <Pressable onPress={onClose} hitSlop={12}>
                <ThemedText themeColor="textSecondary">Отмена</ThemedText>
              </Pressable>
              <ThemedText type="smallBold">План на день</ThemedText>
              <View style={styles.headerSpacer} />
            </View>

            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled">
              <ThemedText type="smallBold" themeColor="textSecondary">
                Дата
              </ThemedText>
              <View style={styles.dateRow}>
                <Pressable
                  onPress={() => setDate(addDays(date, -1))}
                  hitSlop={12}
                  style={[styles.arrow, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText type="subtitle" style={styles.arrowText}>‹</ThemedText>
                </Pressable>
                <ThemedText type="default" style={styles.dateLabel}>
                  {formatDayFriendly(date)}
                </ThemedText>
                <Pressable
                  onPress={() => setDate(addDays(date, 1))}
                  hitSlop={12}
                  style={[styles.arrow, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText type="subtitle" style={styles.arrowText}>›</ThemedText>
                </Pressable>
              </View>
              <View style={styles.chipsRow}>
                <Pressable
                  onPress={() => setDate(todayKey())}
                  style={[styles.chip, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText type="small">Сегодня</ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => setDate(addDays(todayKey(), 1))}
                  style={[styles.chip, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText type="small">Завтра</ThemedText>
                </Pressable>
              </View>

              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
                Задачи
              </ThemedText>
              {rows.map((row) => (
                <View key={row.id} style={styles.rowBlock}>
                  <View style={styles.taskRow}>
                    <TextInput
                      style={[...inputStyle, styles.timeInput]}
                      value={row.time}
                      onChangeText={(text) => changeRow(row.id, { time: normalizeTimeInput(text) })}
                      placeholder="09:30"
                      placeholderTextColor={theme.textSecondary}
                      keyboardType="number-pad"
                      maxLength={5}
                    />
                    <TextInput
                      style={[...inputStyle, styles.titleInput]}
                      value={row.title}
                      onChangeText={(text) => changeRow(row.id, { title: text })}
                      placeholder="Что нужно сделать"
                      placeholderTextColor={theme.textSecondary}
                    />
                    {rows.length > 1 && (
                      <Pressable onPress={() => removeRow(row.id)} hitSlop={10} style={styles.removeButton}>
                        <ThemedText themeColor="textSecondary">✕</ThemedText>
                      </Pressable>
                    )}
                  </View>

                  {/* Сколько времени займёт задача. Уйдёт в трекер, когда её отметят выполненной. */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.durationRow}>
                    {DURATIONS.map((min) => {
                      const selected = row.durationMin === min;
                      return (
                        <Pressable
                          key={min}
                          onPress={() => changeRow(row.id, { durationMin: min })}
                          style={[
                            styles.chip,
                            { backgroundColor: selected ? ACCENT : theme.backgroundElement },
                          ]}>
                          <ThemedText type="small" style={selected && styles.chipTextSelected}>
                            {formatMinutes(min)}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              ))}

              <Pressable onPress={addRow} style={styles.addRowButton}>
                <ThemedText type="linkPrimary">+ Добавить ещё задачу</ThemedText>
              </Pressable>

              {error !== '' && <ThemedText style={styles.error}>{error}</ThemedText>}
            </ScrollView>

            <View style={styles.footer}>
              <Pressable
                onPress={save}
                disabled={saving}
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}>
                <ThemedText style={styles.saveText}>{saving ? 'Сохраняю…' : 'Сохранить план'}</ThemedText>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  headerSpacer: {
    width: 48,
  },
  content: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.two,
  },
  sectionTitle: {
    marginTop: Spacing.three,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  arrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    fontSize: 26,
    lineHeight: 30,
  },
  dateLabel: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '600',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 16,
  },
  rowBlock: {
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  durationRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  chipTextSelected: {
    color: '#ffffff',
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    fontSize: 16,
  },
  timeInput: {
    width: 84,
    textAlign: 'center',
  },
  titleInput: {
    flex: 1,
  },
  removeButton: {
    paddingHorizontal: Spacing.one,
  },
  addRowButton: {
    paddingVertical: Spacing.two,
  },
  error: {
    color: '#E53935',
    marginTop: Spacing.two,
  },
  footer: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
    paddingTop: Spacing.two,
  },
  saveButton: {
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
