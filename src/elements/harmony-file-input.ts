import { shadowRootStyle } from '../harmony-css';
import { createElement } from '../harmony-html';
import fileInputCSS from '../css/harmony-file-input.css';
import { folderOpenSVG } from 'harmony-svg';
import { cloneEvent } from '../utils/events';
import { I18n } from '../harmony-i18n';

export class HTMLHarmonyFileInputElement extends HTMLElement {
	#shadowRoot: ShadowRoot;
	#htmlText: HTMLSpanElement;
	#htmlInput: HTMLInputElement;
	constructor() {
		super();
		this.#shadowRoot = this.attachShadow({ mode: 'closed' });
		shadowRootStyle(this.#shadowRoot, fileInputCSS);
		I18n.observeElement(this.#shadowRoot);

		createElement('label', {
			parent: this.#shadowRoot,
			childs: [
				this.#htmlText = createElement('span', {
				}),
				createElement('span', {
					innerHTML: folderOpenSVG,
				}),
				this.#htmlInput = createElement('input', {
					type: 'file',
					hidden: true,
					events: {
						change: (event: Event) => this.dispatchEvent(cloneEvent(event)),
					}
				}) as HTMLInputElement,
			],
		});
	}

	get files() {
		return this.#htmlInput.files
	}

	set accept(accept: string) {
		this.#htmlInput.accept = accept;
	}

	get accept(): string {
		return this.#htmlInput.accept;
	}

	adoptStyleSheet(styleSheet: CSSStyleSheet) {
		this.#shadowRoot.adoptedStyleSheets.push(styleSheet);
	}

	attributeChangedCallback(name: string, oldValue: string, newValue: string) {
		switch (name) {
			case 'data-label':
				this.#htmlText.innerHTML = newValue;
				this.#htmlText.classList.remove('i18n');
				break;
			case 'data-i18n':
				this.#htmlText.setAttribute('data-i18n', newValue);
				this.#htmlText.innerHTML = newValue;
				this.#htmlText.classList.add('i18n');
				break;
			case 'data-accept':
				this.accept = newValue;
				break;
		}
	}

	static get observedAttributes() {
		return ['data-label', 'data-i18n', 'data-accept'];
	}
}
