import { createElement, hide, show } from '../harmony-html';
import { toBool } from '../utils/attributes';
import accordionCSS from '../css/harmony-accordion.css';
import { shadowRootStyle } from '../harmony-css';
import { injectGlobalCss } from '../utils/globalcss';
import { defineHarmonyItem, HTMLHarmonyItemElement } from './harmony-item';

export class HTMLHarmonyAccordionElement extends HTMLElement {
	#doOnce = true;
	#multiple = false;
	#disabled = false;
	#items = new Set<HTMLHarmonyItemElement>();
	#selected = new Set<HTMLHarmonyItemElement>();
	#shadowRoot: ShadowRoot;
	//#htmlSlots = new Set<HTMLSlotElement>();

	constructor() {
		super();
		this.#shadowRoot = this.attachShadow({ mode: 'closed', slotAssignment: "manual", });
		shadowRootStyle(this.#shadowRoot, accordionCSS);
		this.#initMutationObserver();
	}

	connectedCallback() {
		if (this.#doOnce) {
			this.#processChilds();
			this.#doOnce = false;
		}
	}

	#processChilds() {
		//This is a 2 steps process cause we may change DOM
		const children = this.children;
		const list = [];
		for (const child of children) {
			list.push(child);
		}
		list.forEach(element => this.addItem(element as HTMLHarmonyItemElement));
	}

	addItem(item: HTMLHarmonyItemElement) {
		if (this.#items.has(item)) {
			return;
		}

		if (item.tagName == 'HARMONY-ITEM') {
			const htmlSlot: HTMLSlotElement = createElement('slot', {
				parent: this.#shadowRoot,
			}) as HTMLSlotElement;
			htmlSlot.assign(item);
			this.#items.add(item);
			item.getHeader().addEventListener('click', () => this.#toggle(item));
		}
		this.#refresh();
	}

	createItem(header: HTMLElement, content: HTMLElement) {
		const item = createElement('harmony-item', { childs: [header, content] });
		header.slot = 'header';
		content.slot = 'content';

		this.append(item);
		return item;
	}

	#refresh() {
		for (const htmlItem of this.#items) {
			hide(htmlItem.getContent());
		}
	}

	#toggle(htmlItem: HTMLHarmonyItemElement, collapse = true) {
		//let content = this.#items.get(header);
		/*
		if (collapse && !this.#multiple) {
			for (let selected of this.#selected) {
				if (htmlItem != selected) {
					this.#toggle(selected, false);
				}
			}
		}*/
		if (this.#selected.has(htmlItem)) {
			this.#display(htmlItem, false);
		} else {
			this.#display(htmlItem, true);
		}
	}

	#display(htmlItem: HTMLHarmonyItemElement, display: boolean) {
		if (display) {
			this.#selected.add(htmlItem);
			//htmlHeader.classList.add('selected');
			//htmlContent.classList.add('selected');
			show(htmlItem);
			show(htmlItem.getContent());
			this.#dispatchSelect(true, htmlItem);

			if (!this.#multiple) {
				for (const selected of this.#selected) {
					if (htmlItem != selected) {
						this.#display(selected, false);
					}
				}
			}

		} else {
			this.#selected.delete(htmlItem);
			//htmlHeader.classList.remove('selected');
			//htmlContent.classList.remove('selected');
			hide(htmlItem.getContent());
			this.#dispatchSelect(false, htmlItem);
		}
	}

	clear() {
		this.#items.clear();
		this.#selected.clear();
		this.#refresh();
	}

	expand(id: string) {
		for (const htmlItem of this.#items) {
			if (htmlItem.getId() == id) {
				this.#display(htmlItem, true);
			}
		}
	}

	expandAll() {
		for (const htmlItem of this.#items) {
			this.#display(htmlItem, true);
		}
	}

	collapse(id: string) {
		for (const htmlItem of this.#items) {
			if (htmlItem.getId() == id) {
				this.#display(htmlItem, false);
			}
		}
	}

	collapseAll() {
		for (const htmlItem of this.#items) {
			this.#display(htmlItem, false);
		}
	}

	#dispatchSelect(selected: boolean, htmlItem: HTMLHarmonyItemElement) {
		const htmlHeader = htmlItem.getHeader();
		const htmlContent = htmlItem.getContent();
		this.dispatchEvent(new CustomEvent(selected ? 'select' : 'unselect', {
			detail: {
				id: htmlItem.getId(),
				header: htmlHeader.assignedElements()[0],
				content: htmlContent.assignedElements()[0]
			}
		}));
	}

	#initMutationObserver() {
		const config = { childList: true, subtree: true };
		const mutationCallback = (mutationsList: Array<MutationRecord>, observer: MutationObserver) => {
			for (const mutation of mutationsList) {
				const addedNodes = mutation.addedNodes;
				for (const addedNode of addedNodes) {
					if (addedNode.parentNode == this) {
						this.addItem(addedNode as HTMLHarmonyItemElement);
					}
				}
			}
		};

		const observer = new MutationObserver(mutationCallback);
		observer.observe(this, config);

	}

	set disabled(disabled) {
		this.#disabled = disabled ? true : false;
		this.classList[this.#disabled ? 'add' : 'remove']('disabled');
	}

	get disabled() {
		return this.#disabled;
	}

	attributeChangedCallback(name: string, oldValue: string, newValue: string) {
		switch (name) {
			case 'multiple':
				this.#multiple = toBool(newValue);
				break;
		}
	}

	static get observedAttributes() {
		return ['multiple'];
	}
}

let definedAccordion = false;
export function defineHarmonyAccordion() {
	if (window.customElements && !definedAccordion) {
		defineHarmonyItem();
		customElements.define('harmony-accordion', HTMLHarmonyAccordionElement);
		definedAccordion = true;
		injectGlobalCss();
	}
}
