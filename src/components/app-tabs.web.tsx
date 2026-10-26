import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { MaxContentWidth } from '@/constants/theme';
// Включает работу Alert.alert в браузере (см. комментарий внутри файла).
import '@/web/alert-polyfill';

// Высота полосы с вкладками без учёта нижнего отступа iPhone.
const TAB_BAR_HEIGHT = 60;

// Нижние вкладки веб-версии. Те же пять разделов, что и в app-tabs.tsx, в том же порядке.
// name — имя файла экрана в src/app, href — адрес страницы.
export default function AppTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs>
      {/* Отступ снизу, чтобы содержимое экранов не пряталось под полосой вкладок */}
      <TabSlot style={{ height: '100%', paddingBottom: TAB_BAR_HEIGHT + insets.bottom }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="index" href="/" asChild>
            <TabButton icon="✅">Задачи</TabButton>
          </TabTrigger>
          <TabTrigger name="schedule" href="/schedule" asChild>
            <TabButton icon="📅">Расписание</TabButton>
          </TabTrigger>
          <TabTrigger name="timer" href="/timer" asChild>
            <TabButton icon="⏱️">Таймер</TabButton>
          </TabTrigger>
          <TabTrigger name="stats" href="/stats" asChild>
            <TabButton icon="📊">Статистика</TabButton>
          </TabTrigger>
          <TabTrigger name="notes" href="/notes" asChild>
            <TabButton icon="📝">Заметки</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

type TabButtonProps = TabTriggerSlotProps & { icon: string };

export function TabButton({ children, isFocused, icon, ...props }: TabButtonProps) {
  return (
    <Pressable {...props} style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}>
      <ThemedText style={[styles.tabIcon, !isFocused && styles.inactive]}>{icon}</ThemedText>
      <ThemedText
        type={isFocused ? 'smallBold' : 'small'}
        themeColor={isFocused ? 'text' : 'textSecondary'}
        numberOfLines={1}
        style={styles.tabLabel}>
        {children}
      </ThemedText>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const insets = useSafeAreaInsets();

  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.bar, { height: TAB_BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom }]}>
      <View {...props} style={styles.barInner} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  barInner: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    flexDirection: 'row',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabIcon: {
    fontSize: 20,
    lineHeight: 24,
  },
  tabLabel: {
    fontSize: 12,
    lineHeight: 16,
  },
  inactive: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.7,
  },
});
