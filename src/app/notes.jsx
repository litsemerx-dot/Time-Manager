// src/app/notes.jsx
// Экран «Папки и заметки». Три состояния в одном файле:
//   папки → заметки внутри папки → редактор заметки.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';

const STORAGE_KEY = 'notes:v1';
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export default function NotesScreen() {
  // цвета берём из общей темы, чтобы экран работал и в тёмной теме
  const theme = useTheme();
  const C = useMemo(() => makeColors(theme), [theme]);
  const s = useMemo(() => makeStyles(C), [C]);
  const [data, setData] = useState({ folders: [], notes: [] });
  const [loaded, setLoaded] = useState(false);
  const [folderId, setFolderId] = useState(null); // открытая папка
  const [editing, setEditing] = useState(null); // редактируемая заметка
  const [newFolder, setNewFolder] = useState('');

  // загрузка
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setData(JSON.parse(raw));
      } catch (e) {
        console.warn('Не удалось прочитать заметки', e);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // сохранение (только после первой загрузки, чтобы не затереть данные)
  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch((e) =>
      console.warn('Не удалось сохранить заметки', e)
    );
  }, [data, loaded]);

  const folder = data.folders.find((f) => f.id === folderId);
  const notesInFolder = data.notes
    .filter((n) => n.folderId === folderId)
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const countNotes = (id) => data.notes.filter((n) => n.folderId === id).length;

  // ---------- действия ----------
  const addFolder = () => {
    const name = newFolder.trim();
    if (!name) return;
    setData((d) => ({ ...d, folders: [...d.folders, { id: uid(), name }] }));
    setNewFolder('');
  };

  const confirmDeleteFolder = (f) => {
    const n = countNotes(f.id);
    Alert.alert(
      `Удалить папку «${f.name}»?`,
      n > 0 ? `Заметки внутри (${n}) тоже удалятся.` : 'Папка пуста.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () =>
            setData((d) => ({
              folders: d.folders.filter((x) => x.id !== f.id),
              notes: d.notes.filter((x) => x.folderId !== f.id),
            })),
        },
      ]
    );
  };

  const startNewNote = () =>
    setEditing({ id: uid(), folderId, title: '', text: '', updatedAt: Date.now(), isNew: true });

  const saveNote = () => {
    const { isNew, ...note } = editing;
    if (!note.title.trim() && !note.text.trim()) {
      setEditing(null); // пустую заметку не сохраняем
      return;
    }
    note.updatedAt = Date.now();
    setData((d) => ({
      ...d,
      notes: isNew ? [...d.notes, note] : d.notes.map((n) => (n.id === note.id ? note : n)),
    }));
    setEditing(null);
  };

  const confirmDeleteNote = () => {
    Alert.alert('Удалить заметку?', '', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => {
          setData((d) => ({ ...d, notes: d.notes.filter((n) => n.id !== editing.id) }));
          setEditing(null);
        },
      },
    ]);
  };

  // ---------- экран: редактор ----------
  if (editing) {
    return (
      <SafeAreaView style={s.screen}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={s.header}>
            <Pressable onPress={saveNote} hitSlop={8}>
              <Text style={s.link}>Сохранить</Text>
            </Pressable>
            {!editing.isNew && (
              <Pressable onPress={confirmDeleteNote} hitSlop={8}>
                <Text style={[s.link, s.danger]}>Удалить</Text>
              </Pressable>
            )}
          </View>
          <TextInput
            style={s.titleInput}
            placeholder="Заголовок"
            placeholderTextColor={C.muted}
            value={editing.title}
            onChangeText={(title) => setEditing((e) => ({ ...e, title }))}
          />
          <TextInput
            style={s.bodyInput}
            placeholder="Текст заметки"
            placeholderTextColor={C.muted}
            multiline
            textAlignVertical="top"
            value={editing.text}
            onChangeText={(text) => setEditing((e) => ({ ...e, text }))}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ---------- экран: заметки в папке ----------
  if (folder) {
    return (
      <SafeAreaView style={s.screen}>
        <View style={s.header}>
          <Pressable onPress={() => setFolderId(null)} hitSlop={8}>
            <Text style={s.link}>‹ Папки</Text>
          </Pressable>
          <Pressable onPress={startNewNote} hitSlop={8}>
            <Text style={s.link}>Новая заметка</Text>
          </Pressable>
        </View>
        <Text style={s.title}>{folder.name}</Text>
        <FlatList
          data={notesInFolder}
          keyExtractor={(n) => n.id}
          contentContainerStyle={s.list}
          ListEmptyComponent={
            <Text style={s.empty}>В этой папке пока нет заметок. Нажми «Новая заметка».</Text>
          }
          renderItem={({ item }) => (
            <Pressable style={s.row} onPress={() => setEditing(item)}>
              <Text style={s.rowTitle} numberOfLines={1}>
                {item.title || 'Без заголовка'}
              </Text>
              {!!item.text && (
                <Text style={s.rowSub} numberOfLines={2}>
                  {item.text}
                </Text>
              )}
              <Text style={s.rowDate}>{new Date(item.updatedAt).toLocaleDateString('ru-RU')}</Text>
            </Pressable>
          )}
        />
      </SafeAreaView>
    );
  }

  // ---------- экран: список папок ----------
  return (
    <SafeAreaView style={s.screen}>
      <Text style={s.title}>Заметки</Text>
      <View style={s.addRow}>
        <TextInput
          style={s.addInput}
          placeholder="Название новой папки"
          placeholderTextColor={C.muted}
          value={newFolder}
          onChangeText={setNewFolder}
          onSubmitEditing={addFolder}
          returnKeyType="done"
        />
        <Pressable style={s.addBtn} onPress={addFolder}>
          <Text style={s.addBtnText}>Создать</Text>
        </Pressable>
      </View>
      <FlatList
        data={data.folders}
        keyExtractor={(f) => f.id}
        contentContainerStyle={s.list}
        ListEmptyComponent={
          loaded ? <Text style={s.empty}>Папок пока нет. Создай первую выше.</Text> : null
        }
        renderItem={({ item }) => (
          <Pressable
            style={s.row}
            onPress={() => setFolderId(item.id)}
            onLongPress={() => confirmDeleteFolder(item)}
          >
            <Text style={s.rowTitle}>{item.name}</Text>
            <Text style={s.rowSub}>Заметок: {countNotes(item.id)}</Text>
          </Pressable>
        )}
      />
      {data.folders.length > 0 && (
        <Text style={s.hint}>Удерживай папку, чтобы удалить её</Text>
      )}
    </SafeAreaView>
  );
}

function makeColors(t) {
  return {
    bg: t.background,
    card: t.backgroundElement,
    text: t.text,
    muted: t.textSecondary,
    accent: t.accent ?? '#1F6F68',
    accentText: t.accentText ?? '#fff',
    line: t.border ?? t.backgroundSelected,
    danger: t.danger ?? '#C0392B',
  };
}

function makeStyles(C) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 16 },
    header: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
    link: { color: C.accent, fontSize: 16, fontWeight: '600' },
    danger: { color: C.danger },
    title: { fontSize: 28, fontWeight: '700', color: C.text, marginTop: 8, marginBottom: 12 },
    list: { paddingBottom: 24, gap: 10 },
    row: {
      backgroundColor: C.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.line,
      padding: 14,
    },
    rowTitle: { fontSize: 17, fontWeight: '600', color: C.text },
    rowSub: { fontSize: 14, color: C.muted, marginTop: 4 },
    rowDate: { fontSize: 12, color: C.muted, marginTop: 8 },
    empty: { color: C.muted, fontSize: 15, marginTop: 24, textAlign: 'center' },
    hint: { color: C.muted, fontSize: 12, textAlign: 'center', paddingVertical: 8 },
    addRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    addInput: {
      flex: 1,
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.line,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 16,
      color: C.text,
    },
    addBtn: {
      backgroundColor: C.accent,
      borderRadius: 12,
      paddingHorizontal: 16,
      justifyContent: 'center',
    },
    addBtnText: { color: C.accentText, fontWeight: '600', fontSize: 16 },
    titleInput: { fontSize: 24, fontWeight: '700', color: C.text, paddingVertical: 8 },
    bodyInput: { flex: 1, fontSize: 17, lineHeight: 24, color: C.text, paddingTop: 8 },
  });
}
