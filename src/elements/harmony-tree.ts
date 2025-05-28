import { shadowRootStyle } from '../harmony-css';
import { createElement, hide, show } from '../harmony-html';
import { I18n } from '../harmony-i18n';
import treeCSS from '../css/harmony-tree.css';
import { injectGlobalCss } from '../utils/globalcss';
import { HTMLHarmonyElement } from './harmony-element';
import { defineHarmonyMenu, HarmonyMenuItems, HTMLHarmonyMenuElement } from './harmony-menu';

export class TreeElement {
	name: string;
	isRoot?: boolean;
	icon?: string;
	type?: string;
	parent?: TreeElement;
	childs?: Array<TreeElement>;

	constructor(name: string, options: { isRoot?: boolean, icon?: string, type?: string, parent?: TreeElement, childs?: Array<TreeElement>, } = {}) {
		this.name = name;
		this.isRoot = options.isRoot;
		this.icon = options.icon;
		this.type = options.type;
		this.parent = options.parent;
		this.childs = options.childs;
	}

	getPath(separator: string = ''): string {
		let path = '';
		if (this.parent) {
			path = this.parent.getPath(separator) + separator;
		}

		path += this.name;

		return path;
	}
}

const isInitialized = new Set<TreeElement>();
const isExpanded = new Map<TreeElement, boolean>();

export type TreeContextMenuEventData = {
	item?: TreeElement,
	buildContextMenu: (menu: HarmonyMenuItems) => void,
};

export class HTMLHarmonyTreeElement extends HTMLHarmonyElement {
	#shadowRoot?: ShadowRoot;
	#root?: TreeElement;
	#htmlContextMenu?: HTMLHarmonyMenuElement;

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

		this.#createItem(this.#root, this.#shadowRoot, true);
	}

	setRoot(root?: TreeElement) {
		this.#root = root;
		if (this.#root) {
			this.#root.isRoot = true;
		}

		this.#refresh();
	}

	#buildContextMenu(contextMenu: HarmonyMenuItems, x: number, y: number) {
		if (!this.#htmlContextMenu) {
			defineHarmonyMenu();
			this.#htmlContextMenu = createElement('harmony-menu') as HTMLHarmonyMenuElement;
		}

		this.#htmlContextMenu.showContextual(contextMenu, x, y);
	}

	#contextMenuHandler(event: MouseEvent, item: TreeElement) {
		if (!event.shiftKey) {
			this.dispatchEvent(new CustomEvent<TreeContextMenuEventData>('contextmenu', {
				detail: {
					item: item,
					buildContextMenu: (menu: HarmonyMenuItems) => this.#buildContextMenu(menu, event.clientX, event.clientY),
				},
			}));
			event.preventDefault();
			event.stopPropagation();
		}
	}

	#createItem(item: TreeElement, parent: HTMLElement | ShadowRoot, createExpanded: boolean): HTMLElement {
		let childs: HTMLElement;
		let expanded = false;
		const element = createElement('div', {
			class: 'item',
			parent: parent,
			childs: [
				createElement('div', {
					class: 'header',
					innerText: item.name,
					$click: () => this.#expandItem(item, childs),
					$contextmenu: (event: MouseEvent) => this.#contextMenuHandler(event, item),
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
			this.#expandItem(item, childs);
			expanded = true;
		}

		return element;
	}

	#expandItem(item: TreeElement, parent: HTMLElement): void {
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
				this.#createItem(child, parent, false);
			}
			isInitialized.add(item);
		}
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
