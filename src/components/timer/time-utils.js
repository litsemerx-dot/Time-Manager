// Помощники для трекера времени: форматирование минут и сбор данных для отчётов.

import { addDays } from '@/components/schedule/date-utils';

function pad(n) {
  return n < 10 ? '0' + n : String(n);
}

// 45 -> "45 мин", 60 -> "1 ч", 95 -> "1 ч 35 мин"
export function formatMinutes(min) {
  const total = Math.max(0, Math.round(min));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0) return rest + ' мин';
  if (rest === 0) return hours + ' ч';
  return hours + ' ч ' + rest + ' мин';
}

// 3725 секунд -> "01:02:05"
export function formatClock(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  return pad(hours) + ':' + pad(minutes) + ':' + pad(s % 60);
}

function sumBy(list, getValue) {
  return list.reduce((sum, item) => sum + (getValue(item) || 0), 0);
}

// Собирает отчёт за период [from, to] (даты вида "2026-10-21", включительно).
//
// Возвращает:
//   loggedMin   — сколько времени записано (факт)
//   plannedMin  — сколько запланировано (сумма длительностей задач периода)
//   tasksTotal, tasksDone — число задач периода и сколько из них выполнено
//   byDay  — [{ date, loggedMin, plannedMin }] по каждому дню периода
//   byTask — [{ key, title, loggedMin, plannedMin }], сначала те, на кого ушло больше времени
export function buildReport(tasks, logs, from, to) {
  const periodLogs = logs.filter((l) => l.date >= from && l.date <= to);
  const periodTasks = tasks.filter((t) => t.date && t.date >= from && t.date <= to);

  const byDay = [];
  const dayIndex = {};
  for (let date = from; date <= to; date = addDays(date, 1)) {
    dayIndex[date] = byDay.length;
    byDay.push({ date, loggedMin: 0, plannedMin: 0 });
  }
  for (const log of periodLogs) {
    byDay[dayIndex[log.date]].loggedMin += log.durationMin;
  }
  for (const task of periodTasks) {
    byDay[dayIndex[task.date]].plannedMin += task.durationMin || 0;
  }

  const taskById = {};
  for (const task of tasks) taskById[task.id] = task;

  const groups = {};
  for (const log of periodLogs) {
    const key = log.taskId || 'free:' + log.title;
    if (!groups[key]) {
      const task = log.taskId ? taskById[log.taskId] : null;
      groups[key] = {
        key,
        title: (task && task.title) || log.title || 'Без названия',
        loggedMin: 0,
        plannedMin: task ? task.durationMin || 0 : 0,
      };
    }
    groups[key].loggedMin += log.durationMin;
  }
  // Задачи, которые запланированы, но времени на них ещё нет, тоже показываем.
  for (const task of periodTasks) {
    if (!groups[task.id]) {
      groups[task.id] = {
        key: task.id,
        title: task.title,
        loggedMin: 0,
        plannedMin: task.durationMin || 0,
      };
    }
  }

  const byTask = Object.values(groups).sort(
    (a, b) => b.loggedMin - a.loggedMin || b.plannedMin - a.plannedMin
  );

  return {
    loggedMin: sumBy(periodLogs, (l) => l.durationMin),
    plannedMin: sumBy(periodTasks, (t) => t.durationMin),
    tasksTotal: periodTasks.length,
    tasksDone: periodTasks.filter((t) => t.done).length,
    byDay,
    byTask,
  };
}
