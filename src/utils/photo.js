import { Platform } from 'react-native';

export async function uriToPersistable(uri) {
  if (!uri) return null;
  if (typeof uri === 'string' && uri.startsWith('data:')) return uri;
  if (Platform.OS !== 'web') return uri;

  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Could not read photo'));
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    return null;
  }
}
