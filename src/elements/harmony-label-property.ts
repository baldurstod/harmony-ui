import labelPropertyCSS from '../css/harmony-label-property.css';
import { shadowRootStyle } from '../harmony-css';
import { createElement } from '../harmony-html';
import { injectGlobalCss } from '../utils/globalcss';

export class HTMLHarmonyLabelPropertyElement extends HTMLElement {
	#doOnce = false;
	#htmlLabel: HTMLElement;
	#htmlProperty: HTMLElement;
	#shadowRoot: ShadowRoot;

	constructor() {
		super();
		this.#shadowRoot = this.attachShadow({ mode: 'closed' });
		void shadowRootStyle(this.#shadowRoot, labelPropertyCSS);
		this.#htmlLabel = createElement('label', { i18n: '', parent: this.#shadowRoot });
		this.#htmlProperty = createElement('span', { parent: this.#shadowRoot });
	}

	set label(label: string) {
		this.#htmlLabel.setAttribute('data-i18n', label);
	}

	set property(property: string) {
		this.#htmlProperty.innerHTML = property;
	}

	connectedCallback(): void {
		if (!this.#doOnce) {
			this.#doOnce = true;
			this.append(this.#htmlLabel, this.#htmlProperty);
		}
	}
}

let definedLabelProperty = false;
export function defineHarmonyLabelProperty(): void {
	if (window.customElements && !definedLabelProperty) {
		customElements.define('harmony-label-property', HTMLHarmonyLabelPropertyElement);
		definedLabelProperty = true;
		injectGlobalCss();
	}
}
