import infoBoxCSS from '../css/harmony-info-box.css';
import { shadowRootStyle } from '../harmony-css';
import { createElement, updateElement } from '../harmony-html';
import { injectGlobalCss } from '../utils/globalcss';

export enum HTMLHarmonyInfoBoxElementType {
	Ok = 'ok',
	Warning = 'warning',
	Error = 'error',
}

export class HTMLHarmonyInfoBoxElement extends HTMLElement {
	#doOnce = false;
	#shadowRoot: ShadowRoot;
	//#htmlHeader: HTMLElement;
	#htmlContent: HTMLElement;
	#type = HTMLHarmonyInfoBoxElementType.Ok;

	constructor() {
		super();
		this.#shadowRoot = this.attachShadow({ mode: 'closed' });
		void shadowRootStyle(this.#shadowRoot, infoBoxCSS);
		this.#setClass();
		//this.#htmlHeader = createElement('div', { parent: this.#shadowRoot, hidden: true });
		this.#htmlContent = createElement('div');
	}

	#setClass() {
		this.#shadowRoot.host.classList.remove('ok', 'warning', 'error');
		this.#shadowRoot.host.classList.add(this.#type);
	}

	connectedCallback(): void {
		if (!this.#doOnce) {
			this.#doOnce = true;
			this.#processChilds();
			this.#shadowRoot.append(this.#htmlContent);
		}
	}

	#processChilds(): void {
		for (const child of this.childNodes) {
			this.#htmlContent.append(child);
		}
	}

	attributeChangedCallback(name: string, oldValue: string, newValue: string): void {
		switch (name) {
			case 'i18n':
				updateElement(this.#htmlContent, {
					i18n: newValue,
				});
				break;
			case 'type':
				switch (newValue) {
					case HTMLHarmonyInfoBoxElementType.Ok:
					case HTMLHarmonyInfoBoxElementType.Warning:
					case HTMLHarmonyInfoBoxElementType.Error:
						this.#type = newValue;
						this.#setClass();
						break;
				}
				break;
		}
	}

	static get observedAttributes(): string[] {
		return ['i18n', 'type'];
	}
}

let definedInfoBox = false;
export function defineHarmonyInfoBox(): void {
	if (window.customElements && !definedInfoBox) {
		customElements.define('harmony-info-box', HTMLHarmonyInfoBoxElement);
		definedInfoBox = true;
		injectGlobalCss();
	}
}
