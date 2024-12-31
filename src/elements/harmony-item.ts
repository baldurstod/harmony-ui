import { createElement } from '../harmony-html';

export class HTMLHarmonyItem extends HTMLElement {
	#shadowRoot: ShadowRoot;

	constructor() {
		super();
		this.#shadowRoot = this.attachShadow({ mode: 'closed' });

		createElement('slot', {
			name: 'header',
			parent: this.#shadowRoot,
		});
		createElement('slot', {
			name: 'content',
			parent: this.#shadowRoot,
		});
	}
}

let definedHarmonyItem = false;
export function defineHarmonyItem() {
	if (window.customElements && !definedHarmonyItem) {
		customElements.define('harmony-item', HTMLHarmonyItem);
		definedHarmonyItem = true;
	}
}
