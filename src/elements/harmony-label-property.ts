import { createElement } from '../harmony-html';

export class HTMLHarmonyLabelPropertyElement extends HTMLElement {
	#doOnce = false;
	#htmlLabel: HTMLElement;
	#htmlProperty: HTMLElement;
	constructor() {
		super();
		this.#htmlLabel = createElement('label', { i18n: '' }) as HTMLElement;
		this.#htmlProperty = createElement('span') as HTMLElement;
	}

	set label(label: string) {
		this.#htmlLabel.setAttribute('data-i18n', label);
	}

	set property(property: string) {
		this.#htmlProperty.innerHTML = property;
	}

	connectedCallback() {
		if (!this.#doOnce) {
			this.#doOnce = true;
			this.append(this.#htmlLabel, this.#htmlProperty);
		}
	}
}
