import AsyncStorage from '@react-native-async-storage/async-storage';

// Общее хранилище задач и заметок. Данные лежат в памяти телефона.
// Все экраны берут и сохраняют задачи и заметки только через эти функции.
//
// Задача:  { id, title, date: "2026-10-10", time: "18:00", durationMin: 60,
//            priority: "low" | "medium" | "high", done: false, spentMin: 0 }
// Заметка: { id, folder: "Дневник", title, text, date: "2026-10-10" }
// Запись времени (трекер): { id, taskId | null, title, date: "2026-10-10", start: "09:30",
//            durationMin: 45, source: "timer" | "auto" | "manual" }
//   timer  — записано секундомером на вкладке «Таймер»
//   auto   — создано само, когда задачу с длительностью отметили выполненной
//   manual — добавлено вручную
//
// Все функции асинхронные, поэтому вызываем их с await:
//   const tasks = await getTasks();
//   await addTask({ title: 'Сделать домашку', date: '2026-10-10' });

const TASKS_KEY = 'tasks';
const NOTES_KEY = 'notes';
const LOGS_KEY = 'timeLogs';
const TIMER_KEY = 'activeTimer';

async function readList(key) {
  const json = await AsyncStorage.getItem(key);
  return json ? JSON.parse(json) : [];
}

async function writeList(key, list) {
  await AsyncStorage.setItem(key, JSON.stringify(list));
}

function newId() {
  return String(Date.now()) + Math.floor(Math.random() * 1000);
}

// ---------- Задачи ----------

export async function getTasks() {
  return readList(TASKS_KEY);
}

// Добавляет задачу и возвращает её вместе с новым id.
export async function addTask(task) {
  const newTask = {
    id: newId(),
    title: '',
    date: '',
    time: '',
    durationMin: 0,
    priority: 'medium',
    done: false,
    spentMin: 0,
    ...task,
  };
  const tasks = await getTasks();
  await writeList(TASKS_KEY, [...tasks, newTask]);
  return newTask;
}

// Меняет только переданные поля, например updateTask(id, { done: true }).
export async function updateTask(id, changes) {
  const tasks = await getTasks();
  const updated = tasks.map((t) => (t.id === id ? { ...t, ...changes } : t));
  await writeList(TASKS_KEY, updated);
}

// Записи секундомера удалённой задачи остаются в отчётах (время реально потрачено),
// а авто-записи пропадают: они считались от плана, а плана больше нет.
export async function deleteTask(id) {
  const tasks = await getTasks();
  await writeList(TASKS_KEY, tasks.filter((t) => t.id !== id));
  const logs = await getTimeLogs();
  await writeList(LOGS_KEY, logs.filter((l) => !(l.taskId === id && l.source === 'auto')));
}

// ---------- Заметки ----------

export async function getNotes() {
  return readList(NOTES_KEY);
}

// Добавляет заметку и возвращает её вместе с новым id.
export async function addNote(note) {
  const newNote = {
    id: newId(),
    folder: 'Без папки',
    title: '',
    text: '',
    date: new Date().toISOString().slice(0, 10),
    ...note,
  };
  const notes = await getNotes();
  await writeList(NOTES_KEY, [...notes, newNote]);
  return newNote;
}

export async function updateNote(id, changes) {
  const notes = await getNotes();
  const updated = notes.map((n) => (n.id === id ? { ...n, ...changes } : n));
  await writeList(NOTES_KEY, updated);
}

export async function deleteNote(id) {
  const notes = await getNotes();
  await writeList(NOTES_KEY, notes.filter((n) => n.id !== id));
}

// ---------- Трекер времени ----------

function pad2(n) {
  return n < 10 ? '0' + n : String(n);
}

// Date -> "2026-10-21" по местному времени (не по UTC)
function dateKeyOf(date) {
  return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
}

// Date -> "09:30"
function timeOf(date) {
  return pad2(date.getHours()) + ':' + pad2(date.getMinutes());
}

export async function getTimeLogs() {
  return readList(LOGS_KEY);
}

// Пересчитывает task.spentMin как сумму всех записей времени этой задачи.
async function syncSpent(taskId) {
  if (!taskId) return;
  const logs = await getTimeLogs();
  const spent = logs
    .filter((l) => l.taskId === taskId)
    .reduce((sum, l) => sum + l.durationMin, 0);
  await updateTask(taskId, { spentMin: spent });
}

// Добавляет запись времени и возвращает её.
// Пример: await addTimeLog({ taskId: task.id, title: task.title, durationMin: 30 });
export async function addTimeLog(log) {
  const now = new Date();
  const newLog = {
    id: newId(),
    taskId: null,
    title: '',
    date: dateKeyOf(now),
    start: timeOf(now),
    durationMin: 0,
    source: 'manual',
    ...log,
  };
  const logs = await getTimeLogs();
  await writeList(LOGS_KEY, [...logs, newLog]);
  await syncSpent(newLog.taskId);
  return newLog;
}

export async function deleteTimeLog(id) {
  const logs = await getTimeLogs();
  const log = logs.find((l) => l.id === id);
  await writeList(LOGS_KEY, logs.filter((l) => l.id !== id));
  if (log) await syncSpent(log.taskId);
}

// Отмечает задачу выполненной / невыполненной и сама ведёт учёт времени.
// Выполнена: в трекер попадает недостающее время, то есть
//   «длительность задачи» минус «уже записано секундомером». Двойного учёта нет.
// Снята отметка: авто-записи этой задачи удаляются, записи секундомера остаются.
// Все экраны отмечают задачи только через эту функцию, а не через updateTask.
export async function setTaskDone(taskId, done) {
  const tasks = await getTasks();
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return;

  if (done) {
    await updateTask(taskId, { done: true });

    const logs = await getTimeLogs();
    const alreadyMin = logs
      .filter((l) => l.taskId === taskId)
      .reduce((sum, l) => sum + l.durationMin, 0);
    const leftMin = (task.durationMin || 0) - alreadyMin;

    if (leftMin > 0) {
      // Задача из будущего, отмеченная сегодня: пишем время на сегодня.
      const today = dateKeyOf(new Date());
      const isFuture = task.date > today;
      await addTimeLog({
        taskId,
        title: task.title,
        date: isFuture || !task.date ? today : task.date,
        start: isFuture ? '' : task.time || '',
        durationMin: leftMin,
        source: 'auto',
      });
    }
  } else {
    const logs = await getTimeLogs();
    await writeList(LOGS_KEY, logs.filter((l) => !(l.taskId === taskId && l.source === 'auto')));
    await syncSpent(taskId);
    await updateTask(taskId, { done: false });
  }
}

// ---------- Секундомер ----------
// Запущенный таймер хранится как { taskId, title, startedAt: миллисекунды }.
// Время считается от startedAt, поэтому таймер идёт, даже если приложение закрыли.

export async function getActiveTimer() {
  const json = await AsyncStorage.getItem(TIMER_KEY);
  return json ? JSON.parse(json) : null;
}

// Запускает таймер. Если уже идёт другой, он сначала останавливается и записывается.
export async function startTimer({ taskId = null, title }) {
  await stopTimer();
  const timer = { taskId, title, startedAt: Date.now() };
  await AsyncStorage.setItem(TIMER_KEY, JSON.stringify(timer));
  return timer;
}

// Останавливает таймер и кладёт результат в трекер.
// Меньше 30 секунд считаем случайным нажатием и не записываем (вернёт null).
export async function stopTimer() {
  const timer = await getActiveTimer();
  if (!timer) return null;
  await AsyncStorage.removeItem(TIMER_KEY);

  const seconds = Math.round((Date.now() - timer.startedAt) / 1000);
  if (seconds < 30) return null;

  const started = new Date(timer.startedAt);
  return addTimeLog({
    taskId: timer.taskId,
    title: timer.title,
    date: dateKeyOf(started),
    start: timeOf(started),
    durationMin: Math.max(1, Math.round(seconds / 60)),
    source: 'timer',
  });
}
