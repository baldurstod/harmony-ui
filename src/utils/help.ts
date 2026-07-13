import helpCSS from '../css/help.css';
import { shadowRootStyle } from "../harmony-css";
import { createElement, createShadowRoot, display, hide, show, updateElement } from "../harmony-html";

export class Help {
	static #display = false;
	static #html: HTMLElement;
	static #shadowRoot: ShadowRoot;
	static #elements = new Map<Element, string>();

	static {
		document.body.addEventListener('keydown', (event: KeyboardEvent) => this.#handleKeyDown(event));
		document.body.addEventListener('keyup', (event: KeyboardEvent) => this.#handleKeyUp(event));
		this.#shadowRoot = createShadowRoot('div', {
			parent: document.body,
			hidden: true,
			childs: [
				this.#html = createElement('div', {
					class: 'help',
					i18n: '',
				}),
			],
		});

		void shadowRootStyle(this.#shadowRoot, helpCSS);
	}

	static #handleKeyDown(event: KeyboardEvent): void {
		if (event.key == 'F1' && !event.repeat) {
			event.preventDefault();
			show(this.#shadowRoot);
			this.#display = true;
		}
	}

	static #handleKeyUp(event: KeyboardEvent): void {
		if (event.key == 'F1') {
			hide(this.#shadowRoot);
			this.#display = false;
		}
	}

	static #handleMouseOver(element: Element): void {
		const i18n = this.#elements.get(element);
		if (i18n) {
			updateElement(this.#html, {
				i18n: i18n,
			});
			display(this.#shadowRoot, this.#display);
		} else {
			hide(this.#shadowRoot);
		}
	}

	static #handleMouseOut(): void {
		hide(this.#shadowRoot);
	}

	static addElement(element: HTMLElement, i18n: string): void {
		if (!this.#elements.has(element)) {
			element.addEventListener('mouseover', () => Help.#handleMouseOver(element));
			element.addEventListener('mouseout', () => Help.#handleMouseOut());

		}
		this.#elements.set(element, i18n);
	}
}
