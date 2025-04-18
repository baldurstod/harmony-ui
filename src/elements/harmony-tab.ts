import { createElement, hide, show, display } from '../harmony-html';
import { toBool } from '../utils/attributes';
import { injectGlobalCss } from '../utils/globalcss';
import { HTMLHarmonyTabGroupElement } from './harmony-tab-group';

export class HTMLHarmonyTabElement extends HTMLElement {
	#disabled = false;
	#active = false;
	#header: HTMLElement;
	#group?: HTMLHarmonyTabGroupElement;
	constructor() {
		super();
		this.#header = createElement('div', {
			class: 'harmony-tab-label',
			...(this.getAttribute('data-i18n')) && { i18n: this.getAttribute('data-i18n') },
			...(this.getAttribute('data-text')) && { innerText: this.getAttribute('data-text') },
			events: {
				click: (event: MouseEvent) => this.#click(),
			},
		}) as HTMLElement;
	}

	get htmlHeader() {
		return this.#header;
	}

	connectedCallback() {
		const parentElement = this.parentElement as HTMLHarmonyTabGroupElement;
		if (parentElement && parentElement.tagName == 'HARMONY-TAB-GROUP') {
			parentElement.addTab(this);
			this.#group = parentElement;
		}
	}

	attributeChangedCallback(name: string, oldValue: string, newValue: string) {
		switch (name) {
			case 'data-i18n':
				this.#header.setAttribute('data-i18n', newValue);
				this.#header.innerText = newValue;
				this.#header.classList.add('i18n');
				break;
			case 'data-text':
				this.#header.innerText = newValue;
				break;
			case 'disabled':
				this.disabled = toBool(newValue);
				break;
		}
	}

	set disabled(disabled) {
		this.#disabled = disabled ? true : false;
		this.#header.classList[this.#disabled ? 'add' : 'remove']('disabled');
	}

	get disabled() {
		return this.#disabled;
	}

	activate() {
		this.setActive(true);
	}

	/**
	 * @deprecated use setActive() instead
	 */
	set active(active: boolean) {
		console.warn('deprecated, use setActive instead');
		this.setActive(active);
	}

	setActive(active: boolean) {
		if (this.#active != active) {
			this.#active = active;
			if (active) {
				this.dispatchEvent(new CustomEvent('activated'));
			} else {
				this.dispatchEvent(new CustomEvent('deactivated'));
			}
		}
		display(this, active);
		if (active) {
			this.#header.classList.add('activated');
		} else {
			this.#header.classList.remove('activated');
		}

		if (active && this.#group) {
			this.#group.activateTab(this);
		}
	}

	/**
	 * @deprecated use isActive() instead
	 */
	get active(): boolean {
		console.warn('deprecated, use getActive instead');
		return this.isActive();
	}

	isActive() {
		return this.#active;
	}

	#click() {
		if (!this.dispatchEvent(new CustomEvent('click', { cancelable: true }))) {
			return;
		}

		if (!this.#disabled) {
			this.activate();
		}
	}

	static get observedAttributes() {
		return ['data-i18n', 'data-text', 'disabled'];
	}
}

let definedTab = false;
export function defineHarmonyTab() {
	if (window.customElements && !definedTab) {
		customElements.define('harmony-tab', HTMLHarmonyTabElement);
		definedTab = true;
		injectGlobalCss();
	}
}
