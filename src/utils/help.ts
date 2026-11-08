import helpCSS from '../css/help.css';
import { shadowRootStyle } from '../harmony-css';
import { createElement, createShadowRoot, hide, show, updateElement } from '../harmony-html';
import { I18nDescriptor } from '../harmony-i18n';
import { isRegistered, registerObject } from './registry';

export class Help {
	static #html: HTMLElement;
	static #shadowRoot: ShadowRoot;
	static #elements = new Map<Element, string | I18nDescriptor>();

	static {
		const onLoad = (): void => {

			document.body.addEventListener('keydown', (event: KeyboardEvent) => this.#handleKeyDown(event));
			document.body.addEventListener('keyup', (event: KeyboardEvent) => this.#handleKeyUp(event));
			this.#shadowRoot = createShadowRoot('div', {
				parent: document.body,
				hidden: true,
				childs: [
					this.#html = createElement('div', {
						class: 'help',
						hidden: true,
					}),
				],
			});
			void shadowRootStyle(this.#shadowRoot, helpCSS);
			removeEventListener('load', onLoad);

			document.body.addEventListener('mousemove', (event: MouseEvent) => {
				const p = (event.clientY / document.documentElement.clientHeight) * 100;
				this.#html.style.top = '';
				if (p < 50) {
					this.#html.style.top = `${event.clientY + 50}px`;
					this.#html.style.bottom = '';
				} else {
					this.#html.style.bottom = `${document.documentElement.clientHeight - event.clientY + 50}px`;
					this.#html.style.top = '';
				}
			});
		}

		addEventListener('load', onLoad);
	}

	static #handleKeyDown(event: KeyboardEvent): void {
		if (event.key == 'F1' && !event.repeat) {
			event.preventDefault();
			show(this.#shadowRoot);
		}
	}

	static #handleKeyUp(event: KeyboardEvent): void {
		if (event.key == 'F1') {
			hide(this.#shadowRoot);
		}
	}

	static #handleMouseOver(element: Element, event: MouseEvent): void {
		const i18n = this.#elements.get(element);
		if (i18n) {
			this.#html.classList.remove('html');
			if (i18n && typeof i18n !== 'string' && i18n.innerHTML) {
				this.#html.classList.add('html');
			}

			// Delete the previous value first
			updateElement(this.#html, {
				i18n: null,
			});
			updateElement(this.#html, {
				i18n: i18n,
			});
			show(this.#html);
		} else {
			hide(this.#html);
		}
	}

	static #handleMouseOut(): void {
		hide(this.#html);
	}

	static addElement(element: HTMLElement, i18n: string | I18nDescriptor): void {
		if (!this.#elements.has(element)) {
			element.addEventListener('mouseover', (event: MouseEvent) => Help.#handleMouseOver(element, event));
			element.addEventListener('mouseout', () => Help.#handleMouseOut());
		}
		this.#elements.set(element, i18n);
	}
}

export function enableHelp(): void {
	if (!isRegistered('Help')) {
		registerObject('Help', Help);
	}
}
