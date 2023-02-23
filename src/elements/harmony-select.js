import {createElement, hide, show} from '../harmony-html.js';

export class HarmonySelect extends HTMLElement {
	#htmlSelect;
	constructor() {
		super();
		this.#htmlSelect = createElement('select');
	}

	connectedCallback() {
		this.append(this.#htmlSelect);
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if (name == 'multiple') {
			this.#htmlSelect.setAttribute('multiple', newValue);
		}
	}

	addEventListener(type, listener) {
		this.#htmlSelect.addEventListener(type, listener);
	}

	onChange(event) {
		let newEvent = new event.constructor(event.type, event);
		this.dispatchEvent(newEvent);
	}

	addOption(value, text) {
		text = text || value;
		let option = document.createElement('option');
		option.value = value;
		option.innerHTML = text;
		this.#htmlSelect.append(option);
	}

	addOptions(values) {
		if (values && values.entries) {
			for (let [value, text] of values.entries()) {
				this.addOption(value, text);
			}
		}
	}

	setOptions(values) {
		this.removeAllOptions();
		this.addOptions(values);
	}

	removeOption(value) {
		let list = this.#htmlSelect.children;
		for (let i = 0; i < list.length; i++) {
			if (list[i].value === value) {
				list[i].remove();
			}
		}
	}

	removeAllOptions() {
		let list = this.#htmlSelect.children;
		while (list[0]) {
			list[0].remove();
		}
	}

	select(value) {
		let list = this.#htmlSelect.children;
		for (let i = 0; i < list.length; i++) {
			if (list[i].value === value) {
				list[i].selected = true;
			}
		}
	}

	selectFirst() {
		if (this.#htmlSelect.children[0]) {
			this.#htmlSelect.children[0].selected = true;
			this.#htmlSelect.dispatchEvent(new Event('input'));
		}
	}

	unselect(value) {
		let list = this.#htmlSelect.children;
		for (let i = 0; i < list.length; i++) {
			if (list[i].value === value) {
				list[i].selected = false;
			}
		}
	}
	unselectAll() {
		let list = this.#htmlSelect.children;
		for (let i = 0; i < list.length; i++) {
			list[i].selected = false;
		}
	}

	static get observedAttributes() {
		return ['multiple'];
	}
}
