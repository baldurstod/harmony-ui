import { shadowRootStyle } from '../harmony-css';
import { createElement } from '../harmony-html';
import colorPickerCSS from '../css/harmony-color-picker.css';
import { injectGlobalCss } from '../utils/globalcss';
import { Color } from 'harmony-utils';

export class HTMLHarmonyColorPickerElement extends HTMLElement {
	#doOnce = true;
	#shadowRoot;
	#color = new Color({ hex: '#00ffffff' });
	#htmlHuePicker: HTMLElement;
	#htmlHueSelector: HTMLElement;
	#htmlMainPicker: HTMLElement;
	#htmlMainSelector: HTMLElement;
	#htmlAlphaPicker: HTMLElement;
	#htmlAlphaSelector: HTMLElement;
	#htmlInput: HTMLInputElement;
	#htmlSample: HTMLElement;
	#htmlOk: HTMLElement;
	#htmlCancel: HTMLElement;
	#dragElement: HTMLElement | null = null;
	#shiftX: number = 0;
	#shiftY: number = 0;
	#pageX: number = 0;
	#pageY: number = 0;
	constructor() {
		super();
		document.addEventListener('mouseup', () => this.#dragElement = null);
		document.addEventListener('mousemove', event => this.#handleMouseMove(event));

		this.#shadowRoot = this.attachShadow({ mode: 'closed' });
		shadowRootStyle(this.#shadowRoot, colorPickerCSS);
		this.#htmlHuePicker = createElement('div', {
			parent: this.#shadowRoot,
			id: 'hue-picker',
			child: this.#htmlHueSelector = createElement('div', {
				id: 'hue-selector',
				class: 'selector',
				events: {
					mousedown: (event: MouseEvent) => this.#handleMouseDown(event),
				},
			}) as HTMLElement,
			events: {
				mousedown: (event: MouseEvent) => {
					this.#updateHue(event.offsetX / this.#htmlHuePicker.offsetWidth);
					this.#handleMouseDown(event, this.#htmlHueSelector);
				},
			},
		}) as HTMLElement;
		this.#htmlMainPicker = createElement('div', {
			parent: this.#shadowRoot,
			id: 'main-picker',
			child: this.#htmlMainSelector = createElement('div', {
				id: 'main-selector',
				class: 'selector',
				events: {
					mousedown: (event: MouseEvent) => this.#handleMouseDown(event),
				},
			}) as HTMLElement,
			events: {
				mousedown: (event: MouseEvent) => {
					this.#updateSatLum(event.offsetX / this.#htmlMainPicker.offsetWidth, 1 - (event.offsetY / this.#htmlMainPicker.offsetHeight));
					this.#handleMouseDown(event, this.#htmlMainSelector);
				},
			},
		}) as HTMLElement;
		this.#htmlAlphaPicker = createElement('div', {
			parent: this.#shadowRoot,
			id: 'alpha-picker',
			class: 'alpha-background',
			child: this.#htmlAlphaSelector = createElement('div', {
				id: 'alpha-selector',
				class: 'selector',
				events: {
					mousedown: (event: MouseEvent) => this.#handleMouseDown(event),
				},
			}) as HTMLElement,
			events: {
				mousedown: (event: MouseEvent) => {
					this.#updateAlpha(1 - (event.offsetY / this.#htmlAlphaPicker.offsetHeight));
					this.#handleMouseDown(event, this.#htmlAlphaSelector);
				},
			},
		}) as HTMLElement;
		this.#htmlInput = createElement('input', {
			parent: this.#shadowRoot,
			id: 'input',
			events: {
				change: () => this.#updateHex(this.#htmlInput.value),
			}
		}) as HTMLInputElement;
		this.#htmlSample = createElement('div', {
			parent: this.#shadowRoot,
			id: 'sample',
			class: 'alpha-background',
		}) as HTMLElement;
		createElement('div', {
			parent: this.#shadowRoot,
			id: 'buttons',
			childs: [
				this.#htmlOk = createElement('button', {
					parent: this.#shadowRoot,
					i18n: '#ok',
					events: {
						click: () => {
							this.#updateHex(this.#htmlInput.value);
							this.dispatchEvent(new CustomEvent('ok', { detail: { hex: this.#color.getHex(), rgba: this.#color.getRgba() } }));
						},
					},
				}) as HTMLElement,
				this.#htmlCancel = createElement('button', {
					parent: this.#shadowRoot,
					i18n: '#cancel',
					events: {
						click: () => this.dispatchEvent(new CustomEvent('cancel')),
					}
				}) as HTMLElement,
			],
		});
	}

	#updateAlpha(alpha: number) {
		this.#color.alpha = alpha;
		this.#update();
		this.#colorChanged();
	}

	#updateHue(hue: number) {
		this.#color.setHue(hue);
		this.#update();
		this.#colorChanged();
	}

	#updateHex(hex: string) {
		this.#color.setHex(hex);
		this.#update();
		this.#colorChanged();
	}

	#updateSatLum(sat: number, lum: number) {
		/*const sat = event.offsetX / event.target.offsetWidth;
		const lum = 1 - event.offsetY / event.target.offsetHeight;*/
		this.#color.setSatLum(sat, lum);
		this.#update();
		this.#colorChanged();
	}

	#colorChanged() {
		this.dispatchEvent(new CustomEvent('change', { detail: { hex: this.#color.getHex(), rgba: this.#color.getRgba() } }));
	}

	connectedCallback() {
		if (this.#doOnce) {
			this.#update();
			this.#doOnce = false;
		}
	}

	adoptStyleSheet(styleSheet: CSSStyleSheet) {
		this.#shadowRoot.adoptedStyleSheets.push(styleSheet);
	}

	#update() {
		const red = this.#color.red * 255;
		const green = this.#color.green * 255;
		const blue = this.#color.blue * 255;
		const hsl = this.#color.getHsl();
		const hue = hsl[0];
		const sat = hsl[1];
		const lum = hsl[2];
		this.#htmlAlphaPicker.style.cssText = `--foreground-layer: linear-gradient(rgb(${red} ${green} ${blue} / 1), rgb(${red} ${green} ${blue} / 0));`;

		// Note: As of today (feb 2024) the css image() function is not yet supported by any browser. We resort to use a constant linear gradient
		this.#htmlSample.style.cssText = `--foreground-layer: linear-gradient(rgb(${red} ${green} ${blue} / ${this.#color.alpha}), rgb(${red} ${green} ${blue} / ${this.#color.alpha}));`;

		this.#htmlMainPicker.style.cssText = `color: hsl(${hue}turn 100% 50%)`;

		this.#htmlInput.value = this.#color.getHex();

		this.#htmlHueSelector.style.left = `${hue * 100}%`;
		this.#htmlAlphaSelector.style.top = `${100 - this.#color.alpha * 100}%`;

		this.#htmlMainSelector.style.left = `${sat * 100}%`;
		this.#htmlMainSelector.style.top = `${100 - lum * 100}%`;;
	}

	getColor() {
		return this.#color;
	}

	setHex(hex: string) {
		this.#color.setHex(hex);
		this.#update();
	}

	#handleMouseDown(event: MouseEvent, selector?: HTMLElement) {
		this.#dragElement = selector ?? (event.currentTarget as HTMLElement);
		this.#shiftX = (selector ?? (event.currentTarget as HTMLElement)).offsetLeft;
		this.#shiftY = (selector ?? (event.currentTarget as HTMLElement)).offsetTop;
		this.#pageX = event.pageX;
		this.#pageY = event.pageY;
		event.stopPropagation();
	}

	#handleMouseMove(event: MouseEvent) {
		const pageX = event.pageX - this.#pageX;
		const pageY = event.pageY - this.#pageY;

		switch (this.#dragElement) {
			case this.#htmlHueSelector:
				const hue = Math.max(Math.min((pageX + this.#shiftX) / this.#htmlHuePicker.offsetWidth, 1), 0);
				this.#updateHue(hue);
				break;
			case this.#htmlMainSelector:
				const sat = Math.max(Math.min((pageX + this.#shiftX) / this.#htmlMainPicker.offsetWidth, 1), 0);
				const lum = Math.max(Math.min((pageY + this.#shiftY) / this.#htmlMainPicker.offsetHeight, 1), 0);
				this.#updateSatLum(sat, 1 - lum);
				break;
			case this.#htmlAlphaSelector:
				const alpha = Math.max(Math.min((pageY + this.#shiftY) / this.#htmlAlphaPicker.offsetHeight, 1), 0);
				this.#updateAlpha(1 - alpha);
				break;

			default:
				break;
		}

	}
}

let definedColorPicker = false;
export function defineHarmonyColorPicker() {
	if (window.customElements && !definedColorPicker) {
		customElements.define('harmony-color-picker', HTMLHarmonyColorPickerElement);
		definedColorPicker = true;
		injectGlobalCss();
	}
}
