import tabGroupCSS from '../css/components/tab-group.css';
import { shadowRootStyle } from '../harmony-css';
import { createElement, updateShadowRoot } from '../harmony-html';
import { HarmonyComponent } from './component';
import { HarmonyTab } from './tab';

export type HarmonyTabGroupParams = {
	/** Add a custom style sheet to the panel. */
	adoptStyleSheet?: CSSStyleSheet,
	/** Add custom style sheets to the panel. */
	adoptStyleSheets?: CSSStyleSheet[],
	/** Add a custom style sheet to the panel. */
	adoptStyle?: string;
	/** Add custom style sheets to the panel. */
	adoptStyles?: string[];
}

export class HarmonyTabGroup implements HarmonyComponent {
	readonly htmlElement = createElement('div');
	#shadowRoot?: ShadowRoot;
	#htmlTabs?: HTMLElement;
	#tabs = new Set<HarmonyTab>();
	#activeTab?: HarmonyTab;

	constructor(params: HarmonyTabGroupParams = {}) {
		this.setParams(params);
	}

	setParams(params: HarmonyTabGroupParams): void {

		if (params.adoptStyle || params.adoptStyles || params.adoptStyleSheet || params.adoptStyleSheets) {
			this.#initHTML();
			updateShadowRoot(this.#shadowRoot!, {
				adoptStyle: params.adoptStyle,
				adoptStyles: params.adoptStyles,
				adoptStyleSheet: params.adoptStyleSheet,
				adoptStyleSheets: params.adoptStyleSheets,
			});
		}
	}

	#initHTML(): void {
		if (this.#shadowRoot) {
			return;
		}

		this.#shadowRoot = this.htmlElement.attachShadow({ mode: 'closed' });
		void shadowRootStyle(this.#shadowRoot, tabGroupCSS);
		this.#htmlTabs = createElement('div', {
			parent: this.#shadowRoot,
		});
	}

	/*
	addTabs(...tabs: HarmonyTab[]): void {
		for (const tab of tabs) {
			this.#tabs.add(tab);
			this.htmlElement.append(tab.htmlElement);
		}
	}
	*/

	append(...tabs: HarmonyTab[]): void {
		this.#initHTML();
		for (const tab of tabs) {
			this.#tabs.add(tab);
			this.#htmlTabs!.append(tab.htmlElement);
			tab.setActive(!this.#activeTab || this.#activeTab === tab);
			tab.setGroup(this);
		}
	}

	prepend(...tabs: HarmonyTab[]): void {
		this.#initHTML();
		for (const tab of tabs) {
			this.#tabs.add(tab);
			this.#htmlTabs!.prepend(tab.htmlElement);
		}
	}

	addTab(tab: HarmonyTab): void {
		this.#tabs.add(tab);
		if (!this.#activeTab) {
			this.#activeTab = tab;
		}
		this.#refresh();
	}

	getTabs(): Set<HarmonyTab> {
		return new Set<HarmonyTab>(this.#tabs);
	}

	#refresh(): void {
		this.#initHTML();
		//this.#header.replaceChildren();
		this.#htmlTabs!.replaceChildren();
		for (const tab of this.#tabs) {
			this.#htmlTabs!.append(tab.htmlElement);
			//this.#content.append(tab);
			if (tab != this.#activeTab) {
				tab.setActive(false);
			}
		}

		this.#activeTab?.setActive(true);
		setTimeout(() => {
			this.#activeTab?.htmlElement.scrollIntoView();
		}, 0);
	}

	activateTab(tab: HarmonyTab): void {
		if (this.#activeTab != tab) {
			this.#activeTab = tab;
			this.#refresh();
		}
	}

	closeTab(tab: HarmonyTab): void {
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

	clear(): void {
		this.#tabs.clear();
		this.#activeTab = undefined;
		this.#htmlTabs?.replaceChildren();
	}
}
