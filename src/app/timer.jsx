
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  addTimeSession,
  getActiveSession,
  getTasks,
  saveActiveSession,
  updateTask,
} from '@/storage';

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
}

function getElapsedMs(session) {
  if (!session) return 0;

  return (
    (session.elapsedBeforePause || 0) +
    (session.runningSince
      ? Math.max(0, Date.now() - session.runningSince)
      : 0)
  );
}

export default function TimerScreen() {
  const [tasks, setTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [session, setSession] = useState(null);
  const [, setTick] = useState(0);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [allTasks, activeSession] = await Promise.all([
        getTasks(),
        getActiveSession(),
      ]);

      setTasks(allTasks.filter((task) => !task.done));
      setSession(activeSession);

      if (activeSession) {
        setSelectedTaskId(activeSession.taskId);
      }
    } catch {
      Alert.alert('Ошибка', 'Не удалось загрузить задачи.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    if (!session?.runningSince) return undefined;

    const intervalId = setInterval(() => {
      setTick((tick) => tick + 1);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [session?.runningSince]);

  async function persistSession(nextSession) {
    await saveActiveSession(nextSession);
    setSession(nextSession);
  }

  async function startOrResume() {
    if (session) {
      if (session.runningSince) return;

      await persistSession({
        ...session,
        runningSince: Date.now(),
      });
      return;
    }

    const task = tasks.find(
      (item) => item.id === selectedTaskId
    );

    if (!task) {
      Alert.alert('Выбери задачу', 'Сначала выбери задачу.');
      return;
    }

    await persistSession({
      taskId: task.id,
      taskTitle: task.title,
      startedAt: new Date().toISOString(),
      runningSince: Date.now(),
      elapsedBeforePause: 0,
    });
  }

  async function pauseTimer() {
    if (!session?.runningSince) return;

    await persistSession({
      ...session,
      elapsedBeforePause: getElapsedMs(session),
      runningSince: null,
    });
  }

  async function stopTimer() {
    if (!session || saving) return;

    setSaving(true);

    try {
      const durationMs = getElapsedMs(session);

      if (durationMs < 1000) {
        Alert.alert('Слишком короткая сессия', 'Подожди хотя бы секунду.');
        return;
      }

      await addTimeSession({
        taskId: session.taskId,
        taskTitle: session.taskTitle,
        startedAt: session.startedAt,
        endedAt: new Date().toISOString(),
        durationMs,
      });

      const allTasks = await getTasks();
      const task = allTasks.find(
        (item) => item.id === session.taskId
      );

      if (task) {
        const spentMin =
          (Number(task.spentMin) || 0) +
          Math.round(durationMs / 60000);

        await updateTask(task.id, { spentMin });
      }

      await saveActiveSession(null);
      setSession(null);
      setSelectedTaskId(null);
      await loadData();

      Alert.alert('Готово', 'Время работы сохранено.');
    } catch {
      Alert.alert('Ошибка', 'Не удалось сохранить время.');
    } finally {
      setSaving(false);
    }
  }

  const elapsed = getElapsedMs(session);
  const selectedTask = tasks.find(
    (task) => task.id === selectedTaskId
  );

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Трекер времени</Text>
      <Text style={styles.subtitle}>
        Планируй задачи и учитывай фактическое время
      </Text>

      <View style={styles.timerCard}>
        <Text style={styles.label}>
          {session ? session.taskTitle : 'Выбери задачу'}
        </Text>

        <Text style={styles.timer}>
          {formatTime(elapsed)}
        </Text>

        <Text style={styles.muted}>
          {session
            ? session.runningSince
              ? '● Идёт запись времени'
              : 'Ⅱ На паузе'
            : selectedTask
              ? `План: ${selectedTask.durationMin || 0} мин`
              : 'Таймер не запущен'}
        </Text>

        {session ? (
          <View style={styles.actions}>
            <Pressable
              style={[styles.button, styles.secondaryButton]}
              onPress={
                session.runningSince
                  ? pauseTimer
                  : startOrResume
              }
              disabled={saving}
            >
              <Text style={styles.secondaryText}>
                {session.runningSince ? 'Пауза' : 'Продолжить'}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.button, styles.primaryButton]}
              onPress={stopTimer}
              disabled={saving}
            >
              <Text style={styles.primaryText}>
                {saving ? 'Сохраняю…' : 'Завершить'}
              </Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={[styles.button, styles.primaryButton]}
            onPress={startOrResume}
          >
            <Text style={styles.primaryText}>
              ▶ Начать работу
            </Text>
          </Pressable>
        )}
      </View>

      <Text style={styles.sectionTitle}>Мои задачи</Text>

      <FlatList
        data={tasks}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.muted}>
            Нет активных задач.
          </Text>
        }
        renderItem={({ item }) => {
          const selected = selectedTaskId === item.id;

          return (
            <Pressable
              style={[
                styles.task,
                selected && styles.taskSelected,
              ]}
              onPress={() => setSelectedTaskId(item.id)}
              disabled={Boolean(session)}
            >
              <View style={styles.taskBody}>
                <Text style={styles.taskTitle}>
                  {item.title}
                </Text>
                <Text style={styles.muted}>
                  План: {item.durationMin || 0} мин
                  {' · '}
                  Учтено: {item.spentMin || 0} мин
                </Text>
              </View>

              <Text style={styles.check}>
                {selected ? '✓' : '○'}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7FB',
    padding: 20,
    paddingTop: 32,
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: '#18181B',
  },
  subtitle: {
    color: '#71717A',
    marginTop: 6,
    marginBottom: 22,
  },
  timerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E4E4E7',
  },
  label: {
    color: '#52525B',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  timer: {
    fontSize: 48,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    color: '#A855F7',
    marginVertical: 18,
  },
  muted: {
    color: '#71717A',
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
    width: '100%',
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    flex: 1,
  },
  primaryButton: {
    backgroundColor: '#A855F7',
  },
  secondaryButton: {
    backgroundColor: '#F3E8FF',
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  secondaryText: {
    color: '#7E22CE',
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 26,
    marginBottom: 12,
    color: '#18181B',
  },
  list: {
    gap: 10,
    paddingBottom: 32,
  },
  task: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  taskSelected: {
    borderColor: '#A855F7',
    backgroundColor: '#FAF5FF',
  },
  taskBody: {
    flex: 1,
    gap: 5,
  },
  taskTitle: {
    color: '#18181B',
    fontWeight: '600',
    fontSize: 15,
  },
  check: {
    color: '#9333EA',
    fontSize: 22,
  },
});
