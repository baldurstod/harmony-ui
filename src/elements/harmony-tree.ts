import { shadowRootStyle } from '../harmony-css';
import { createElement, hide, show } from '../harmony-html';
import { I18n } from '../harmony-i18n';
import treeCSS from '../css/harmony-tree.css';
import { injectGlobalCss } from '../utils/globalcss';
import { HTMLHarmonyElement } from './harmony-element';
import { defineHarmonyMenu, HarmonyMenuItems, HTMLHarmonyMenuElement } from './harmony-menu';
import { toBool } from '../utils/attributes';

export class TreeElement {
	name: string;
	isRoot?: boolean;
	icon?: string;
	type?: string;
	parent?: TreeElement;
	childs = new Set<TreeElement>;
	userData?: any;

	constructor(name: string, options: { isRoot?: boolean, icon?: string, type?: string, parent?: TreeElement, childs?: Array<TreeElement>, userData?: any } = {}) {
		this.name = name;
		this.isRoot = options.isRoot;
		this.icon = options.icon;
		this.type = options.type;
		this.parent = options.parent;
		this.userData = options.userData;

		if (options.parent) {
			options.parent.addChild(this);
		}

		if (options.childs) {
			for (const child of options.childs) {
				this.addChild(child);
			}
		}

		this.#sortByName();
	}

	addChild(child: TreeElement) {
		this.childs.add(child);
	}

	#sortByName() {
		let that = this;
		this.childs[Symbol.iterator] = function* (): ArrayIterator<TreeElement> {
			yield* [...this.values()].sort(
				(a, b) => {
					return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
				}
			);
		}
	}

	getPath(separator: string = ''): string {
		let path = '';
		if (this.parent) {
			path = this.parent.getPath(separator) + separator;
		}

		path += this.name;

		return path;
	}

	getLevel(): number {
		if (this.parent) {
			return 1 + this.parent.getLevel();
		}

		return 0;
	}

	static createFromPathList(paths?: Array<string>, pathSeparator = '/'): TreeElement | null {
		if (!paths) {
			return null;
		}
		const root = new TreeElement('');

		const top: { [key: string]: any } = {};
		for (const path of paths) {
			const segments = path.split(pathSeparator);

			let current = top;
			let parent = root;
			for (let i = 0, l = segments.length; i < l; i++) {
				const s = segments[i];
				if (s == '') {
					continue;
				}

				let type = 'directory';
				if (i == l - 1) {
					type = 'file';
				}

				if (current[s] == undefined) {
					current[s] = new TreeElement(s, { parent: parent, type: type });
				}

				parent = current[s];
				current = current[s];
			}
		}

		return root;
	}
}

export type TreeContextMenuEventData = {
	item?: TreeElement,
	buildContextMenu: (menu: HarmonyMenuItems) => void,
};

export class HTMLHarmonyTreeElement extends HTMLHarmonyElement {
	#shadowRoot?: ShadowRoot;
	#root?: TreeElement | null;
	#htmlContextMenu?: HTMLHarmonyMenuElement;
	#isInitialized = new Set<TreeElement>();
	#isExpanded = new Map<TreeElement, boolean>();

	protected createElement() {
		this.#shadowRoot = this.attachShadow({ mode: 'closed' });
		shadowRootStyle(this.#shadowRoot, treeCSS);
		I18n.observeElement(this.#shadowRoot);

		this.#refresh();
	}

	adoptStyle(css: string) {
		this.initElement();
		shadowRootStyle(this.#shadowRoot!, css);
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

	setRoot(root?: TreeElement | null) {
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
		const element = createElement('div', {
			class: `item level${item.getLevel()}`,
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

		if (item.type) {
			element.classList.add(`type-${item.type}`);
		}

		if (createExpanded) {
			this.#expandItem(item, childs);
		}

		return element;
	}

	#expandItem(item: TreeElement, parent: HTMLElement): void {
		if (this.#isExpanded.get(item)) {
			hide(parent);
			this.#isExpanded.set(item, false);
			return;
		} else {
			show(parent);
		}

		this.#isExpanded.set(item, true);

		if (!item.childs) {
			return;
		}

		if (!this.#isInitialized.has(item)) {
			for (const child of item.childs) {
				this.#createItem(child, parent, false);
			}
			this.#isInitialized.add(item);
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
