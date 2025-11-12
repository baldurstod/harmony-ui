import itemCSS from '../css/harmony-item.css';
import { shadowRootStyle } from '../harmony-css';
import { createElement } from '../harmony-html';

export class HTMLHarmonyItemElement extends HTMLElement {
	#shadowRoot: ShadowRoot;
	#htmlHeader: HTMLSlotElement;
	#htmlContent: HTMLSlotElement;
	#id = '';

	constructor() {
		super();
		this.#shadowRoot = this.attachShadow({ mode: 'closed' });
		void shadowRootStyle(this.#shadowRoot, itemCSS);

		this.#htmlHeader = createElement('slot', {
			name: 'header',
			parent: this.#shadowRoot,
		}) as HTMLSlotElement;
		this.#htmlContent = createElement('slot', {
			name: 'content',
			parent: this.#shadowRoot,
		}) as HTMLSlotElement;
	}

	getHeader(): HTMLSlotElement {
		return this.#htmlHeader;
	}

	getContent(): HTMLSlotElement {
		return this.#htmlContent;
	}

	getId(): string {
		return this.#id;
	}

	attributeChangedCallback(name: string, oldValue: string, newValue: string): void {
		switch (name) {
			case 'id':
			case 'item-id':
				this.#id = newValue;
				break;
		}
	}

	static get observedAttributes(): string[] {
		return ['id', 'item-id'];
	}
}

let definedHarmonyItem = false;
export function defineHarmonyItem(): void {
	if (window.customElements && !definedHarmonyItem) {
		customElements.define('harmony-item', HTMLHarmonyItemElement);
		definedHarmonyItem = true;
	}
}
