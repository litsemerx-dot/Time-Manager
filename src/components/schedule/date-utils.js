// Помощники для работы с датами в разделе «Расписание».
//
// Дата в приложении хранится строкой "2026-10-13" (так же, как в storage.js).
// Все расчёты идут по МЕСТНОМУ времени телефона, а не по UTC. Поэтому здесь
// нет toISOString(): ночью он может «сдвинуть» дату на день.

const MONTHS_GENITIVE = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

const MONTHS_NOMINATIVE = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

// Индекс = Date.getDay(): 0 — воскресенье, 1 — понедельник и так далее.
const WEEKDAYS_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

function pad(n) {
  return n < 10 ? '0' + n : String(n);
}

// Date -> "2026-10-13"
export function toKey(date) {
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

// "2026-10-13" -> Date (полночь по местному времени)
export function fromKey(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function todayKey() {
  return toKey(new Date());
}

// Сдвигает дату на n дней (n может быть отрицательным).
export function addDays(key, n) {
  const date = fromKey(key);
  date.setDate(date.getDate() + n);
  return toKey(date);
}

// Понедельник той недели, в которую попадает дата.
export function startOfWeek(key) {
  const date = fromKey(key);
  const daysSinceMonday = (date.getDay() + 6) % 7;
  return addDays(key, -daysSinceMonday);
}

// Границы периода (включительно): { from, to }.
// mode: 'day' | 'week' | 'month'
export function getRange(mode, key) {
  if (mode === 'day') {
    return { from: key, to: key };
  }
  if (mode === 'week') {
    const from = startOfWeek(key);
    return { from, to: addDays(from, 6) };
  }
  // месяц
  const date = fromKey(key);
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0); // день 0 = последний день месяца
  return { from: toKey(first), to: toKey(last) };
}

// Листание периода: direction = -1 (назад) или +1 (вперёд).
export function shiftAnchor(mode, key, direction) {
  if (mode === 'day') {
    return addDays(key, direction);
  }
  if (mode === 'week') {
    return addDays(key, direction * 7);
  }
  const date = fromKey(key);
  return toKey(new Date(date.getFullYear(), date.getMonth() + direction, 1));
}

// "Пн, 13 октября"
export function formatDay(key) {
  const date = fromKey(key);
  return WEEKDAYS_SHORT[date.getDay()] + ', ' + date.getDate() + ' ' + MONTHS_GENITIVE[date.getMonth()];
}

// То же, но для сегодня и завтра пишет слово: "Сегодня, 13 октября".
export function formatDayFriendly(key) {
  const date = fromKey(key);
  const text = date.getDate() + ' ' + MONTHS_GENITIVE[date.getMonth()];
  if (key === todayKey()) return 'Сегодня, ' + text;
  if (key === addDays(todayKey(), 1)) return 'Завтра, ' + text;
  return formatDay(key);
}

// Подпись над списком: день / неделя / месяц.
export function formatRangeLabel(mode, key) {
  if (mode === 'day') {
    return formatDayFriendly(key);
  }
  const { from, to } = getRange(mode, key);
  const fromDate = fromKey(from);
  const toDate = fromKey(to);
  if (mode === 'month') {
    return MONTHS_NOMINATIVE[fromDate.getMonth()] + ' ' + fromDate.getFullYear();
  }
  // неделя
  if (fromDate.getMonth() === toDate.getMonth()) {
    return fromDate.getDate() + '–' + toDate.getDate() + ' ' + MONTHS_GENITIVE[toDate.getMonth()];
  }
  return (
    fromDate.getDate() + ' ' + MONTHS_GENITIVE[fromDate.getMonth()] +
    ' – ' +
    toDate.getDate() + ' ' + MONTHS_GENITIVE[toDate.getMonth()]
  );
}

// ---------- Время ----------

// Превращает ввод с клавиатуры в вид "ЧЧ:ММ".
// "9" -> "09", "930" -> "09:30", "1845" -> "18:45".
export function normalizeTimeInput(text) {
  let digits = text.replace(/\D/g, '');
  if (digits.length > 0 && digits[0] > '2') {
    digits = '0' + digits; // первая цифра 3–9 — значит час из одной цифры
  }
  digits = digits.slice(0, 4);
  if (digits.length > 2) {
    return digits.slice(0, 2) + ':' + digits.slice(2);
  }
  return digits;
}

// true для "00:00" ... "23:59".
export function isValidTime(text) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(text);
}

// Для сортировки: задачи без времени идут в конец дня.
export function compareTime(a, b) {
  const first = a || '99:99';
  const second = b || '99:99';
  return first.localeCompare(second);
}
