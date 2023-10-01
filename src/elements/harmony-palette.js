import {createElement, hide, show, display} from '../harmony-html.js';

function clampColor(val) {
	return Math.min(Math.max(0, val), 1);
}

export class HarmonyPalette extends HTMLElement {
	#initialized = false;
	#multiple = false;
	#colors = new Map();
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
			this.#addColor(element.innerText);
			element.remove();
		});
		this.#refreshHTML();
	}

	#refreshHTML() {
		if (!this.#initialized) {
			return;
		}
		this.innerHTML = '';
		for (const [colorHex, color] of this.#colors) {
			createElement('div', {
				parent: this,
				class: 'harmony-palette-color',
				'data-color': colorHex,
				style: `background-color: ${colorHex}`,
				events: {
					click: () => this.#selectColor(colorHex),
				}
			});
		}
	}

	#selectColor(hex) {
		console.log(hex);
		this.dispatchEvent(new CustomEvent('select', { detail: { hex: hex } }));
	}

	clearColors() {
		this.#colors.clear();
		this.#refreshHTML();
	}

	addColor(color, tooltip) {
		this.#addColor(color, tooltip);
		this.#refreshHTML();
	}

	#addColor(color, tooltip) {
		const c = this.#getColorAsRGB(color);
		if (!c) {
			return;
		}

		c.selected = false;
		c.tooltip = tooltip;

		this.#colors.set(c.h, c);

		console.log(c);
	}

	#getColorAsRGB(color) {
		let r, g, b;
		switch (true) {
			case typeof color == 'string':
				let c = parseInt('0x' + color.replace('#', ''), 16);
				console.log(c);
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
