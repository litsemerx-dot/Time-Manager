import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { todayKey } from '@/components/schedule/date-utils';
import { ThemedText } from '@/components/themed-text';
import { formatClock, formatMinutes } from '@/components/timer/time-utils';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  deleteTimeLog,
  getActiveTimer,
  getTasks,
  getTimeLogs,
  startTimer,
  stopTimer,
} from '@/storage';

const SOURCE_LABELS = { timer: 'таймер', auto: 'авто', manual: 'вручную' };

// Вкладка «Таймер»: секундомер, задачи на сегодня и записи времени за сегодня.
// Запись в трекер появляется двумя способами:
//   1. Нажали ▶ у задачи или ввели название, потом «Стоп». Записывается пройденное время.
//   2. Задачу с длительностью отметили выполненной (в «Задачах» или «Расписании»).
//      Недостающее до плана время запишется само (см. setTaskDone в storage.js).
export function TimerView() {
  const theme = useTheme();

  const [active, setActive] = useState(null); // { taskId, title, startedAt } или null
  const [now, setNow] = useState(Date.now());
  const [tasks, setTasks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setActive(await getActiveTimer());
    setTasks(await getTasks());
    setLogs(await getTimeLogs());
  }, []);

  // Перечитываем данные при каждом открытии вкладки: задачи могли измениться.
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  // Пока таймер идёт, раз в секунду обновляем цифры на экране.
  useEffect(() => {
    if (!active) return undefined;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

  async function start(task) {
    if (busy) return;
    const name = task ? task.title : title.trim();
    if (!name) {
      Alert.alert('Над чем работаем?', 'Напишите название или выберите задачу ниже.');
      return;
    }
    setBusy(true);
    try {
      await startTimer({ taskId: task ? task.id : null, title: name });
      setTitle('');
      await reload();
    } finally {
      setBusy(false);
    }
  }

  async function stop() {
    if (busy) return;
    setBusy(true);
    try {
      await stopTimer();
      await reload();
    } finally {
      setBusy(false);
    }
  }

  function confirmDeleteLog(log) {
    Alert.alert('Удалить запись?', log.title + ' · ' + formatMinutes(log.durationMin), [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          await deleteTimeLog(log.id);
          await reload();
        },
      },
    ]);
  }

  const today = todayKey();
  const todayTasks = tasks
    .filter((t) => t.date === today && !t.done)
    .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
  const todayLogs = logs
    .filter((l) => l.date === today)
    .sort((a, b) => (b.start || '').localeCompare(a.start || ''));
  const loggedToday = todayLogs.reduce((sum, l) => sum + l.durationMin, 0);
  const plannedToday = tasks
    .filter((t) => t.date === today)
    .reduce((sum, t) => sum + (t.durationMin || 0), 0);

  const elapsedSec = active ? (now - active.startedAt) / 1000 : 0;

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* Секундомер */}
      <View style={[styles.timerCard, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="small" themeColor="textSecondary">
          {active ? 'Сейчас идёт' : 'Таймер остановлен'}
        </ThemedText>
        <ThemedText style={styles.clock}>{formatClock(elapsedSec)}</ThemedText>

        {active ? (
          <>
            <ThemedText numberOfLines={2} style={styles.activeTitle}>
              {active.title}
            </ThemedText>
            <Pressable
              onPress={stop}
              disabled={busy}
              style={[styles.mainButton, { backgroundColor: theme.danger }, busy && styles.disabled]}>
              <ThemedText style={[styles.mainButtonText, { color: theme.accentText }]}>
                Стоп и записать
              </ThemedText>
            </Pressable>
          </>
        ) : (
          <>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
              value={title}
              onChangeText={setTitle}
              placeholder="Над чем работаете?"
              placeholderTextColor={theme.textSecondary}
              returnKeyType="go"
              onSubmitEditing={() => start(null)}
            />
            <Pressable
              onPress={() => start(null)}
              disabled={busy}
              style={[styles.mainButton, { backgroundColor: theme.accent }, busy && styles.disabled]}>
              <ThemedText style={[styles.mainButtonText, { color: theme.accentText }]}>
                Старт
              </ThemedText>
            </Pressable>
          </>
        )}
      </View>

      {/* Итог дня */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryBox, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="small" themeColor="textSecondary">
            Записано сегодня
          </ThemedText>
          <ThemedText type="smallBold">{formatMinutes(loggedToday)}</ThemedText>
        </View>
        <View style={[styles.summaryBox, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="small" themeColor="textSecondary">
            Запланировано
          </ThemedText>
          <ThemedText type="smallBold">{formatMinutes(plannedToday)}</ThemedText>
        </View>
      </View>

      {/* Задачи на сегодня */}
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
        Задачи на сегодня
      </ThemedText>
      {todayTasks.length === 0 && (
        <ThemedText type="small" themeColor="textSecondary">
          Невыполненных задач на сегодня нет. Добавьте их во вкладке «Задачи» или «Расписание».
        </ThemedText>
      )}
      {todayTasks.map((task) => {
        const isRunning = active && active.taskId === task.id;
        return (
          <View key={task.id} style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.rowBody}>
              <ThemedText numberOfLines={2}>{task.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {task.time || '—'} · план {formatMinutes(task.durationMin || 0)}
                {task.spentMin > 0 ? ' · записано ' + formatMinutes(task.spentMin) : ''}
              </ThemedText>
            </View>
            <Pressable
              onPress={() => (isRunning ? stop() : start(task))}
              disabled={busy}
              accessibilityLabel={isRunning ? 'Остановить таймер' : 'Запустить таймер для задачи'}
              style={[
                styles.playButton,
                { backgroundColor: isRunning ? theme.danger : theme.accent },
              ]}>
              <ThemedText style={[styles.playText, { color: theme.accentText }]}>
                {isRunning ? '■' : '▶'}
              </ThemedText>
            </Pressable>
          </View>
        );
      })}

      {/* Записи за сегодня */}
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
        Записи за сегодня
      </ThemedText>
      {todayLogs.length === 0 && (
        <ThemedText type="small" themeColor="textSecondary">
          Пока пусто. Запустите таймер или отметьте задачу выполненной.
        </ThemedText>
      )}
      {todayLogs.map((log) => (
        <View key={log.id} style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
          <View style={styles.rowBody}>
            <ThemedText numberOfLines={2}>{log.title}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {log.start ? log.start + ' · ' : ''}
              {SOURCE_LABELS[log.source] ?? log.source}
            </ThemedText>
          </View>
          <ThemedText type="smallBold">{formatMinutes(log.durationMin)}</ThemedText>
          <Pressable onPress={() => confirmDeleteLog(log)} hitSlop={10} accessibilityLabel="Удалить запись">
            <ThemedText themeColor="textSecondary">✕</ThemedText>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: 120,
    gap: Spacing.two,
  },
  timerCard: {
    borderRadius: Radius.lg,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
  },
  clock: {
    fontSize: 52,
    lineHeight: 60,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  activeTitle: {
    textAlign: 'center',
  },
  input: {
    alignSelf: 'stretch',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    fontSize: 16,
  },
  mainButton: {
    alignSelf: 'stretch',
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  mainButtonText: {
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.6,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  summaryBox: {
    flex: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  sectionTitle: {
    marginTop: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
  },
  rowBody: {
    flex: 1,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
  },
});
