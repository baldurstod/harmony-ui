import { closeSVG } from 'harmony-svg';
import { createElement, display } from '../harmony-html';
import { toBool } from '../utils/attributes';
import { injectGlobalCss } from '../utils/globalcss';
import { HTMLHarmonyTabGroupElement } from './harmony-tab-group';

export type TabEventData = {
	tab: HTMLHarmonyTabElement;
	originalEvent?: Event;
};


export class HTMLHarmonyTabElement extends HTMLElement {
	#disabled = false;
	#active = false;
	#header: HTMLElement;
	#htmlTitle: HTMLElement;
	#htmlClose: HTMLElement;
	#group?: HTMLHarmonyTabGroupElement;
	#closed = false;

	constructor() {
		super();
		this.#header = createElement('div', {
			class: 'tab',
			childs: [
				this.#htmlTitle = createElement('span', {
					...(this.getAttribute('data-i18n')) && { i18n: this.getAttribute('data-i18n') },
					...(this.getAttribute('data-text')) && { innerText: this.getAttribute('data-text') },
				}),
				this.#htmlClose = createElement('span', {
					class: 'close',
					innerHTML: closeSVG,
					hidden: !toBool(this.getAttribute('data-closable') ?? ''),
					$click: (event: Event) => { event.stopPropagation(); this.close() },
				}),
			],
			$click: () => this.#click(),
			$contextmenu: (event: PointerEvent) => this.#onContextMenu(event),
		}) as HTMLElement;
	}

	get htmlHeader() {
		return this.#header;
	}

	getGroup(): HTMLHarmonyTabGroupElement | undefined {
		return this.#group;
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
				this.#htmlTitle.setAttribute('data-i18n', newValue);
				this.#htmlTitle.innerText = newValue;
				this.#htmlTitle.classList.add('i18n');
				break;
			case 'data-text':
				this.#htmlTitle.innerText = newValue;
				break;
			case 'disabled':
				this.disabled = toBool(newValue);
			case 'data-closable':
				display(this.#htmlClose, toBool(newValue));
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

	close(): boolean {
		if (this.#closed) {
			return false;
		}
		if (!this.dispatchEvent(new CustomEvent<TabEventData>('close', { cancelable: true, detail: { tab: this } }))) {
			return false;
		}
		this.#group?.closeTab(this);
		return true;
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
				this.dispatchEvent(new CustomEvent<TabEventData>('activated', { detail: { tab: this } }));
			} else {
				this.dispatchEvent(new CustomEvent<TabEventData>('deactivated', { detail: { tab: this } }));
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

	isClosed() {
		return this.#closed;
	}

	#click() {
		if (!this.dispatchEvent(new CustomEvent<TabEventData>('click', { cancelable: true, detail: { tab: this } }))) {
			return;
		}

		if (!this.#disabled) {
			this.activate();
		}
	}

	#onContextMenu(event: PointerEvent) {
		this.dispatchEvent(new CustomEvent<TabEventData>('contextmenu', { detail: { tab: this, originalEvent: event } }));
	}

	scrollIntoView() {
		this.#header.scrollIntoView();
	}

	static get observedAttributes() {
		return ['data-i18n', 'data-text', 'disabled', 'data-closable'];
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
