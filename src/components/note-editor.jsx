import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addNote, updateNote } from '@/storage';

const ACCENT = '#208AEF';

// Окно «новая заметка / редактировать заметку».
// note — заметка для редактирования (или null для новой).
// folders — список уже существующих папок, чтобы выбрать одну нажатием.
export function NoteEditor({ note, folders, defaultFolder, onClose, onSaved }) {
  const theme = useTheme();

  const [folder, setFolder] = useState(note?.folder ?? defaultFolder ?? 'Дневник');
  const [title, setTitle] = useState(note?.title ?? '');
  const [text, setText] = useState(note?.text ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const inputStyle = [styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }];

  async function save() {
    if (title.trim() === '' && text.trim() === '') {
      setError('Напишите название или текст заметки');
      return;
    }
    if (folder.trim() === '') {
      setError('Укажите папку');
      return;
    }

    setSaving(true);
    const data = { folder: folder.trim(), title: title.trim(), text };
    try {
      if (note) {
        await updateNote(note.id, data);
      } else {
        await addNote(data);
      }
      onSaved(data.folder);
    } catch (e) {
      setError('Не удалось сохранить. Попробуйте ещё раз.');
      setSaving(false);
    }
  }

  return (
    <Modal animationType="slide" onRequestClose={onClose}>
      <ThemedView style={styles.flex}>
        <SafeAreaView style={styles.flex}>
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.header}>
              <Pressable onPress={onClose} hitSlop={12}>
                <ThemedText themeColor="textSecondary">Отмена</ThemedText>
              </Pressable>
              <ThemedText type="smallBold">{note ? 'Заметка' : 'Новая заметка'}</ThemedText>
              <View style={styles.headerSpacer} />
            </View>

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
              <ThemedText type="smallBold" themeColor="textSecondary">
                Папка
              </ThemedText>
              {folders.length > 0 && (
                <View style={styles.chipsRow}>
                  {folders.map((name) => (
                    <Pressable
                      key={name}
                      onPress={() => setFolder(name)}
                      style={[
                        styles.chip,
                        { backgroundColor: folder === name ? ACCENT : theme.backgroundElement },
                      ]}>
                      <ThemedText type="small" style={folder === name && styles.chipTextActive}>
                        {name}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              )}
              <TextInput
                style={inputStyle}
                value={folder}
                onChangeText={(value) => {
                  setError('');
                  setFolder(value);
                }}
                placeholder="Название папки, например «Дневник»"
                placeholderTextColor={theme.textSecondary}
              />

              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
                Заголовок
              </ThemedText>
              <TextInput
                style={inputStyle}
                value={title}
                onChangeText={(value) => {
                  setError('');
                  setTitle(value);
                }}
                placeholder="Итоги дня"
                placeholderTextColor={theme.textSecondary}
              />

              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
                Текст
              </ThemedText>
              <TextInput
                style={[...inputStyle, styles.textInput]}
                value={text}
                onChangeText={(value) => {
                  setError('');
                  setText(value);
                }}
                placeholder="Что получилось сегодня, мысли, планы…"
                placeholderTextColor={theme.textSecondary}
                multiline
                textAlignVertical="top"
              />

              {error !== '' && <ThemedText style={styles.error}>{error}</ThemedText>}
            </ScrollView>

            <View style={styles.footer}>
              <Pressable
                onPress={save}
                disabled={saving}
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}>
                <ThemedText style={styles.saveText}>{saving ? 'Сохраняю…' : 'Сохранить'}</ThemedText>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  headerSpacer: {
    width: 48,
  },
  content: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.two,
  },
  sectionTitle: {
    marginTop: Spacing.three,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  input: {
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    fontSize: 16,
  },
  textInput: {
    minHeight: 200,
  },
  error: {
    color: '#E53935',
    marginTop: Spacing.two,
  },
  footer: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
    paddingTop: Spacing.two,
  },
  saveButton: {
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
