import {createElement} from '../harmony-html.js';

export class HarmonyTabGroup extends HTMLElement {
	#tabs = new Set();
	#header;
	#content;
	#activeTab;
	constructor() {
		super();
		this.#header = createElement('div', {class: 'harmony-tab-group-header'});
		this.#content = createElement('div', {class: 'harmony-tab-group-content'});
	}

	connectedCallback() {
		this.append(this.#header, this.#content);
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
