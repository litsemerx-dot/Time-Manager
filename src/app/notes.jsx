import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NoteEditor } from '@/components/note-editor';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { deleteNote, getNotes } from '@/storage';

const ACCENT = '#208AEF';
const ALL = 'Все';

// Экран «Заметки».
// Сверху: папки (нажатие показывает заметки только этой папки).
// Ниже: заметки, новые сверху. Нажатие открывает заметку для редактирования.
// Кнопка «+» создаёт новую заметку.
export default function NotesScreen() {
  const theme = useTheme();

  const [notes, setNotes] = useState([]);
  const [folder, setFolder] = useState(ALL);
  // editing: null — окно закрыто, 'new' — новая заметка, объект — редактируем эту заметку
  const [editing, setEditing] = useState(null);

  const reload = useCallback(async () => {
    setNotes(await getNotes());
  }, []);

  // Перечитываем заметки каждый раз, когда открывается эта вкладка.
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const folders = useMemo(() => [...new Set(notes.map((n) => n.folder))].sort(), [notes]);

  const shown = useMemo(() => {
    const list = folder === ALL ? notes : notes.filter((n) => n.folder === folder);
    // Новые сверху: id — это время создания.
    return [...list].sort((a, b) => b.id.localeCompare(a.id));
  }, [notes, folder]);

  function confirmDelete(note) {
    Alert.alert('Удалить заметку?', note.title || 'Без названия', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          await deleteNote(note.id);
          reload();
        },
      },
    ]);
  }

  async function handleSaved(savedFolder) {
    setEditing(null);
    await reload();
    if (folder !== ALL) {
      setFolder(savedFolder);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.flex}>
        <View style={styles.flex}>
          <ThemedText type="subtitle" style={styles.title}>
            Заметки
          </ThemedText>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.foldersScroll}
            contentContainerStyle={styles.foldersRow}>
            {[ALL, ...folders].map((name) => (
              <Pressable
                key={name}
                onPress={() => setFolder(name)}
                style={[
                  styles.chip,
                  { backgroundColor: folder === name ? ACCENT : theme.backgroundElement },
                ]}>
                <ThemedText type="small" style={folder === name && styles.chipTextActive}>
                  {name === ALL ? 'Все' : '📁 ' + name}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>

          <ScrollView contentContainerStyle={styles.list}>
            {shown.length === 0 && (
              <ThemedText themeColor="textSecondary" style={styles.empty}>
                Заметок пока нет. Нажмите «+», чтобы написать первую.
              </ThemedText>
            )}
            {shown.map((note) => (
              <Pressable
                key={note.id}
                onPress={() => setEditing(note)}
                onLongPress={() => confirmDelete(note)}
                style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
                <View style={styles.cardHeader}>
                  <ThemedText type="smallBold" style={styles.cardTitle} numberOfLines={1}>
                    {note.title || 'Без названия'}
                  </ThemedText>
                  <Pressable onPress={() => confirmDelete(note)} hitSlop={10}>
                    <ThemedText themeColor="textSecondary">✕</ThemedText>
                  </Pressable>
                </View>
                {note.text !== '' && (
                  <ThemedText type="small" numberOfLines={3}>
                    {note.text}
                  </ThemedText>
                )}
                <ThemedText type="small" themeColor="textSecondary">
                  {note.folder} · {note.date}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>

          <Pressable
            onPress={() => setEditing('new')}
            accessibilityLabel="Новая заметка"
            style={styles.fab}>
            <ThemedText style={styles.fabText}>+</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>

      {editing !== null && (
        <NoteEditor
          note={editing === 'new' ? null : editing}
          folders={folders}
          defaultFolder={folder === ALL ? folders[0] : folder}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  title: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
  foldersScroll: {
    flexGrow: 0,
  },
  foldersRow: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 16,
  },
  chipTextActive: {
    color: '#ffffff',
  },
  list: {
    paddingHorizontal: Spacing.three,
    paddingBottom: 100,
    gap: Spacing.two,
  },
  empty: {
    textAlign: 'center',
    marginTop: Spacing.five,
  },
  card: {
    borderRadius: 14,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  cardTitle: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    right: Spacing.four,
    bottom: Spacing.four,
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
