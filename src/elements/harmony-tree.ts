import treeCSS from '../css/harmony-tree.css';
import { shadowRootStyle } from '../harmony-css';
import { createElement, display, hide, show } from '../harmony-html';
import { I18n } from '../harmony-i18n';
import { injectGlobalCss } from '../utils/globalcss';
import { HTMLHarmonyElement } from './harmony-element';
import { defineHarmonyMenu, HarmonyMenuItems, HTMLHarmonyMenuElement } from './harmony-menu';

export type ItemClickEventData = { item: TreeItem };
export type ItemActionEventData = { item: TreeItem, action: string };

export type TreeAction = {
	name: string;
	element?: HTMLElement;
	innerHTML?: string;
	tooltip?: string;
}

export type TreeItemFilter = {
	name?: string;
	type?: string;
	types?: Array<string>;
}

export class TreeItem {
	name: string;
	isRoot?: boolean;
	icon?: string;
	type: string;
	parent?: TreeItem;
	childs = new Set<TreeItem>;
	actions = new Set<string>();
	userData?: any;

	constructor(name: string, options: { isRoot?: boolean, icon?: string, type?: string, parent?: TreeItem, childs?: Array<TreeItem>, userData?: any } = {}) {
		this.name = name;
		this.isRoot = options.isRoot;
		this.icon = options.icon;
		this.type = options.type ?? '';
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

	addChild(child: TreeItem) {
		this.childs.add(child);
	}

	#sortByName() {
		let that = this;
		this.childs[Symbol.iterator] = function* (): ArrayIterator<TreeItem> {
			yield* [...this.values()].sort(
				(a, b) => {
					return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
				}
			);
		}
	}

	getPath(separator: string = '/'): string {
		let path = '';
		if (this.parent) {
			const parentPath = this.parent.getPath(separator);
			if (parentPath) {
				path = parentPath + separator;
			}
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

	addAction(action: string) {
		this.actions.add(action);
	}

	addActions(actions: Array<string>) {
		for (const action of actions) {
			this.actions.add(action);
		}
	}

	removeAction(action: string) {
		this.actions.delete(action);
	}

	static createFromPathList(paths: Set<string> | Map<string, any>, options: { pathSeparator?: string, userData?: any, rootName?: string } = {}): TreeItem {
		class element {
			tree: TreeItem;
			childs = new Map<string, element>()

			constructor(tree: TreeItem) {
				this.tree = tree;
			}
		}

		const root = new TreeItem(options.rootName ?? '', { userData: options.userData, type: 'root' });

		const top = new element(root);

		for (const [path, perElementUserData] of paths.entries()) {
			const segments = path.split(options.pathSeparator ?? '/');

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

				if (!current.childs.has(s)) {
					current.childs.set(s, new element(new TreeItem(s, { parent: parent, type: type, userData: perElementUserData != path ? perElementUserData : options.userData })));
				}

				parent = current.childs.get(s)!.tree;
				current = current.childs.get(s)!;
			}
		}

		return root;
	}

	#matchFilter(filter?: TreeItemFilter): boolean {
		if (!filter) {
			return true;
		}

		if (filter.name) {
			if (!this.name.toLowerCase().includes(filter.name.toLowerCase())) {
				return false;
			}

			if (this.type != 'file') {
				return false;
			}
		}

		if (filter.types) {
			let match = false;
			for (const tf of filter.types) {
				if (tf === this.type) {
					match = true;
					break;
				}
			}

			if (!match) {
				return false;
			}
		}

		if (filter.type !== undefined) {
			if (filter.type !== this.type) {
				return false;
			}
		}

		return true;
	}

	*walk(filter?: TreeItemFilter) {
		let stack: Array<TreeItem> = [this];
		let current: TreeItem | undefined;

		do {
			current = stack.pop();
			if (!current) {
				break;
			}

			if (current.#matchFilter(filter)) {
				yield current;
			}

			for (let child of current.childs) {
				stack.push(child);
			}
		} while (current)
	}
}

export type TreeContextMenuEventData = {
	item?: TreeItem,
	buildContextMenu: (menu: HarmonyMenuItems) => void,
};

type TreeItemElement = {
	element: HTMLElement;
	header: HTMLElement;
	actions: HTMLElement;
	childs: HTMLElement;
}

export class HTMLHarmonyTreeElement extends HTMLHarmonyElement {
	#shadowRoot?: ShadowRoot;
	#root?: TreeItem | null;
	#htmlContextMenu?: HTMLHarmonyMenuElement;
	#isInitialized = new Set<TreeItem>();
	#isExpanded = new Map<TreeItem, boolean>();
	#filter?: TreeItemFilter;
	#isVisible = new Set<TreeItem>();
	#actions = new Map<string, TreeAction>();
	/*
	#itemActions = new Map<TreeItem, HTMLElement>();
	#items = new Map<TreeItem, HTMLElement>();
	*/
	#itemElements = new Map<TreeItem, TreeItemElement>();
	#selectedItem: TreeItem | null = null;

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
		this.#refreshFilter();
	}

	#refreshFilter() {
		for (const [item, itemElement] of this.#itemElements) {
			display(itemElement.element, !this.#filter || this.#isVisible.has(item));
		}
	}

	setRoot(root?: TreeItem | null) {
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

	#contextMenuHandler(event: MouseEvent, item: TreeItem) {
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

	#createItem(item: TreeItem, parent: HTMLElement | ShadowRoot, createExpanded: boolean): HTMLElement {
		let element: HTMLElement;

		const itemElement = this.#itemElements.get(item);

		if (itemElement) {
			element = itemElement.element;
			parent.append(element);
		} else {
			let childs: HTMLElement;
			let header: HTMLElement;
			let actions: HTMLElement;
			element = createElement('div', {
				class: `item level${item.getLevel()}`,
				parent: parent,
				childs: [
					header = createElement('div', {
						class: 'header',
						childs: [
							createElement('div', {
								class: 'title',
								innerText: item.name,
							}),
							actions = createElement('div', {
								class: 'actions',
							}),
						],
						$click: () => {
							if (this.#isExpanded.get(item)) {
								this.collapseItem(item);
							} else {
								this.expandItem(item);
								this.#refreshFilter();
							}

							this.dispatchEvent(new CustomEvent<ItemClickEventData>('itemclick', { detail: { item: item } }));
						},
						$contextmenu: (event: MouseEvent) => this.#contextMenuHandler(event, item),
					}),
					childs = createElement('div', {
						class: 'childs',
					}),
				]
			});
			this.#itemElements.set(item, { element: element, header: header, childs: childs, actions: actions });
		}

		if (item.isRoot && item.name == '') {
			element.classList.add('root');
		}

		if (item.type) {
			element.classList.add(`type-${item.type}`);
		}

		if (createExpanded || this.#isExpanded.get(item)) {
			this.expandItem(item);
		}

		this.refreshActions(item);

		return element;
	}

	expandItem(item: TreeItem): void {
		if (item.parent) {
			this.expandItem(item.parent);
		}

		const childs = this.#itemElements.get(item)?.childs;

		if (!childs || this.#isExpanded.get(item) === true) {
			return;
		}

		this.#isExpanded.set(item, true);
		show(childs);

		if (!this.#isInitialized.has(item)) {
			for (const child of item.childs) {
				this.#createItem(child, childs, false);
			}
			this.#isInitialized.add(item);
		}
	}

	collapseItem(item: TreeItem): void {
		const childs = this.#itemElements.get(item)?.childs;

		if (!childs) {
			return;
		}

		this.#isExpanded.set(item, false);
		hide(childs);
	}

	selectItem(item: TreeItem | null, scrollIntoView = true) {
		if (item == this.#selectedItem) {
			return;
		}

		if (this.#selectedItem) {
			this.#itemElements.get(this.#selectedItem)?.header?.classList.remove('selected');
		}

		if (item) {
			if (item.parent) {
				this.expandItem(item.parent);
			}
			const itemElement = this.#itemElements.get(item)?.header;
			itemElement?.classList.add('selected');
			if (scrollIntoView) {
				setTimeout(() => {
					itemElement?.scrollIntoView();
				}, 0);
			}
		}
		this.#selectedItem = item;
	}

	addAction(name: string, img: HTMLElement | string, tooltip?: string) {
		const action: TreeAction = {
			name: name,
			tooltip: tooltip,
		}

		if (typeof img == 'string') {
			action.innerHTML = img;
		} else {
			action.element = img;
		}


		this.#actions.set(name, action);
	}

	refreshActions(item: TreeItem) {
		const htmlActions = this.#itemElements.get(item)?.actions;

		htmlActions?.replaceChildren();
		for (const actionName of item.actions) {
			const action = this.#actions.get(actionName);
			if (action) {
				createElement('div', {
					child: action.element,
					innerHTML: action.innerHTML,
					parent: htmlActions,
					i18n: {
						title: action.tooltip,
					},
					$click: (event: MouseEvent) => this.#actionHandler(event, item, actionName),
				});
			}
		}
	}

	#actionHandler(event: MouseEvent, item: TreeItem, action: string) {
		this.dispatchEvent(new CustomEvent<ItemActionEventData>('itemaction', {
			detail: {
				item: item,
				action: action,
			},
		}));
		event.preventDefault();
		event.stopPropagation();
	}

	setFilter(filter?: TreeItemFilter) {
		this.#filter = filter;

		this.#isVisible.clear();
		if (this.#filter && this.#root) {
			for (const item of this.#root.walk(this.#filter)) {
				let current: TreeItem | undefined = item;

				do {
					if (current) {
						this.#isVisible.add(current);
					}
					current = current.parent;
				} while (current)
			}
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
