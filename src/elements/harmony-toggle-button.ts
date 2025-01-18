import { shadowRootStyle } from '../harmony-css';
import { createElement, hide, show, updateElement } from '../harmony-html';
import { I18n } from '../harmony-i18n';
import toggleButtonCSS from '../css/harmony-toggle-button.css';
import { toBool } from '../utils/attributes';
import { injectGlobalCss } from '../utils/globalcss';

export class HTMLHarmonyToggleButtonElement extends HTMLElement {
	#buttonOn?: HTMLElement;
	#buttonOff?: HTMLElement;
	#state = false;
	#shadowRoot: ShadowRoot;
	#i18nOn?: string;
	#i18nOff?: string;

	constructor() {
		super();
		this.#shadowRoot = this.attachShadow({ mode: 'closed' });
		I18n.observeElement(this.#shadowRoot);
		shadowRootStyle(this.#shadowRoot, toggleButtonCSS);

		this.addEventListener('click', () => this.#click());
		this.#initObserver();
	}

	connectedCallback() {
		if (this.#buttonOn) {
			this.#shadowRoot.append(this.#buttonOn);
		}
		if (this.#buttonOff) {
			this.#shadowRoot.append(this.#buttonOff);
		}
		this.#processChilds();
	}

	#processChilds() {
		const childs = new Set(this.children)
		for (const child of childs) {
			this.#processChild(child as HTMLElement);
		}
		this.#refresh();
	}

	#processChild(htmlChildElement: HTMLElement) {
		switch (htmlChildElement.tagName) {
			case 'ON':
				this.#buttonOn = htmlChildElement;
				this.#shadowRoot.append(this.#buttonOn);
				if (this.#i18nOn) {
					updateElement(this.#buttonOn, { i18n: { title: this.#i18nOn, }, });
				}
				break;
			case 'OFF':
				this.#buttonOff = htmlChildElement;
				this.#shadowRoot.append(this.#buttonOff);
				if (this.#i18nOff) {
					updateElement(this.#buttonOff, { i18n: { title: this.#i18nOff, }, });
				}
				break;
		}
		this.#refresh();
	}

	attributeChangedCallback(name: string, oldValue: string, newValue: string) {
		if (name == 'data-i18n-on') {
			this.#i18nOn = newValue;
			this.#buttonOn && updateElement(this.#buttonOn, { i18n: { title: newValue, }, });
		}
		if (name == 'data-i18n-off') {
			this.#i18nOff = newValue;
			this.#buttonOff && updateElement(this.#buttonOff, { i18n: { title: newValue, }, });
		}
		if (name == 'state') {
			this.state = toBool(newValue);
		}
		if (name == 'src-on') {
			this.#buttonOn = this.#buttonOn ?? createElement('span', {
				class: 'toggle-button-on',
				hidden: true,
			}) as HTMLElement;
			this.#buttonOn.style.backgroundImage = `url(${newValue})`;
		}
		if (name == 'src-off') {
			this.#buttonOff = this.#buttonOff ?? createElement('span', {
				class: 'toggle-button-off',
			}) as HTMLElement;
			this.#buttonOff.style.backgroundImage = `url(${newValue})`;
		}
	}

	get state() {
		return this.#state;
	}

	set state(state) {
		state = state ? true : false;
		if (this.#state != state) {
			this.#state = state;
			this.dispatchEvent(new CustomEvent('change', { detail: { oldState: this.#state, newState: state } }));
			this.#refresh();
		}
	}

	#refresh() {
		if (this.#state) {
			show(this.#buttonOn);
			hide(this.#buttonOff);
		} else {
			hide(this.#buttonOn);
			show(this.#buttonOff);
		}
	}

	#click() {
		this.state = !this.#state;
	}

	#initObserver() {
		const config = { childList: true, subtree: true };
		const mutationCallback = (mutationsList: Array<MutationRecord>, observer: MutationObserver) => {
			for (const mutation of mutationsList) {
				for (const addedNode of mutation.addedNodes) {
					if (addedNode.parentNode == this) {
						this.#processChild(addedNode as HTMLElement);
					}
				}
			}
		};

		const observer = new MutationObserver(mutationCallback);
		observer.observe(this, config);
	}

	adoptStyleSheet(styleSheet: CSSStyleSheet) {
		this.#shadowRoot.adoptedStyleSheets.push(styleSheet);
	}

	static get observedAttributes() {
		return ['data-i18n-on', 'data-i18n-off', 'state', 'src-on', 'src-off'];
	}
}

let definedToggleButton = false;
export function defineToggleButton() {
	if (window.customElements && !definedToggleButton) {
		customElements.define('harmony-toggle-button', HTMLHarmonyToggleButtonElement);
		definedToggleButton = true;
		injectGlobalCss();
	}
}
