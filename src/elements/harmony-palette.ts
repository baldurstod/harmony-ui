import { checkOutlineSVG } from 'harmony-svg';
import paletteCSS from '../css/harmony-palette.css';
import { shadowRootStyle } from '../harmony-css';
import { createElement } from '../harmony-html';
import { I18n } from '../harmony-i18n';
import { toBool } from '../utils/attributes';
import { injectGlobalCss } from '../utils/globalcss';

function clampColor(val: number) {
	return Math.min(Math.max(0, val), 1);
}

export type PaletteColor = {
	r: number;
	g: number;
	b: number;
	h: string;
}

export class HTMLHarmonyPaletteElement extends HTMLElement {
	#initialized = false;
	#multiple = false;
	#colors = new Map<string, PaletteColor>();
	#selected = new Map<string, HTMLElement>();
	#colorElements = new Map<string, HTMLElement>();
	#preSelected = new Set<string>();
	#shadowRoot;

	constructor() {
		super();
		this.#shadowRoot = this.attachShadow({ mode: 'closed' });
	}

	connectedCallback() {
		if (!this.#initialized) {
			I18n.observeElement(this.#shadowRoot);
			shadowRootStyle(this.#shadowRoot, paletteCSS);
			this.#initialized = true;
			this.#processChilds();
		}
	}

	adoptStyleSheet(styleSheet: CSSStyleSheet) {
		this.#shadowRoot.adoptedStyleSheets.push(styleSheet);
	}

	#processChilds() {
		//This is a 2 steps process cause we may change DOM
		const children = this.children;
		const list: Array<HTMLElement> = [];
		for (const child of children) {
			list.push(child as HTMLElement);
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
		this.innerText = '';
		this.#colorElements.clear();

		for (const [colorHex, color] of this.#colors) {
			const element = createElement('div', {
				parent: this.#shadowRoot,
				class: 'color',
				'data-color': colorHex,
				style: `background-color: ${colorHex}`,
				events: {
					click: (event: MouseEvent) => this.#selectColor(colorHex, event.target as HTMLElement),
				}
			}) as HTMLElement;
			this.#colorElements.set(colorHex, element);
			if (this.#preSelected.has(colorHex)) {
				this.#selectColor(colorHex, element);

			}
		}
		this.#preSelected.clear();
	}

	#selectColor(hex: string, element?: HTMLElement, selected = false) {
		const s = this.#selected.get(hex);
		if (s && selected !== true) {
			if (this.#multiple) {
				this.#setSelected(s, false);
				this.#dispatchSelect(hex, false);
				this.#selected.delete(hex);
			}
		} else {
			if (!this.#multiple) {
				for (const [h, e] of this.#selected) {
					this.#setSelected(e, false);
					this.#dispatchSelect(h, false);
					this.#selected.delete(h);
				}
			}
			this.#dispatchSelect(hex, true);
			if (element) {
				this.#selected.set(hex, element);
				this.#setSelected(element, true);
			}
		}
	}

	#setSelected(element: HTMLElement, selected: boolean) {
		if (!element) {
			return;
		}
		if (selected) {
			element.classList.add('selected');
			element.innerHTML = checkOutlineSVG;
		} else {
			element.classList.remove('selected');
			element.innerText = '';
		}

	}

	#dispatchSelect(hex: string, selected: boolean) {
		this.dispatchEvent(new CustomEvent(selected ? 'select' : 'unselect', { detail: { hex: hex } }));
	}

	clearColors() {
		this.#colors.clear();
		this.#refreshHTML();
	}

	addColor(color: string | Array<number>, tooltip: string) {
		const c = this.#addColor(color, tooltip);
		this.#refreshHTML();
		return c;
	}

	selectColor(color: string | Array<number>, selected = true) {
		const c = this.#getColorAsRGB(color);
		this.#selectColor(c.h, this.#colorElements.get(c.h), selected);
	}

	toggleColor(color: string | Array<number>) {
		const c = this.#getColorAsRGB(color);
		this.#selectColor(c.h, this.#colorElements.get(c.h));
	}

	#addColor(color: string | Array<number>, tooltip?: string) {
		const c = this.#getColorAsRGB(color);
		if (!c) {
			return;
		}

		/*
		c.selected = false;
		c.tooltip = tooltip;
		*/

		this.#colors.set(c.h, c);
		return c;
	}

	#getColorAsRGB(color: string | Array<number>): PaletteColor {
		let r = 0, g = 0, b = 0;
		switch (true) {
			case typeof color == 'string':
				const c = parseInt('0x' + color.replace('#', ''), 16);
				r = ((c >> 16) & 0xFF) / 255;
				g = ((c >> 8) & 0xFF) / 255;
				b = (c & 0xFF) / 255;
				break;
			case Array.isArray(color):
				r = clampColor(color[0] ?? 0);
				g = clampColor(color[1] ?? 0);
				b = clampColor(color[2] ?? 0);
				break;
		}
		return { r: r, g: g, b: b, h: '#' + Number((r * 255 << 16) + (g * 255 << 8) + (b * 255)).toString(16).padStart(6, '0') };
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

let definedPalette = false;
export function defineHarmonyPalette() {
	if (window.customElements && !definedPalette) {
		customElements.define('harmony-palette', HTMLHarmonyPaletteElement);
		definedPalette = true;
		injectGlobalCss();
	}
}
