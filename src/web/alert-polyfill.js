import { Alert } from 'react-native';

// В браузере (веб-версия, iPhone) Alert.alert из React Native ничего не делает:
// окно не появляется и кнопки «Удалить» не срабатывают. Поэтому в веб-версии
// подменяем его на обычные окна браузера window.confirm / window.alert.
//
// Подключается только из app-tabs.web.tsx, то есть работает ТОЛЬКО в браузере.
// Экраны менять не нужно: они по-прежнему вызывают Alert.alert(...).
//
// Правила:
// - две кнопки (например «Отмена» и «Удалить»): показываем вопрос с «ОК / Отмена».
//   «ОК» запускает действие второй кнопки, «Отмена» — кнопку со style: 'cancel'.
// - одна кнопка или совсем без кнопок: показываем обычное сообщение.
export function webAlert(title, message, buttons) {
  const text = [title, message].filter(Boolean).join('\n\n');
  const list = Array.isArray(buttons) ? buttons : [];

  if (list.length < 2) {
    window.alert(text);
    if (list[0] && list[0].onPress) list[0].onPress();
    return;
  }

  const cancel = list.find((b) => b.style === 'cancel');
  const action = list.find((b) => b !== cancel);
  const chosen = window.confirm(text) ? action : cancel;
  if (chosen && chosen.onPress) chosen.onPress();
}

if (typeof window !== 'undefined') {
  Alert.alert = webAlert;
}
