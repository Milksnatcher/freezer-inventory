import { Alert, Platform } from 'react-native';
// Alert.alert does nothing on web, so use window.alert there.
export const notify = (title: string, msg?: string) =>
  Platform.OS === 'web' ? window.alert(msg ? `${title}\n${msg}` : title) : Alert.alert(title, msg);

export const confirm = (title: string, msg: string): Promise<boolean> =>
  Platform.OS === 'web'
    ? Promise.resolve(window.confirm(`${title}\n${msg}`))
    : new Promise(res => Alert.alert(title, msg, [
        { text: 'Cancel', style: 'cancel', onPress: () => res(false) },
        { text: 'OK', onPress: () => res(true) },
      ]));
