import { addTask, deleteTask, getTasks, setTaskDone } from '@/storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useTheme } from '@/hooks/use-theme';



const FILTERS = [
  { key: 'all', label: 'Все' },
  { key: 'active', label: 'Активные' },
  { key: 'done', label: 'Выполненные' },
];

const PRIORITY = {
  high: { label: 'Высокий', color: '#E5484D' },
  medium: { label: 'Средний', color: '#F5A524' },
  low: { label: 'Низкий', color: '#30A46C' },
};

const DURATIONS = [15, 30, 45, 60, 90, 120];

const todayString = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export default function App() {
  // цвета берём из общей темы, чтобы экран работал и в тёмной теме
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [confirmId, setConfirmId] = useState(null); // задача, для которой показано «Удалить?»

  // поля формы
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(todayString());
  const [time, setTime] = useState('12:00');
  const [duration, setDuration] = useState('60');
  const [priority, setPriority] = useState('medium');
  const [error, setError] = useState('');

    const loadTasks = useCallback(async () => {
    const data = [...(await getTasks())];
    data.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    setTasks(data);
  }, []);

  // перечитываем задачи каждый раз, когда вкладка открывается
  useFocusEffect(
    useCallback(() => {
      loadTasks();
    }, [loadTasks])
  );

  const handleAdd = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Напиши, что нужно сделать');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError('Дата в формате ГГГГ-ММ-ДД, например 2026-10-10');
      return;
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      setError('Время в формате ЧЧ:ММ, например 18:00');
      return;
    }

    await addTask({
      id: String(Date.now()),
      title: trimmed,
      date,
      time,
      durationMin: parseInt(duration, 10) || 60,
      priority,
      done: false,
      spentMin: 0,
    });

    setTitle('');
    setError('');
    loadTasks();
  };

  const toggleDone = async (task) => {
    // Через setTaskDone: при выполнении время задачи само попадает в трекер
    await setTaskDone(task.id, !task.done);
    loadTasks();
  };

  const removeTask = async (task) => {
    await deleteTask(task.id);
    setConfirmId(null);
    loadTasks();
  };

  const visibleTasks = tasks.filter((t) => {
    if (filter === 'active') return !t.done;
    if (filter === 'done') return t.done;
    return true;
  });

  const renderTask = ({ item }) => {
    const p = PRIORITY[item.priority] ?? PRIORITY.low;
    const confirming = confirmId === item.id;
    return (
      <View style={styles.card}>
        <Pressable
          onPress={() => toggleDone(item)}
          style={[styles.checkbox, item.done && styles.checkboxDone]}
          hitSlop={8}
        >
          {item.done && <Text style={styles.checkmark}>✓</Text>}
        </Pressable>

        <View style={styles.cardBody}>
          <Text style={[styles.title, item.done && styles.titleDone]}>{item.title}</Text>
          <Text style={styles.secondary}>
            {item.date} · {item.time} · {item.durationMin} мин
            {item.spentMin > 0 ? ' · записано ' + item.spentMin + ' мин' : ''}
          </Text>
          <Text style={{ color: p.color }}>{p.label}</Text>
        </View>

        {confirming ? (
          <View style={styles.confirmBox}>
            <Pressable style={styles.confirmYes} onPress={() => removeTask(item)}>
              <Text style={styles.confirmYesText}>Удалить</Text>
            </Pressable>
            <Pressable style={styles.confirmNo} onPress={() => setConfirmId(null)}>
              <Text style={styles.chipText}>Отмена</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => setConfirmId(item.id)} hitSlop={8}>
            <Text style={styles.deleteIcon}>🗑</Text>
          </Pressable>
        )}
      </View>
    );
  };

  const header = (
    <View>
      <Text style={styles.header}>Задачи</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Что нужно сделать?"
          placeholderTextColor={theme.textSecondary}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />

        <View style={styles.row}>
          <View style={styles.field}>
            <Text style={styles.label}>Дата</Text>
            <TextInput
              style={styles.input}
              value={date}
              onChangeText={setDate}
              placeholder="2026-10-10"
              placeholderTextColor={theme.textSecondary}
            />
          </View>
          <View style={styles.fieldSmall}>
            <Text style={styles.label}>Время</Text>
            <TextInput
              style={styles.input}
              value={time}
              onChangeText={setTime}
              placeholder="18:00"
              placeholderTextColor={theme.textSecondary}
            />
          </View>
          <View style={styles.fieldSmall}>
            <Text style={styles.label}>Минут</Text>
            <TextInput
              style={styles.input}
              value={duration}
              onChangeText={(v) => setDuration(v.replace(/\D/g, ''))}
              keyboardType="numeric"
              placeholder="60"
              placeholderTextColor={theme.textSecondary}
            />
          </View>
        </View>

        {/* Быстрый выбор длительности. Это время попадёт в трекер, когда задачу отметят выполненной */}
        <View style={styles.rowWrap}>
          {DURATIONS.map((m) => (
            <Pressable
              key={m}
              onPress={() => setDuration(String(m))}
              style={[styles.chipSmall, duration === String(m) && styles.chipActive]}
            >
              <Text style={[styles.chipText, duration === String(m) && styles.chipTextActive]}>{m} мин</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.row}>
          {Object.entries(PRIORITY).map(([key, p]) => (
            <Pressable
              key={key}
              onPress={() => setPriority(key)}
              style={[
                styles.chip,
                priority === key && { backgroundColor: p.color, borderColor: p.color },
              ]}
            >
              <Text style={[styles.chipText, priority === key && styles.chipTextActive]}>{p.label}</Text>
            </Pressable>
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={styles.addButton} onPress={handleAdd}>
          <Text style={styles.addButtonText}>Добавить задачу</Text>
        </Pressable>
      </View>

      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[styles.chip, filter === f.key && styles.chipActive]}
          >
            <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>{f.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <FlatList
          data={visibleTasks}
          extraData={confirmId}
          keyExtractor={(t) => t.id}
          renderItem={renderTask}
          ListHeaderComponent={header}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Text style={[styles.secondary, styles.empty]}>Задач нет</Text>}
        />
      </View>
    </View>
  );
}

// c — цвета текущей темы (светлой или тёмной), см. src/constants/theme.ts
function makeStyles(c) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    // на широком экране браузера ограничиваем ширину, на телефоне ничего не меняется
    content: {
      flex: 1,
      width: '100%',
      maxWidth: 600,
      alignSelf: 'center',
      paddingHorizontal: 16,
      paddingTop: 32,
    },
    header: { fontSize: 28, fontWeight: '700', marginBottom: 12, color: c.text },
    form: { gap: 10 },
    row: { flexDirection: 'row', gap: 8 },
    rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chipSmall: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
    },
    field: { flex: 2, gap: 4 },
    fieldSmall: { flex: 1, gap: 4 },
    label: { color: c.textSecondary, fontSize: 12 },
    input: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
      color: c.text,
      backgroundColor: c.backgroundElement,
    },
    error: { color: '#E5484D' },
    addButton: {
      backgroundColor: '#3B82F6',
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
    },
    addButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
    filters: { flexDirection: 'row', gap: 8, marginVertical: 16 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.border,
    },
    chipActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
    chipTextActive: { color: '#fff' },
    list: { gap: 10, paddingBottom: 40 },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.backgroundElement,
    },
    cardBody: { flex: 1, gap: 2 },
    title: { fontSize: 16, color: c.text },
    titleDone: { textDecorationLine: 'line-through', opacity: 0.5 },
    secondary: { color: c.textSecondary },
    checkbox: {
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 2,
      borderColor: c.textSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxDone: { backgroundColor: '#30A46C', borderColor: '#30A46C' },
    checkmark: { color: '#fff', fontSize: 14 },
    deleteIcon: { fontSize: 20 },
    confirmBox: { gap: 6 },
    confirmYes: {
      backgroundColor: '#E5484D',
      borderRadius: 8,
      paddingVertical: 6,
      paddingHorizontal: 10,
      alignItems: 'center',
    },
    confirmYesText: { color: '#fff', fontWeight: '600' },
    confirmNo: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 8,
      paddingVertical: 6,
      paddingHorizontal: 10,
      alignItems: 'center',
    },
    empty: { textAlign: 'center', marginTop: 32 },
    chipText: { color: c.text },
  });
}