import { MyEventTarget } from 'harmony-utils';
import treeCSS from '../css/harmony-tree.css';
import { defineHarmonyMenu, HarmonyMenuItems, HTMLHarmonyMenuElement } from '../elements/harmony-menu';
import { ItemActionEventData, ItemClickEventData, TreeAction, TreeContextMenuEventData, TreeItem, TreeItemElement, TreeItemFilter, TreeItemKind } from '../elements/harmony-tree';
import { shadowRootStyle } from '../harmony-css';
import { createElement, display, hide, show } from '../harmony-html';
import { I18n } from '../harmony-i18n';
import { HarmonyComponent } from './component';

export class HarmonyTree extends MyEventTarget implements HarmonyComponent {
	readonly htmlElement = createElement('div');
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

	#initHTML(): void {
		if (this.#shadowRoot) {
			return;
		}

		this.#shadowRoot = this.htmlElement.attachShadow({ mode: 'closed' });
		I18n.observeElement(this.#shadowRoot);
		void shadowRootStyle(this.#shadowRoot, treeCSS);

		this.#shadowRoot.adoptedStyleSheets.push(this.#dynamicSheet);
		this.#refresh();
		this.htmlElement.addEventListener('scroll', () => this.#handleScroll());
	}

	adoptStyle(css: string): void {
		this.#initHTML();
		void shadowRootStyle(this.#shadowRoot!, css);
	}

	#refresh(): void {
		if (!this.#shadowRoot) {
			return;
		}
		if (!this.#root) {
			return;
		}

		this.#createItem(this.#root, null, true);
		this.#refreshFilter();
	}

	#refreshFilter(): void {
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

	setRoot(root?: TreeItem | null): void {
		this.#initHTML();
		this.#root = root;

		this.#shadowRoot?.replaceChildren();
		this.#filterItems();
	}

	#buildContextMenu(contextMenu: HarmonyMenuItems, x: number, y: number): void {
		if (!this.#htmlContextMenu) {
			defineHarmonyMenu();
			this.#htmlContextMenu = createElement('harmony-menu') as HTMLHarmonyMenuElement;
		}

		this.#htmlContextMenu.showContextual(contextMenu, x, y);
	}

	#contextMenuHandler(event: MouseEvent, item: TreeItem): void {
		if (!event.shiftKey) {
			this.dispatchEvent(new CustomEvent<TreeContextMenuEventData>('contextmenu', {
				detail: {
					item: item,
					buildContextMenu: (menu: HarmonyMenuItems): void => this.#buildContextMenu(menu, event.clientX, event.clientY),
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
							const expanded = this.#isExpanded.get(item);
							const event = new CustomEvent<ItemClickEventData>('itemclick', { detail: { item: item }, cancelable: true, });
							this.dispatchEvent(event);
							if (event.defaultPrevented) {
								return;
							}

							if (expanded) {
								this.collapseItem(item);
							} else {
								this.expandItem(item);
								this.#refreshFilter();
							}

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

	isExpanded(item: TreeItem): boolean {
		return this.#isExpanded.get(item) ?? false;
	}

	expandItem(item: TreeItem): void {
		this.#initHTML();
		if (item.parent) {
			this.expandItem(item.parent);
		}

		if (this.#isExpanded.get(item)) {
			return;
		}

		this.#isExpanded.set(item, true);

		if (!this.#isInitialized.has(item)) {
			this.#initItem(item);
		} else {
			for (const child of item.childs) {
				this.showItem(child);
			}
		}
	}

	#initItem(item: TreeItem): void {
		const element = this.#itemElements.get(item)?.element;
		if (!element) {
			return;
		}

		const childs: HTMLElement[] = [];
		let predecessor = element;
		for (const child of item.childs) {
			const childElement = this.#createItem(child, predecessor, false);
			childs.push(childElement);
			predecessor = childElement;
		}
		this.#isInitialized.add(item);
	}

	collapseItem(item: TreeItem): void {
		this.#initHTML();
		this.#isExpanded.set(item, false);

		for (const child of item.childs) {
			this.hideItem(child);
		}
	}

	refreshItem(item: TreeItem): void {
		this.#isInitialized.delete(item);
		this.#initItem(item);
	}

	showItem(item: TreeItem): void {
		this.#initHTML();
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

	selectItem(item: TreeItem | null, scrollIntoView = true): void {
		this.#initHTML();
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

	addAction(name: string, img: HTMLElement | string, tooltip?: string): void {
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

	refreshActions(item: TreeItem): void {
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

	#actionHandler(event: MouseEvent, item: TreeItem, action: string): void {
		this.dispatchEvent(new CustomEvent<ItemActionEventData>('itemaction', {
			detail: {
				item: item,
				action: action,
			},
		}));
		event.preventDefault();
		event.stopPropagation();
	}

	setFilter(filter?: TreeItemFilter): void {
		this.#initHTML();
		this.#filter = filter;
		this.#filterItems();
	}

	#filterItems(): void {
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

	#handleScroll(): void {
		let stickyHeight = 0;
		for (const sticky of this.#sticky) {
			const rect = sticky.getBoundingClientRect();
			stickyHeight += rect.height;
		}

		const rect = this.htmlElement.getBoundingClientRect();
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
			this.#dynamicSheet.insertRule(`.level${level} .padding{flex: 0 0 ${level}rem}`);
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

/*
let definedTree = false;
export function defineHarmonyTree(): void {
	if (!definedTree) {
		defineElement('harmony-tree', class extends HTMLHarmonyTreeElement { });
		defineElement('h-tree', class extends HTMLHarmonyTreeElement { });
		definedTree = true;
		injectGlobalCss();
	}
}
*/
