/**
 * Safe URL Opening Utility
 *
 * Validates URLs before opening them externally.
 * Only allows http/https schemes to prevent unintended navigation.
 */

import { Linking } from 'react-native';
import { isOpenableUrl } from './urlValidation';

export { isOpenableUrl } from './urlValidation';

/**
 * Safely open a URL in the device's default browser.
 * Validates the scheme, checks canOpenURL, and catches errors silently.
 */
export async function safeOpenUrl(url: string): Promise<void> {
  if (!isOpenableUrl(url)) return;

  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  } catch {
    // Silently fail — opening external URLs is best-effort
  }
}
