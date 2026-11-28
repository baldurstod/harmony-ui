import { HarmonyInput, HarmonyInputInfoLevel } from '../components/input';
import { defineElement } from '../harmony-html';
import { I18nDescriptor } from '../harmony-i18n';
import { HasI18n } from '../interfaces/hasi18n';

export class HTMLHarmonyInputElement extends HTMLElement implements HasI18n {
	#input = new HarmonyInput({ container: this });

	addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void {
		this.#input.addEventListener(type, listener, options);
	}

	get value(): string {
		return this.#input.getValue();
	}

	set value(value: string) {
		this.#input.setValue(value);
	}

	get disabled(): boolean {
		return this.#input.getDisabled();
	}

	set disabled(value: boolean) {
		this.#input.setDisabled(value);
	}

	setInfo(info: string | I18nDescriptor | null): void {
		this.#input.setInfo(info);
	}

	setWarning(warning: string | I18nDescriptor | null): void {
		this.#input.setWarning(warning);
	}

	setError(error: string | I18nDescriptor | null): void {
		this.#input.setError(error);
	}

	setInfoBox(info: string | I18nDescriptor | null, level: HarmonyInputInfoLevel = 'info'): void {
		this.#input.setInfoBox(info, level);
	}

	setTitleI18n(i18n: string | I18nDescriptor | null): void {
		this.#input.setTitleI18n(i18n);
	}

	attributeChangedCallback(name: string, oldValue: string, newValue: string): void {
		switch (name) {
			case 'label':
				this.#input.setLabel(newValue);
				break;
			case 'i18n':
				this.#input.setTitleI18n(newValue);
				break;
			case 'info':
				this.#input.setInfo(newValue);
				break;
			case 'warning':
				this.#input.setWarning(newValue);
				break;
			case 'error':
				this.#input.setError(newValue);
				break;
		}
	}

	static get observedAttributes(): string[] {
		return ['label', 'i18n', 'info', 'warning', 'error'];
	}
}

export function defineHarmonyInput(suffix: string = ''): void {
	defineElement('harmony-input' + suffix, HTMLHarmonyInputElement);
}
