import { shadowRootStyle } from '../harmony-css.js';
import { createElement } from '../harmony-html.js';
import { I18n } from '../harmony-i18n.js';

import tabGroupCSS from '../css/harmony-tab-group.css';
import tabCSS from '../css/harmony-tab.css';

export class HTMLHarmonyTabGroupElement extends HTMLElement {
	#doOnce = true;
	#tabs = new Set();
	#header;
	#content;
	#activeTab;
	#shadowRoot;
	constructor() {
		super();
		this.#header = createElement('div', {
			class: 'harmony-tab-group-header',
		});
		this.#content = createElement('div', {
			class: 'harmony-tab-group-content',
		});
	}

	connectedCallback() {
		if (this.#doOnce) {
			this.#shadowRoot = this.attachShadow({ mode: 'closed' });
			I18n.observeElement(this.#shadowRoot);
			shadowRootStyle(this.#shadowRoot, tabGroupCSS);
			shadowRootStyle(this.#shadowRoot, tabCSS);
			this.#shadowRoot.append(this.#header, this.#content);
			this.#doOnce = false;
		}
	}

	addTab(tab) {
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

		this.#activeTab.active = true;
	}

	set active(tab) {
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
