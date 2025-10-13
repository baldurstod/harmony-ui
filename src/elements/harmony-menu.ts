import { shadowRootStyle } from '../harmony-css';
import { createElement, hide } from '../harmony-html';
import { I18n } from '../harmony-i18n';
import menuCSS from '../css/harmony-menu.css';
import { injectGlobalCss } from '../utils/globalcss';

export type HarmonyMenuItem = {
	i18n?: string,
	name?: string,
	opened?: boolean,
	selected?: boolean,
	disabled?: boolean,
	submenu?: HarmonyMenuItems,
	cmd?: string,
	f?: (arg0: any) => void,
};

export type HarmonyMenuItemsArray = Array<HarmonyMenuItem>;
export type HarmonyMenuItemsDict = { [key: string]: HarmonyMenuItem | null };

export type HarmonyMenuItems = HarmonyMenuItemsArray | HarmonyMenuItemsDict;

export class HTMLHarmonyMenuElement extends HTMLElement {
	#doOnce = true;
	#subMenus = new Map<HTMLElement, HTMLElement>();
	#shadowRoot;
	#contextual = false;

	constructor() {
		super();
		this.#shadowRoot = this.attachShadow({ mode: 'closed' });

		document.addEventListener('click', (event) => {
			if (this.#contextual && !this.contains(event.target as HTMLElement)) {
				this.close();
			}
		});
	}

	#show(items: HarmonyMenuItems, userData?: any) {
		this.#setItems(items, userData);
		this.#checkSize();
	}

	show(items: HarmonyMenuItems, userData?: any) {
		this.#show(items, userData);
		this.setContextual(false);
	}

	showContextual(items: HarmonyMenuItems, clientX: number, clientY: number, userData?: any) {
		document.body.append(this);
		this.style.left = clientX + 'px';
		this.style.top = clientY + 'px';
		this.setContextual(true);
		this.#show(items, userData);
	}

	setContextual(contextual: boolean) {
		this.style.position = contextual ? 'absolute' : '';
		this.#contextual = contextual;
	}

	#checkSize() {
		const bodyRect = document.body.getBoundingClientRect();
		const elemRect = this.getBoundingClientRect();

		this.style.maxWidth = bodyRect.width + 'px';
		this.style.maxHeight = bodyRect.height + 'px';

		if (elemRect.right > bodyRect.right) {
			this.style.left = Math.max((bodyRect.width - elemRect.width), 0) + 'px';
			/*if (elemRect.width > bodyRect.width) {
				this.style.maxWidth = bodyRect.width + 'px';
			} else {
				this.style.maxWidth = '';
			}*/
		}

		if (elemRect.bottom > bodyRect.bottom) {
			this.style.top = Math.max((bodyRect.height - elemRect.height), 0) + 'px';
			/*if (elemRect.height > bodyRect.height) {
				this.style.maxHeight = bodyRect.height + 'px';
			} else {
				this.style.maxHeight = '';
			}*/
		}

		if (elemRect.left < 0) {
			this.style.left = '0px';
		}
		if (elemRect.top < 0) {
			this.style.top = '0px';
		}
	}

	close() {
		if (this.#contextual) {
			this.remove();
		}
	}

	connectedCallback() {
		if (this.#doOnce) {
			I18n.observeElement(this.#shadowRoot);
			shadowRootStyle(this.#shadowRoot, menuCSS);

			const callback = (entries: Array<ResizeObserverEntry>, observer: ResizeObserver) => {
				entries.forEach(() => {
					this.#checkSize();
				});
			};
			const resizeObserver = new ResizeObserver(callback);
			resizeObserver.observe(this);
			resizeObserver.observe(document.body);
			this.#doOnce = false;
		}
	}

	#setItems(items: HarmonyMenuItems, userData: any) {
		this.#shadowRoot.replaceChildren();
		if (items instanceof Array) {
			for (const item of items) {
				this.#shadowRoot.append(this.addItem(item, userData));
			}
		} else {
			for (const itemId in items) {
				const item = items[itemId];
				this.#shadowRoot.append(this.addItem(item, userData));
			}
		}
	}

	#openSubMenu(htmlSubMenu: HTMLElement) {
		for (const [htmlItem, sub] of this.#subMenus) {
			if (sub == htmlSubMenu || sub.contains(htmlSubMenu)) {
				htmlItem.classList.add('opened');
				htmlItem.classList.remove('closed');
			} else {
				htmlItem.classList.remove('opened');
				htmlItem.classList.add('closed');
			}
		}
		this.#checkSize();
	}

	addItem(item: HarmonyMenuItem | null, userData: any) {
		const htmlItem = createElement('div', {
			class: 'harmony-menu-item',
		}) as HTMLElement;

		if (!item) {
			htmlItem.classList.add('separator');
		} else {
			const htmlItemTitle = createElement('div', {
				class: 'harmony-menu-item-title',
			}) as HTMLElement;

			if (item.i18n) {
				htmlItemTitle.classList.add('i18n');
				htmlItemTitle.setAttribute('data-i18n', item.i18n);
				htmlItemTitle.innerText = item.i18n;
			} else {
				htmlItemTitle.innerText = item.name ?? '';
			}
			htmlItem.append(htmlItemTitle);

			if (item.selected) {
				htmlItem.classList.add('selected');
			}
			if (item.disabled) {
				htmlItem.classList.add('disabled');
			}
			if (item.submenu) {
				const htmlSubMenu = createElement('div', {
					class: 'submenu',
				}) as HTMLElement;
				this.#subMenus.set(htmlItem, htmlSubMenu);
				let subItems = 0;
				if (item.submenu instanceof Array) {
					for (const subItem of item.submenu) {
						htmlSubMenu.append(this.addItem(subItem, userData));
						++subItems;
					}
				} else {
					for (const subItemName in item.submenu) {
						const subItem = item.submenu[subItemName];
						htmlSubMenu.append(this.addItem(subItem, userData));
						++subItems;
					}
				}
				htmlItem.append(htmlSubMenu);
				//htmlSubMenu.style.display = 'none';
				htmlItem.classList.add('closed');
				if (item.opened) {
					this.#openSubMenu(htmlSubMenu);
				}
				htmlItem.addEventListener('click', event => {
					this.#openSubMenu(htmlSubMenu);
					if (item.cmd) {
						this.dispatchEvent(new CustomEvent(item.cmd));
					}
					if (item.f) {
						item.f(userData);
					}
					event.stopPropagation();
				});
				if (subItems == 0) {
					hide(htmlItem);
				}
			} else {
				htmlItem.addEventListener('click', (event: Event) => {
					if (item.cmd) {
						this.dispatchEvent(new CustomEvent(item.cmd));
					}
					if (item.f) {
						item.f(userData);
					}
					event.stopPropagation();
				}
				);
				htmlItem.addEventListener('click', () => this.close());
			}
		}
		return htmlItem;
	}
}

let definedMenu = false;
export function defineHarmonyMenu() {
	if (window.customElements && !definedMenu) {
		customElements.define('harmony-menu', HTMLHarmonyMenuElement);
		definedMenu = true;
		injectGlobalCss();
	}
}
