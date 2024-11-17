import { createElement } from '../harmony-html';
import { shadowRootStyle } from '../harmony-css';
import labelPropertyCSS from '../css/harmony-label-property.css';

export class HTMLHarmonyLabelPropertyElement extends HTMLElement {
	#doOnce = false;
	#htmlLabel: HTMLElement;
	#htmlProperty: HTMLElement;
	#shadowRoot: ShadowRoot;
	constructor() {
		super();
		this.#shadowRoot = this.attachShadow({ mode: 'closed' });
		shadowRootStyle(this.#shadowRoot, labelPropertyCSS);
		this.#htmlLabel = createElement('label', { i18n: '', parent: this.#shadowRoot });
		this.#htmlProperty = createElement('span', { parent: this.#shadowRoot });
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

let definedLabelProperty = false;
export function defineHarmonyLabelProperty() {
	if (window.customElements && !definedLabelProperty) {
		customElements.define('harmony-label-property', HTMLHarmonyLabelPropertyElement);
		definedLabelProperty = true;
	}
}
