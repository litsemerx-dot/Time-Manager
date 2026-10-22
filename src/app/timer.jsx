import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ReportsView } from '@/components/timer/reports-view';
import { TimerView } from '@/components/timer/timer-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const TABS = [
  { key: 'timer', label: 'Таймер' },
  { key: 'reports', label: 'Отчёты' },
];

// Экран «Таймер» (трекер времени).
// Сверху переключатель: Таймер (секундомер и записи за сегодня) / Отчёты (план против факта).
// Вкладок внизу оставили 5: на Android больше пяти не помещается.
export default function TimerScreen() {
  const theme = useTheme();
  const [tab, setTab] = useState('timer');

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Трекер времени</ThemedText>
          <View style={[styles.segment, { backgroundColor: theme.backgroundElement }]}>
            {TABS.map((t) => {
              const selected = t.key === tab;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => setTab(t.key)}
                  style={[styles.segmentItem, selected && { backgroundColor: theme.backgroundSelected }]}>
                  <ThemedText type={selected ? 'smallBold' : 'small'}>{t.label}</ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {tab === 'timer' ? <TimerView /> : <ReportsView />}
      </SafeAreaView>
    </ThemedView>
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
});
