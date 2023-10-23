import  { checkMarkSVG } from 'harmony-svg';

import {createElement, hide, show, display} from '../harmony-html.js';

function clampColor(val) {
	return Math.min(Math.max(0, val), 1);
}

export class HTMLHarmonyPaletteElement extends HTMLElement {
	#initialized = false;
	#multiple = false;
	#colors = new Map();
	#selected = new Map();
	#colorElements = new Map();
	#preSelected = new Set();
	constructor() {
		super();
	}

	connectedCallback() {
		if (!this.#initialized) {
			this.#initialized = true;
			this.#processChilds();
			//this.append(this.#htmlCopied);
			//hide(this.#htmlCopied);
		}
	}

	#processChilds() {
		//This is a 2 steps process cause we may change DOM
		const children = this.children;
		let list = [];
		for (let child of children) {
			list.push(child);
		}
		list.forEach(element => {
			const c = this.#addColor(element.innerText);
			element.remove();
			if (c && element.hasAttribute('selected')) {
				this.#preSelected.add(c.h);
			}
		});
		this.#refreshHTML();
	}

	#refreshHTML() {
		if (!this.#initialized) {
			return;
		}
		this.innerHTML = '';
		this.#colorElements.clear();

		for (const [colorHex, color] of this.#colors) {
			const element = createElement('div', {
				parent: this,
				class: 'harmony-palette-color',
				'data-color': colorHex,
				style: `background-color: ${colorHex}`,
				events: {
					click: event => this.#selectColor(colorHex, event.target),
				}
			});
			this.#colorElements.set(colorHex, element);
			if (this.#preSelected.has(colorHex)) {
				this.#selectColor(colorHex, element);

			}
		}
		this.#preSelected.clear();
	}

	#selectColor(hex, element, selected) {
		if (this.#selected.has(hex) && selected !==  true) {
			this.#setSelected(this.#selected.get(hex), false);
			this.#dispatchSelect(hex, false);
			this.#selected.delete(hex);
		} else {
			if (!this.#multiple) {
				for (const [h, e] of this.#selected) {
					this.#setSelected(e, false);
					this.#dispatchSelect(h, false);
					this.#selected.delete(h);
				}
			}
			this.#dispatchSelect(hex, true);
			this.#selected.set(hex, element);
			this.#setSelected(element, true);
		}
	}

	#setSelected(element, selected) {
		if (!element) {
			return;
		}
		if (selected) {
			element.classList.add('selected');
			element.innerHTML = checkMarkSVG;
		} else {
			element.classList.remove('selected');
			element.innerText = '';
		}

	}

	#dispatchSelect(hex, selected) {
		this.dispatchEvent(new CustomEvent(selected ? 'select' : 'unselect', { detail: { hex: hex } }));
	}

	clearColors() {
		this.#colors.clear();
		this.#refreshHTML();
	}

	addColor(color, tooltip) {
		const c = this.#addColor(color, tooltip);
		this.#refreshHTML();
		return c;
	}

	selectColor(color, selected = true) {
		const c = this.#getColorAsRGB(color);
		this.#selectColor(c.h, this.#colorElements.get(c.h), selected);
	}

	toggleColor(color) {
		const c = this.#getColorAsRGB(color);
		this.#selectColor(c.h, this.#colorElements.get(c.h));
	}

	#addColor(color, tooltip) {
		const c = this.#getColorAsRGB(color);
		if (!c) {
			return;
		}

		c.selected = false;
		c.tooltip = tooltip;

		this.#colors.set(c.h, c);
		return c;
	}

	#getColorAsRGB(color) {
		let r, g, b;
		switch (true) {
			case typeof color == 'string':
				let c = parseInt('0x' + color.replace('#', ''), 16);
				r = ((c >> 16) & 0xFF) / 255;
				g = ((c >> 8) & 0xFF) / 255;
				b = (c & 0xFF) / 255;
				break;
			case typeof color == 'array':
				r = clampColor(color[0]);
				g = clampColor(color[1]);
				b = clampColor(color[2]);
				break;
		}
		return { r: r, g: g, b: b, h: '#' + Number((r * 255 << 16) + (g * 255 << 8) + (b * 255)).toString(16).padStart(6, '0') };
	}

	attributeChangedCallback(name, oldValue, newValue) {
		switch (name) {
			case 'multiple':
				this.#multiple = newValue == true;
				break;
		}
	}

	static get observedAttributes() {
		return ['multiple'];
	}
}
