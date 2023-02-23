import {createElement} from 'harmony-ui';

export class HarmonyLabelProperty extends HTMLElement {
	#doOnce = false;
	#htmlLabel;
	#htmlProperty;
	constructor() {
		super();
		this.#initHtml();
	}

	#initHtml() {
		this.#htmlLabel = createElement('label', {i18n:''});
		this.#htmlProperty = createElement('span');
	}

	set label(label) {
		this.#htmlLabel.setAttribute('data-i18n', label);
	}

	set property(property) {
		this.#htmlProperty.innerHTML = property;
	}

	connectedCallback() {
		if (!this.#doOnce) {
			this.#doOnce = true;
			this.append(this.#htmlLabel, this.#htmlProperty);
		}
	}
}
