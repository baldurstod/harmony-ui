import { shadowRootStyle } from '../harmony-css';
import { createElement, hide, show } from '../harmony-html';
import { I18n } from '../harmony-i18n';
import treeCSS from '../css/harmony-tree.css';
import { injectGlobalCss } from '../utils/globalcss';
import { HTMLHarmonyElement } from './harmony-element';

export type TreeElement = {
	isRoot?: boolean,
	name: string,
	icon?: string,
	type?: string,
	childs?: Array<TreeElement>,
}

function createItem(item: TreeElement, parent: HTMLElement | ShadowRoot, createExpanded: boolean): HTMLElement {
	let childs: HTMLElement;
	let expanded = false;
	const element = createElement('div', {
		class: 'item',
		parent: parent,
		childs: [
			createElement('div', {
				class: 'header',
				innerText: item.name,
				$click: () => expandItem(item, childs),
			}),
			childs = createElement('div', {
				class: 'childs',
			}),
		]
	});

	if (item.isRoot && item.name == '') {
		element.classList.add('root');
	}

	if (createExpanded) {
		expandItem(item, childs);
		expanded = true;
	}

	return element;
}

const isInitialized = new Set<TreeElement>();
const isExpanded = new Map<TreeElement, boolean>();

function expandItem(item: TreeElement, parent: HTMLElement): void {
	if (isExpanded.get(item)) {
		hide(parent);
		isExpanded.set(item, false);
		return;
	} else {
		show(parent);
	}

	isExpanded.set(item, true);

	if (!item.childs) {
		return;
	}

	if (!isInitialized.has(item)) {
		for (const child of item.childs) {
			createItem(child, parent, false);
		}
		isInitialized.add(item);
	}
}

export class HTMLHarmonyTreeElement extends HTMLHarmonyElement {
	#shadowRoot?: ShadowRoot;
	#root?: TreeElement;

	protected createElement() {
		this.#shadowRoot = this.attachShadow({ mode: 'closed' });
		shadowRootStyle(this.#shadowRoot, treeCSS);
		I18n.observeElement(this.#shadowRoot);

		this.#refresh();
	}

	#refresh() {
		if (!this.#shadowRoot) {
			return;
		}
		this.#shadowRoot.replaceChildren();
		if (!this.#root) {
			return;
		}

		createItem(this.#root, this.#shadowRoot, true);
	}

	setRoot(root?: TreeElement) {
		this.#root = root;
		if (this.#root) {
			this.#root.isRoot = true;
		}

		this.#refresh();
	}

	protected onAttributeChanged(name: string, oldValue: string, newValue: string) {
		switch (name) {
			case 'data-root':
				const root = JSON.parse(newValue);
				this.setRoot(root);
				break;
		}
	}

	static get observedAttributes() {
		return ['data-root'];
	}
}

let definedTree = false;
export function defineHarmonyTree() {
	if (window.customElements && !definedTree) {
		customElements.define('harmony-tree', class extends HTMLHarmonyTreeElement { });
		customElements.define('h-tree', class extends HTMLHarmonyTreeElement { });
		definedTree = true;
		injectGlobalCss();
	}
}
