import selectCSS from '../css/harmony-select.css';
import { shadowRootStyle } from '../harmony-css';
import { createElement } from '../harmony-html';
import { injectGlobalCss } from '../utils/globalcss';

export class HTMLHarmonySelectElement extends HTMLElement {
	#htmlSelect: HTMLElement;
	#shadowRoot: ShadowRoot;

	constructor() {
		super();
		this.#shadowRoot = this.attachShadow({ mode: 'closed' });
		this.#htmlSelect = createElement('select', { parent: this.#shadowRoot });
	}

	connectedCallback(): void {
		void shadowRootStyle(this.#shadowRoot, selectCSS);
		this.#shadowRoot.append(this.#htmlSelect);
	}

	attributeChangedCallback(name: string, oldValue: string, newValue: string): void {
		if (name == 'multiple') {
			this.#htmlSelect.setAttribute('multiple', newValue);
		}
	}

	addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
		this.#htmlSelect.addEventListener(type, listener);
	}
	/*
		onChange(event: Event) {
			let newEvent = new event.constructor(event.type, event);
			this.dispatchEvent(newEvent);
		}
	*/

	addOption(value: string, text?: string): void {
		text = text ?? value;
		const option = document.createElement('option');
		option.value = value;
		option.innerHTML = text;
		this.#htmlSelect.append(option);
	}

	addOptions(values: Map<string, string>): void {
		if (values && values.entries) {
			for (const [value, text] of values.entries()) {
				this.addOption(value, text);
			}
		}
	}

	setOptions(values: Map<string, string>): void {
		this.removeAllOptions();
		this.addOptions(values);
	}

	removeOption(value: string): void {
		for (const option of this.#htmlSelect.children) {
			if ((option as HTMLOptionElement).value === value) {
				(option as HTMLOptionElement).remove();
			}
		}
	}

	removeAllOptions(): void {
		const list = this.#htmlSelect.children;
		while (list[0]) {
			list[0].remove();
		}
	}

	select(value: string): void {
		for (const option of this.#htmlSelect.children) {
			if ((option as HTMLOptionElement).value === value) {
				(option as HTMLOptionElement).selected = true;
			}
		}
	}

	selectFirst(): void {
		if (this.#htmlSelect.children[0]) {
			(this.#htmlSelect.children[0] as HTMLOptionElement).selected = true;
			this.#htmlSelect.dispatchEvent(new Event('input'));
		}
	}

	unselect(value: string): void {
		for (const option of this.#htmlSelect.children) {
			if ((option as HTMLOptionElement).value === value) {
				(option as HTMLOptionElement).selected = false;
			}
		}
	}

	unselectAll(): void {
		for (const option of this.#htmlSelect.children) {
			(option as HTMLOptionElement).selected = false;
		}
	}

	static get observedAttributes(): string[] {
		return ['multiple'];
	}
}

let definedSelect = false;
export function defineHarmonySelect(): void {
	if (window.customElements && !definedSelect) {
		customElements.define('harmony-select', HTMLHarmonySelectElement);
		definedSelect = true;
		injectGlobalCss();
	}
}
