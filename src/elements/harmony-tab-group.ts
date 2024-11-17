import { shadowRootStyle } from '../harmony-css';
import { createElement } from '../harmony-html';
import { I18n } from '../harmony-i18n';
import tabGroupCSS from '../css/harmony-tab-group.css';
import tabCSS from '../css/harmony-tab.css';
import { HTMLHarmonyTabElement } from './harmony-tab';

export class HTMLHarmonyTabGroupElement extends HTMLElement {
	#doOnce = true;
	#tabs = new Set<HTMLHarmonyTabElement>();
	#header;
	#content;
	#activeTab?: HTMLHarmonyTabElement;
	#shadowRoot: ShadowRoot;
	constructor() {
		super();
		this.#shadowRoot = this.attachShadow({ mode: 'closed' });
		this.#header = createElement('div', {
			class: 'harmony-tab-group-header',
		});
		this.#content = createElement('div', {
			class: 'harmony-tab-group-content',
		});
	}

	connectedCallback() {
		if (this.#doOnce) {
			I18n.observeElement(this.#shadowRoot);
			shadowRootStyle(this.#shadowRoot, tabGroupCSS);
			shadowRootStyle(this.#shadowRoot, tabCSS);
			this.#shadowRoot.append(this.#header, this.#content);
			this.#doOnce = false;
		}
	}

	adoptStyleSheet(styleSheet: CSSStyleSheet) {
		this.#shadowRoot.adoptedStyleSheets.push(styleSheet);
	}

	addTab(tab: HTMLHarmonyTabElement) {
		this.#tabs.add(tab);
		if (!this.#activeTab) {
			this.#activeTab = tab;
		}
		this.#refresh();
	}

	#refresh() {
		for (let tab of this.#tabs) {
			this.#header.append(tab.htmlHeader);
			this.#content.append(tab);
			if (tab != this.#activeTab) {
				tab.active = false;
			}
		}

		if (this.#activeTab) {
			this.#activeTab.active = true;
		}
	}

	set active(tab: HTMLHarmonyTabElement) {
		if (this.#activeTab != tab) {
			this.#activeTab = tab;
			this.#refresh();
		}
	}

	clear() {
		this.#tabs.clear();
		this.#activeTab = undefined;
		this.#header.innerHTML = '';
		this.#content.innerHTML = '';
	}
}

let definedTabGroup = false;
export function defineHarmonyTabGroup() {
	if (window.customElements && !definedTabGroup) {
		customElements.define('harmony-tab-group', HTMLHarmonyTabGroupElement);
		definedTabGroup = true;
	}
}
