import { createElement } from '../harmony-html.js';
import { toBool } from '../utils/attributes.js';

export class HTMLHarmonyAccordionElement extends HTMLElement {
	#doOnce = true;
	#multiple = false;
	#disabled = false;
	#items = new Map();
	#selected = new Set<HTMLElement>();

	constructor() {
		super();
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
		let list = [];
		for (let child of children) {
			list.push(child);
		}
		list.forEach(element => this.addItem(element as HTMLElement));
	}

	addItem(item: HTMLElement) {
		if (item.tagName == 'ITEM') {
			let header = item.getElementsByTagName('header')[0];
			let content = item.getElementsByTagName('content')[0];

			const htmlItemHeader = createElement('div', { class: 'header' }) as HTMLElement;
			const htmlItemContent = createElement('div', { class: 'content' }) as HTMLElement;

			htmlItemHeader.addEventListener('click', () => this.#toggle(htmlItemHeader));

			htmlItemHeader.append(header);
			htmlItemContent.append(content);

			this.#items.set(htmlItemHeader, htmlItemContent);
			this.#refresh();
			item.remove();

			if (header.getAttribute('select')) {
				this.#toggle(htmlItemHeader);
			}
		}
	}

	createItem(header: HTMLElement, content: HTMLElement) {
		let item = createElement('item', { childs: [header, content] });
		this.append(item);
		return item;
	}

	#refresh() {
		this.innerHTML = '';
		for (let [header, content] of this.#items) {
			let htmlItem = createElement('div', { class: 'item' });
			htmlItem.append(header, content);
			this.append(htmlItem);
		}
	}

	#toggle(header: HTMLElement, collapse = true) {
		let content = this.#items.get(header);
		if (collapse && !this.#multiple) {
			for (let selected of this.#selected) {
				if (header != selected) {
					this.#toggle(selected, false);
				}
			}
		}
		if (this.#selected.has(header)) {
			this.#selected.delete(header);
			header.classList.remove('selected');
			content.classList.remove('selected');
			this.#dispatchSelect(false, header, content);
		} else {
			this.#selected.add(header);
			header.classList.add('selected');
			content.classList.add('selected');
			this.#dispatchSelect(true, header, content);
		}
	}

	clear() {
		this.#items.clear();
		this.#selected.clear();
		this.#refresh();
	}

	#dispatchSelect(selected: boolean, header: HTMLElement, content: HTMLElement) {
		this.dispatchEvent(new CustomEvent(selected ? 'select' : 'unselect', { detail: { header: header.children[0], content: content.children[0] } }));
	}

	#initMutationObserver() {
		let config = { childList: true, subtree: true };
		const mutationCallback = (mutationsList: Array<MutationRecord>, observer: MutationObserver) => {
			for (const mutation of mutationsList) {
				let addedNodes = mutation.addedNodes;
				for (let addedNode of addedNodes) {
					if (addedNode.parentNode == this) {
						this.addItem(addedNode as HTMLElement);
					}
				}
			}
		};

		let observer = new MutationObserver(mutationCallback);
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
export function defineAccordion() {
	if (window.customElements && !definedAccordion) {
		customElements.define('harmony-accordion', HTMLHarmonyAccordionElement);
		definedAccordion = true;
	}
}
