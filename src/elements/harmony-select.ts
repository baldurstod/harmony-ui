import { shadowRootStyle } from '../harmony-css';
import { createElement } from '../harmony-html';
import selectCSS from '../css/harmony-select.css';
import { injectGlobalCss } from '../utils/globalcss';

export class HTMLHarmonySelectElement extends HTMLElement {
	#htmlSelect: HTMLElement;
	#shadowRoot: ShadowRoot;
	constructor() {
		super();
		this.#shadowRoot = this.attachShadow({ mode: 'closed' });
		this.#htmlSelect = createElement('select', { parent: this.#shadowRoot });
	}

	connectedCallback() {
		shadowRootStyle(this.#shadowRoot, selectCSS);
		this.#shadowRoot.append(this.#htmlSelect);
	}

	attributeChangedCallback(name: string, oldValue: string, newValue: string) {
		if (name == 'multiple') {
			this.#htmlSelect.setAttribute('multiple', newValue);
		}
	}

	addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
		this.#htmlSelect.addEventListener(type, listener);
	}
	/*
		onChange(event: Event) {
			let newEvent = new event.constructor(event.type, event);
			this.dispatchEvent(newEvent);
		}
	*/

	addOption(value: string, text?: string) {
		text = text ?? value;
		const option = document.createElement('option');
		option.value = value;
		option.innerHTML = text;
		this.#htmlSelect.append(option);
	}

	addOptions(values: Map<any, any>) {
		if (values && values.entries) {
			for (const [value, text] of values.entries()) {
				this.addOption(value, text);
			}
		}
	}

	setOptions(values: Map<any, any>) {
		this.removeAllOptions();
		this.addOptions(values);
	}

	removeOption(value: any) {
		const list = this.#htmlSelect.children;
		for (let i = 0; i < list.length; i++) {
			if ((list[i] as HTMLOptionElement).value === value) {
				list[i]!.remove();
			}
		}
	}

	removeAllOptions() {
		const list = this.#htmlSelect.children;
		while (list[0]) {
			list[0].remove();
		}
	}

	select(value: any) {
		const list = this.#htmlSelect.children;
		for (let i = 0; i < list.length; i++) {
			if ((list[i] as HTMLOptionElement).value === value) {
				(list[i] as HTMLOptionElement).selected = true;
			}
		}
	}

	selectFirst() {
		if (this.#htmlSelect.children[0]) {
			(this.#htmlSelect.children[0] as HTMLOptionElement).selected = true;
			this.#htmlSelect.dispatchEvent(new Event('input'));
		}
	}

	unselect(value: any) {
		const list = this.#htmlSelect.children;
		for (let i = 0; i < list.length; i++) {
			if ((list[i] as HTMLOptionElement).value === value) {
				(list[i] as HTMLOptionElement).selected = false;
			}
		}
	}
	unselectAll() {
		const list = this.#htmlSelect.children;
		for (let i = 0; i < list.length; i++) {
			(list[i] as HTMLOptionElement).selected = false;
		}
	}

	static get observedAttributes() {
		return ['multiple'];
	}
}

let definedSelect = false;
export function defineHarmonySelect() {
	if (window.customElements && !definedSelect) {
		customElements.define('harmony-select', HTMLHarmonySelectElement);
		definedSelect = true;
		injectGlobalCss();
	}
}
