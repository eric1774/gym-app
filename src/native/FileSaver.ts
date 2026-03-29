import { NativeModules } from 'react-native';

const { FileSaver } = NativeModules;

/**
 * Opens the Android SAF "Save As" dialog, letting the user pick
 * a location and filename, then writes the content to that file.
 *
 * Returns true if saved, false if the user cancelled.
 */
export async function saveFileToDevice(
  content: string,
  suggestedName: string,
  mimeType: string = 'application/json',
): Promise<boolean> {
  return FileSaver.saveFile(content, suggestedName, mimeType);
}
