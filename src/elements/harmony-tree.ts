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
	kind?: TreeItemKind;
	kinds?: Array<TreeItemKind>;
}

export enum TreeItemKind {
	Root = 'root',
	Directory = 'directory',
	File = 'file',
	Item = 'item',
}

export type TreeItemOptions = {
	icon?: string,
	kind?: TreeItemKind,
	parent?: TreeItem,
	childs?: Array<TreeItem>,
	userData?: any,
}

export class TreeItem {
	name: string;
	icon?: string;
	kind: TreeItemKind;
	parent?: TreeItem;
	childs = new Set<TreeItem>;
	actions = new Set<string>();
	userData?: any;

	constructor(name: string, options: TreeItemOptions = {}) {
		this.name = name;
		this.icon = options.icon;
		this.kind = options.kind ?? TreeItemKind.File;
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

		return path + this.name;
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

	static createFromPathList(paths: Set<string> | Map<string, any>, options: { pathSeparator?: string, rootUserData?: any, userData?: any, rootName?: string } = {}): TreeItem {
		class element {
			tree: TreeItem;
			childs = new Map<string, element>()

			constructor(tree: TreeItem) {
				this.tree = tree;
			}
		}

		const root = new TreeItem(options.rootName ?? '', { userData: options.rootUserData ?? options.userData, kind: TreeItemKind.Root });

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

				let kind = TreeItemKind.Directory;
				if (i == l - 1) {
					kind = TreeItemKind.File;
				}

				if (!current.childs.has(s)) {
					current.childs.set(s, new element(new TreeItem(s, { parent: parent, kind: kind, userData: perElementUserData != path ? perElementUserData : options.userData })));
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

			if (this.kind != TreeItemKind.File) {
				return false;
			}
		}

		if (filter.kinds) {
			let match = false;
			for (const tf of filter.kinds) {
				if (tf === this.kind) {
					match = true;
					break;
				}
			}

			if (!match) {
				return false;
			}
		}

		if (filter.kind !== undefined) {
			if (filter.kind !== this.kind) {
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
	#itemElements = new Map<TreeItem, TreeItemElement>();
	#elementItem = new Map<HTMLElement, TreeItem>();
	#selectedItem: TreeItem | null = null;
	#rootLevel?: TreeItem;
	#sticky = new Set<HTMLElement>();
	#dynamicSheet = new CSSStyleSheet();
	#cssLevel = new Set<number>();

	protected createElement() {
		this.#shadowRoot = this.attachShadow({ mode: 'closed' });
		shadowRootStyle(this.#shadowRoot, treeCSS);
		this.#shadowRoot.adoptedStyleSheets.push(this.#dynamicSheet);
		I18n.observeElement(this.#shadowRoot);

		this.#refresh();

		this.addEventListener('scroll', () => this.#handleScroll());
	}

	adoptStyle(css: string) {
		this.initElement();
		shadowRootStyle(this.#shadowRoot!, css);
	}

	#refresh() {
		if (!this.#shadowRoot) {
			return;
		}
		if (!this.#root) {
			return;
		}

		this.#createItem(this.#root, null, true);
		this.#refreshFilter();
	}

	#refreshFilter() {
		for (const [item, itemElement] of this.#itemElements) {
			const show = (!this.#filter || this.#isVisible.has(item)) && this.#isFullyExpanded(item);
			display(itemElement.element, show);
		}
	}

	#isFullyExpanded(item: TreeItem): boolean {
		let current: TreeItem | undefined = item.parent;

		if (!current) {
			return true;
		}

		do {
			if (!this.#isExpanded.get(current)) {
				return false;
			}
			current = current.parent;
		} while (current)

		return true;
	}

	setRoot(root?: TreeItem | null) {
		this.#root = root;

		this.#shadowRoot?.replaceChildren();

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

	#createItem(item: TreeItem, predecessor: HTMLElement | null, createExpanded: boolean): HTMLElement {
		let element: HTMLElement;

		const itemElement = this.#itemElements.get(item);

		if (itemElement) {
			element = itemElement.element;
			if (predecessor) {
				predecessor.after(element);
			} else {
				this.#shadowRoot?.append(element);
			}
		} else {
			const itemLevel = item.getLevel();
			let header: HTMLElement;
			let actions: HTMLElement;
			this.#addCssLevel(itemLevel);
			element = createElement('div', {
				class: `item level${itemLevel}`,
				parent: this.#shadowRoot,
				childs: [
					header = createElement('div', {
						class: 'header',
						childs: [
							createElement('div', {
								class: 'padding',
							}),
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
				]
			});

			if (predecessor) {
				predecessor.after(element);
			}

			this.#itemElements.set(item, { element: element, header: header, actions: actions });
			this.#elementItem.set(element, item);
		}

		if (item.kind == TreeItemKind.Root && item.name == '') {
			element.classList.add('root');
		}

		if (item.kind) {
			element.classList.add(`type-${item.kind}`);
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

		const element = this.#itemElements.get(item)?.element;

		if (!element) {
			return;
		}

		if (this.#isExpanded.get(item)) {
			return;
		}

		this.#isExpanded.set(item, true);

		if (!this.#isInitialized.has(item)) {
			const childs: HTMLElement[] = [];
			let predecessor = element;
			for (const child of item.childs) {
				const childElement = this.#createItem(child, predecessor, false);
				childs.push(childElement);
				predecessor = childElement;
			}
			this.#isInitialized.add(item);
		} else {
			for (const child of item.childs) {
				this.showItem(child);
			}
		}
	}

	collapseItem(item: TreeItem): void {
		this.#isExpanded.set(item, false);

		for (const child of item.childs) {
			this.hideItem(child);
		}
	}

	showItem(item: TreeItem): void {
		const element = this.#itemElements.get(item);
		if (element) {
			show(element.element);
		}

		if (this.#isExpanded.get(item)) {
			for (const child of item.childs) {
				this.showItem(child);
			}
		}
	}

	hideItem(item: TreeItem): void {
		const element = this.#itemElements.get(item);
		if (element) {
			hide(element.element);
		}
		for (const child of item.childs) {
			this.hideItem(child);
		}
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
					itemElement?.scrollIntoView({ block: 'center' });
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
					this.#isVisible.add(current);
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

	#handleScroll() {
		let stickyHeight = 0;
		for (const sticky of this.#sticky) {
			const rect = sticky.getBoundingClientRect();
			stickyHeight += rect.height;
		}

		console.info(stickyHeight, this.#sticky);


		const rect = this.getBoundingClientRect();
		const elements = this.#shadowRoot!.elementsFromPoint(rect.x + 1, rect.y + stickyHeight + 1);

		if (!elements) {
			return;
		}

		for (const element of elements) {
			let treeItem = this.#elementItem.get(element as HTMLElement);
			if (!treeItem) {
				continue;
			}

			treeItem = treeItem.parent;

			if (!treeItem) {
				continue;
			}

			this.#setSticky(treeItem);

			break;
		}
	}

	#addCssLevel(level: number): void {
		if (level == 0) {
			return;
		}
		if (!this.#cssLevel.has(level)) {
			this.#cssLevel.add(level);
			this.#dynamicSheet.insertRule(`.level${level} .padding{width: ${level}rem}`);
		}
	}

	#setSticky(item: TreeItem): void {
		for (const treeItemElement of this.#sticky) {
			treeItemElement.style.cssText = '';
		}

		this.#sticky.clear();

		let current: TreeItem | undefined = item;
		while (current) {
			const treeItemElement = this.#itemElements.get(current);
			if (treeItemElement) {
				this.#sticky.add(treeItemElement.element);
				treeItemElement.element.style.cssText = `position:sticky;top:${current.getLevel()}rem;`;
			}

			current = current.parent;
		}
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
