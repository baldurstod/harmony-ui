import { HarmonyInput } from '../components/input';
import { defineElement } from '../harmony-html';

export class HTMLHarmonyInputElement extends HTMLElement {
	#input = new HarmonyInput();

	connectedCallback(): void {
		this.append(this.#input.htmlElement);
	}

	attributeChangedCallback(name: string, oldValue: string, newValue: string): void {
		switch (name) {
			case 'label':
				this.#input.setLabel(newValue);
				break;
			case 'i18n':
				this.#input.setTitleI18n(newValue);
				break;
		}
	}

	static get observedAttributes(): string[] {
		return ['label', 'i18n'];
	}
}

export function defineHarmonyInput(suffix: string = ''): void {
	defineElement('harmony-input' + suffix, HTMLHarmonyInputElement);
}
