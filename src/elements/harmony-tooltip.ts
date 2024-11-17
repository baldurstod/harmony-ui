import { documentStyle, shadowRootStyle } from '../harmony-css';
import { createElement, hide, show } from '../harmony-html';
import tooltipCSS from '../css/harmony-tooltip.css';
import { I18n } from '../harmony-i18n';
import { injectGlobalCss } from '../utils/globalcss';

export class HTMLHarmonyTooltipElement extends HTMLElement {
	#shadowRoot: ShadowRoot;
	#htmlText: HTMLSpanElement;
	constructor() {
		super();
		this.#shadowRoot = this.attachShadow({ mode: 'closed' });
		shadowRootStyle(this.#shadowRoot, tooltipCSS);
		I18n.observeElement(this.#shadowRoot);

		this.#htmlText = createElement('div', {
			class: 'tooltip',
			parent: this.#shadowRoot,
		});
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
			case 'data-position':
				this.#htmlText.setAttribute('data-position', newValue);
				break;
		}
	}

	static get observedAttributes() {
		return ['data-label', 'data-i18n', 'data-position'];
	}
}

let definedTooltip = false;
export function defineHarmonyTooltip() {
	if (window.customElements && !definedTooltip) {
		customElements.define('harmony-tooltip', HTMLHarmonyTooltipElement);
		definedTooltip = true;
		injectGlobalCss();
	}
}
