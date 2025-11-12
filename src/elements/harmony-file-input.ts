import { shadowRootStyle } from '../harmony-css';
import { createElement, hide, show } from '../harmony-html';
import fileInputCSS from '../css/harmony-file-input.css';
import { folderOpenSVG, infoSVG } from 'harmony-svg';
import { cloneEvent } from '../utils/events';
import { I18n } from '../harmony-i18n';
import { defineHarmonyTooltip } from './harmony-tooltip';
import { injectGlobalCss } from '../utils/globalcss';

export class HTMLHarmonyFileInputElement extends HTMLElement {
	#shadowRoot: ShadowRoot;
	#htmlText: HTMLSpanElement;
	#htmlInput: HTMLInputElement;
	#htmlHelp: HTMLSpanElement;
	#htmlTooltip: HTMLSpanElement;
	constructor() {
		super();
		this.#shadowRoot = this.attachShadow({ mode: 'closed' });
		shadowRootStyle(this.#shadowRoot, fileInputCSS);
		I18n.observeElement(this.#shadowRoot);

		defineHarmonyTooltip();
		createElement('label', {
			parent: this.#shadowRoot,
			childs: [
				createElement('span', {
					class: 'icon',
					innerHTML: folderOpenSVG,
				}),
				this.#htmlText = createElement('span', {
					class: 'text',
				}),
				this.#htmlHelp = createElement('span', {
					class: 'tooltip',
					hidden: true,
					childs: [
						createElement('span', {
							class: 'info',
							innerHTML: infoSVG,
						}),
						this.#htmlTooltip = createElement('harmony-tooltip', {
							i18n: '',
							'data-position': 'bottom',
						}),
					]
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

	setMultiple(multiple: boolean): void {
		this.#htmlInput.multiple = multiple;
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
			case 'data-tooltip-i18n':
				if (newValue == '') {
					hide(this.#htmlHelp);
				} else {
					show(this.#htmlHelp);
					this.#htmlTooltip.setAttribute('data-i18n', newValue);
				}
				break;
			case 'data-accept':
				this.accept = newValue;
				break;
			case 'multiple':
				this.setMultiple(newValue != '');
				break;
		}
	}

	static get observedAttributes() {
		return ['data-label', 'data-i18n', 'data-accept', 'data-tooltip-i18n', 'multiple'];
	}
}

let definedFileInput = false;
export function defineHarmonyFileInput() {
	if (window.customElements && !definedFileInput) {
		customElements.define('harmony-file-input', HTMLHarmonyFileInputElement);
		definedFileInput = true;
		injectGlobalCss();
	}
}
