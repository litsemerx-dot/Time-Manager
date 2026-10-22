import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  formatRangeLabel,
  fromKey,
  getRange,
  shiftAnchor,
  todayKey,
} from '@/components/schedule/date-utils';
import { ThemedText } from '@/components/themed-text';
import { buildReport, formatMinutes } from '@/components/timer/time-utils';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getTasks, getTimeLogs } from '@/storage';

const MODES = [
  { key: 'day', label: 'День' },
  { key: 'week', label: 'Неделя' },
  { key: 'month', label: 'Месяц' },
];

const WEEKDAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const CHART_HEIGHT = 120;

// Вкладка «Отчёты»: сколько времени записано против плана за день, неделю или месяц.
// Все цифры берутся из задач и записей времени, которые лежат в storage.js.
export function ReportsView() {
  const theme = useTheme();

  const [mode, setMode] = useState('week');
  const [anchor, setAnchor] = useState(todayKey());
  const [tasks, setTasks] = useState([]);
  const [logs, setLogs] = useState([]);

  const reload = useCallback(async () => {
    setTasks(await getTasks());
    setLogs(await getTimeLogs());
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const range = useMemo(() => getRange(mode, anchor), [mode, anchor]);
  const report = useMemo(
    () => buildReport(tasks, logs, range.from, range.to),
    [tasks, logs, range.from, range.to]
  );

  const today = todayKey();
  const showsToday = today >= range.from && today <= range.to;

  // Самый высокий столбец задаёт масштаб. Минимум 60 минут, чтобы пустые дни не раздувались.
  const maxMin = Math.max(60, ...report.byDay.map((d) => Math.max(d.loggedMin, d.plannedMin)));

  function dayLabel(date) {
    const d = fromKey(date);
    if (mode === 'week') return WEEKDAYS[d.getDay()];
    // В месяце подписываем не каждый день, иначе цифры слипнутся.
    const n = d.getDate();
    return n === 1 || n % 5 === 0 ? String(n) : '';
  }

  const hasData = report.loggedMin > 0 || report.plannedMin > 0;

  return (
    <ScrollView contentContainerStyle={styles.content}>
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
        <ThemedText style={styles.rangeLabel}>{formatRangeLabel(mode, anchor)}</ThemedText>
        <Pressable
          onPress={() => setAnchor(shiftAnchor(mode, anchor, 1))}
          hitSlop={12}
          style={[styles.arrow, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText style={styles.arrowText}>›</ThemedText>
        </Pressable>
      </View>

      {!showsToday && (
        <Pressable onPress={() => setAnchor(today)} hitSlop={8}>
          <ThemedText type="linkPrimary">К сегодняшнему дню</ThemedText>
        </Pressable>
      )}

      {/* Главные цифры */}
      <View style={styles.cards}>
        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="small" themeColor="textSecondary">
            Записано
          </ThemedText>
          <ThemedText type="smallBold" style={styles.cardValue}>
            {formatMinutes(report.loggedMin)}
          </ThemedText>
        </View>
        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="small" themeColor="textSecondary">
            План
          </ThemedText>
          <ThemedText type="smallBold" style={styles.cardValue}>
            {formatMinutes(report.plannedMin)}
          </ThemedText>
        </View>
        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="small" themeColor="textSecondary">
            Задач
          </ThemedText>
          <ThemedText type="smallBold" style={styles.cardValue}>
            {report.tasksDone} / {report.tasksTotal}
          </ThemedText>
        </View>
      </View>

      {!hasData && (
        <ThemedText themeColor="textSecondary" style={styles.empty}>
          За этот период нет ни планов, ни записей времени.
        </ThemedText>
      )}

      {/* График по дням (для одного дня он не нужен) */}
      {mode !== 'day' && hasData && (
        <View style={styles.block}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            По дням
          </ThemedText>
          <View style={styles.chart}>
            {report.byDay.map((d) => {
              const plannedH = Math.round((d.plannedMin / maxMin) * CHART_HEIGHT);
              const loggedH = Math.round((d.loggedMin / maxMin) * CHART_HEIGHT);
              return (
                <View key={d.date} style={styles.col}>
                  <View style={[styles.barArea, { height: CHART_HEIGHT }]}>
                    <View
                      style={[
                        styles.barPlanned,
                        { height: plannedH, backgroundColor: theme.backgroundSelected },
                      ]}
                    />
                    <View
                      style={[styles.barLogged, { height: loggedH, backgroundColor: theme.accent }]}
                    />
                  </View>
                  <ThemedText
                    type="small"
                    themeColor={d.date === today ? 'text' : 'textSecondary'}
                    style={mode === 'month' ? styles.labelSmall : styles.label}>
                    {dayLabel(d.date)}
                  </ThemedText>
                </View>
              );
            })}
          </View>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.accent }]} />
              <ThemedText type="small" themeColor="textSecondary">
                записано
              </ThemedText>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.backgroundSelected }]} />
              <ThemedText type="small" themeColor="textSecondary">
                план
              </ThemedText>
            </View>
          </View>
        </View>
      )}

      {/* По задачам */}
      {report.byTask.length > 0 && (
        <View style={styles.block}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            По задачам
          </ThemedText>
          {report.byTask.map((item) => {
            // Шкала: если план есть, то он равен 100%, иначе берём факт
            const base = Math.max(item.plannedMin, item.loggedMin, 1);
            const percent = Math.min(100, Math.round((item.loggedMin / base) * 100));
            return (
              <View
                key={item.key}
                style={[styles.taskCard, { backgroundColor: theme.backgroundElement }]}>
                <View style={styles.taskHead}>
                  <ThemedText numberOfLines={1} style={styles.taskTitle}>
                    {item.title}
                  </ThemedText>
                  <ThemedText type="smallBold">
                    {formatMinutes(item.loggedMin)}
                    {item.plannedMin > 0 ? ' / ' + formatMinutes(item.plannedMin) : ''}
                  </ThemedText>
                </View>
                <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
                  <View
                    style={[styles.fill, { width: percent + '%', backgroundColor: theme.accent }]}
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: 120,
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
  cards: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  card: {
    flex: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  cardValue: {
    fontSize: 16,
  },
  empty: {
    textAlign: 'center',
    paddingTop: Spacing.four,
  },
  block: {
    gap: Spacing.two,
  },
  chart: {
    flexDirection: 'row',
    gap: 2,
  },
  col: {
    flex: 1,
    alignItems: 'center',
  },
  barArea: {
    alignSelf: 'stretch',
  },
  // План: широкий столбец сзади. Факт: узкий столбец поверх него.
  barPlanned: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 3,
  },
  barLogged: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    borderRadius: 3,
  },
  label: {
    marginTop: Spacing.one,
  },
  labelSmall: {
    marginTop: Spacing.one,
    width: 28,
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
  },
  legend: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  taskCard: {
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  taskHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  taskTitle: {
    flex: 1,
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: 6,
    borderRadius: 3,
  },
});
