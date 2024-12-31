import { createElement } from '../harmony-html';
import itemCSS from '../css/harmony-item.css';
import { shadowRootStyle } from '../harmony-css';

export class HTMLHarmonyItem extends HTMLElement {
	#shadowRoot: ShadowRoot;
	#htmlHeader: HTMLSlotElement;
	#htmlContent: HTMLSlotElement;

	constructor() {
		super();
		this.#shadowRoot = this.attachShadow({ mode: 'closed' });
		shadowRootStyle(this.#shadowRoot, itemCSS);

		this.#htmlHeader = createElement('slot', {
			name: 'header',
			parent: this.#shadowRoot,
		}) as HTMLSlotElement;
		this.#htmlContent = createElement('slot', {
			name: 'content',
			parent: this.#shadowRoot,
		}) as HTMLSlotElement;
	}

	getHeader() {
		return this.#htmlHeader;
	}

	getContent() {
		return this.#htmlContent;
	}
}

let definedHarmonyItem = false;
export function defineHarmonyItem() {
	if (window.customElements && !definedHarmonyItem) {
		customElements.define('harmony-item', HTMLHarmonyItem);
		definedHarmonyItem = true;
	}
}
