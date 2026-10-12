import { I18n } from '../harmony-i18n';

/**
 * Wrapper around window.prompt(), but the message is an i18n key.
 * @param messageI18n The i18n key of text to display to the user.
 * @param defaultValue A string containing the default value displayed in the text input field.
 * @returns A string containing the text entered by the user, or null.
 */
export function promptI18n(messageI18n: string, defaultValue?: string): string | null {
	return prompt(I18n.getString(messageI18n), defaultValue);
}
