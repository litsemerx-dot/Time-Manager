import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddPlanModal } from '@/components/schedule/add-plan-modal';
import {
  compareTime,
  formatDay,
  formatRangeLabel,
  getRange,
  shiftAnchor,
  todayKey,
} from '@/components/schedule/date-utils';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { deleteTask, getTasks, updateTask } from '@/storage';

const ACCENT = '#208AEF';
const PRIORITY_COLORS = { low: '#34A853', medium: '#F9A825', high: '#E53935' };

// Если кнопка «+» стоит слишком высоко или низко, поменяйте это число.
const FAB_BOTTOM = Spacing.four;

const MODES = [
  { key: 'day', label: 'День' },
  { key: 'week', label: 'Неделя' },
  { key: 'month', label: 'Месяц' },
];

// Экран «Расписание».
// Сверху: переключатель День / Неделя / Месяц и стрелки для листания периодов.
// Ниже: задачи выбранного периода, сгруппированные по дням и отсортированные по времени.
// Кнопка «+» открывает форму добавления плана на день.
export default function ScheduleScreen() {
  const theme = useTheme();

  const [mode, setMode] = useState('day');
  const [anchor, setAnchor] = useState(todayKey()); // любая дата внутри показываемого периода
  const [tasks, setTasks] = useState([]);
  const [formOpen, setFormOpen] = useState(false);

  const reload = useCallback(async () => {
    setTasks(await getTasks());
  }, []);

  // Перечитываем задачи каждый раз, когда открывается эта вкладка:
  // другие экраны могли добавить или изменить задачи.
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const range = useMemo(() => getRange(mode, anchor), [mode, anchor]);

  // Задачи периода, сгруппированные по датам: [{ date, items: [...] }, ...]
  const { sections, total, done } = useMemo(() => {
    const inRange = tasks.filter((t) => t.date && t.date >= range.from && t.date <= range.to);
    inRange.sort((a, b) => a.date.localeCompare(b.date) || compareTime(a.time, b.time));

    const groups = [];
    for (const task of inRange) {
      const last = groups[groups.length - 1];
      if (last && last.date === task.date) {
        last.items.push(task);
      } else {
        groups.push({ date: task.date, items: [task] });
      }
    }
    return {
      sections: groups,
      total: inRange.length,
      done: inRange.filter((t) => t.done).length,
    };
  }, [tasks, range.from, range.to]);

  const today = todayKey();
  const showsToday = today >= range.from && today <= range.to;

  async function toggleDone(task) {
    await updateTask(task.id, { done: !task.done });
    await reload();
  }

  function confirmDelete(task) {
    Alert.alert('Удалить задачу?', task.title, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          await deleteTask(task.id);
          await reload();
        },
      },
    ]);
  }

  // План сохранён: если его дата не попадает в открытый период, переходим к ней,
  // чтобы человек сразу увидел только что добавленное.
  async function handleSaved(date) {
    setFormOpen(false);
    if (date < range.from || date > range.to) {
      setAnchor(date);
    }
    await reload();
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container}>
        <View style={styles.container}>
          <View style={styles.header}>
            <ThemedText type="subtitle">Расписание</ThemedText>

            <View style={[styles.segment, { backgroundColor: theme.backgroundElement }]}>
              {MODES.map((m) => {
                const selected = m.key === mode;
                return (
                  <Pressable
                    key={m.key}
                    onPress={() => setMode(m.key)}
                    style={[styles.segmentItem, selected && { backgroundColor: theme.backgroundSelected }]}>
                    <ThemedText type={selected ? 'smallBold' : 'small'}>{m.label}</ThemedText>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.navRow}>
              <Pressable
                onPress={() => setAnchor(shiftAnchor(mode, anchor, -1))}
                hitSlop={12}
                style={[styles.arrow, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText style={styles.arrowText}>‹</ThemedText>
              </Pressable>
              <ThemedText type="default" style={styles.rangeLabel}>
                {formatRangeLabel(mode, anchor)}
              </ThemedText>
              <Pressable
                onPress={() => setAnchor(shiftAnchor(mode, anchor, 1))}
                hitSlop={12}
                style={[styles.arrow, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText style={styles.arrowText}>›</ThemedText>
              </Pressable>
            </View>

            <View style={styles.infoRow}>
              <ThemedText type="small" themeColor="textSecondary">
                {total === 0 ? 'Задач нет' : 'Задач: ' + total + ' · выполнено: ' + done}
              </ThemedText>
              {!showsToday && (
                <Pressable onPress={() => setAnchor(today)} hitSlop={8}>
                  <ThemedText type="linkPrimary">К сегодняшнему дню</ThemedText>
                </Pressable>
              )}
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.list}>
            {sections.length === 0 && (
              <View style={styles.empty}>
                <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                  На этот период ничего не запланировано.{'\n'}Нажмите «+», чтобы добавить план.
                </ThemedText>
              </View>
            )}

            {sections.map((section) => (
              <View key={section.date} style={styles.section}>
                {/* В режиме «День» дата уже написана сверху, повторять не нужно */}
                {mode !== 'day' && (
                  <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
                    {formatDay(section.date)}
                  </ThemedText>
                )}
                {section.items.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggle={() => toggleDone(task)}
                    onDelete={() => confirmDelete(task)}
                  />
                ))}
              </View>
            ))}
          </ScrollView>

          <Pressable
            onPress={() => setFormOpen(true)}
            accessibilityLabel="Добавить план на день"
            style={[styles.fab, { bottom: FAB_BOTTOM }]}>
            <ThemedText style={styles.fabText}>+</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>

      {formOpen && (
        <AddPlanModal
          initialDate={mode === 'day' || !showsToday ? anchor : today}
          onClose={() => setFormOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </ThemedView>
  );
}

// Одна строка расписания: галочка, время, название, цвет приоритета, кнопка удаления.
function TaskRow({ task, onToggle, onDelete }) {
  const theme = useTheme();
  const priorityColor = PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.medium;

  return (
    <View style={[styles.taskRow, { backgroundColor: theme.backgroundElement }]}>
      <Pressable onPress={onToggle} hitSlop={8} accessibilityLabel="Отметить выполненной">
        <View style={[styles.checkbox, { borderColor: task.done ? ACCENT : theme.textSecondary }, task.done && styles.checkboxDone]}>
          {task.done && <ThemedText style={styles.checkMark}>✓</ThemedText>}
        </View>
      </Pressable>

      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.time}>
        {task.time || '—'}
      </ThemedText>

      <ThemedText style={[styles.taskTitle, task.done && styles.taskTitleDone]} numberOfLines={2}>
        {task.title}
      </ThemedText>

      <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />

      <Pressable onPress={onDelete} hitSlop={10} accessibilityLabel="Удалить задачу">
        <ThemedText themeColor="textSecondary">✕</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    gap: Spacing.three,
  },
  segment: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
  },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: 10,
  },
  navRow: {
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
  rangeLabel: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  list: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: 120, // запас снизу, чтобы кнопка «+» не закрывала последнюю задачу
    gap: Spacing.three,
  },
  empty: {
    paddingTop: Spacing.six,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
  section: {
    gap: Spacing.two,
  },
  sectionTitle: {
    marginTop: Spacing.two,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: 14,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: {
    backgroundColor: ACCENT,
  },
  checkMark: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  time: {
    width: 44,
  },
  taskTitle: {
    flex: 1,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  priorityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  fab: {
    position: 'absolute',
    right: Spacing.four,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  fabText: {
    color: '#ffffff',
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '500',
  },
});
