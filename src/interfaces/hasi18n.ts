import { I18nDescriptor } from '../harmony-i18n';

export interface HasI18n {
	setI18n(i18n: string | I18nDescriptor | null): void;
}
