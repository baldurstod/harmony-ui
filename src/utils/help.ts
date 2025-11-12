import helpCSS from '../css/help.css';
import { shadowRootStyle } from "../harmony-css";
import { createElement, createShadowRoot, display, hide, show, updateElement } from "../harmony-html";

let helpInstance: Help | null = null;

export function getHelp(): Help {
	if (!helpInstance) {
		helpInstance = new Help();
	}
	return helpInstance;
}

class Help {
	#display = false;
	#html: HTMLElement;
	#shadowRoot: ShadowRoot;
	#elements = new Map<Element, string>();

	constructor() {
		document.body.addEventListener('keydown', (event: KeyboardEvent) => this.#handleKeyDown(event));
		document.body.addEventListener('keyup', (event: KeyboardEvent) => this.#handleKeyUp(event));
		document.body.addEventListener('mousemove', (event: MouseEvent) => this.#handleMouseMove(event));
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

	#handleKeyDown(event: KeyboardEvent): void {
		if (event.key == 'F1') {
			event.preventDefault();
			show(this.#shadowRoot);
			this.#display = true;
		}
	}

	#handleKeyUp(event: KeyboardEvent): void {
		if (event.key == 'F1') {
			hide(this.#shadowRoot);
			this.#display = false;
		}
	}

	#handleMouseMove(event: MouseEvent): void {
		const element = document.elementFromPoint(event.clientX, event.clientY);
		if (!element) {
			return;
		}
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

	addElement(element: HTMLElement, i18n: string): void {
		this.#elements.set(element, i18n);
	}
}
