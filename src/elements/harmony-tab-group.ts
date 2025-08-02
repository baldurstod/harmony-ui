import tabGroupCSS from '../css/harmony-tab-group.css';
import tabCSS from '../css/harmony-tab.css';
import { shadowRootStyle } from '../harmony-css';
import { createElement } from '../harmony-html';
import { I18n } from '../harmony-i18n';
import { injectGlobalCss } from '../utils/globalcss';
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

	getTabs(): Set<HTMLHarmonyTabElement> {
		return new Set<HTMLHarmonyTabElement>(this.#tabs);
	}

	#refresh() {
		this.#header.replaceChildren();
		this.#content.replaceChildren();
		for (const tab of this.#tabs) {
			this.#header.append(tab.htmlHeader);
			this.#content.append(tab);
			if (tab != this.#activeTab) {
				tab.setActive(false);
			}
		}

		this.#activeTab?.setActive(true);
	}

	/**
	 * @deprecated use activateTab() instead
	 */
	set active(tab: HTMLHarmonyTabElement) {
		console.warn('deprecated, use activateTab instead');
		this.activateTab(tab);
	}

	activateTab(tab: HTMLHarmonyTabElement) {
		if (this.#activeTab != tab) {
			this.#activeTab = tab;
			this.#refresh();
		}
	}

	closeTab(tab: HTMLHarmonyTabElement) {
		this.#tabs.delete(tab);
		if (this.#activeTab == tab) {
			this.#activeTab = this.#tabs.values().next().value;
		}
		this.#refresh();
	}

	closeAllTabs(): void {
		for (const tab of this.#tabs) {
			tab.close();
		}
	}

	clear() {
		this.#tabs.clear();
		this.#activeTab = undefined;
		this.#header.innerText = '';
		this.#content.innerText = '';
	}
}

let definedTabGroup = false;
export function defineHarmonyTabGroup() {
	if (window.customElements && !definedTabGroup) {
		customElements.define('harmony-tab-group', HTMLHarmonyTabGroupElement);
		definedTabGroup = true;
		injectGlobalCss();
	}
}
