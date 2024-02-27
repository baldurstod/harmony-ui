import { shadowRootStyle } from '../harmony-css.js';
import { createElement } from '../harmony-html.js';
import { Color } from '../utils/color.js';

import colorPickerCSS from '../css/harmony-color-picker.css';

export class HTMLHarmonyColorPickerElement extends HTMLElement {
	#doOnce = true;
	#shadowRoot;
	#color = new Color({hex: '#00ffffff'});
	#htmlHuePicker;
	#htmlHueSelector;
	#htmlMainPicker;
	#htmlAlphaPicker;
	#htmlAlphaSelector;
	#htmlInput;
	#htmlSample;
	#htmlOk;
	#dragElement;
	#shiftX;
	#shiftY;
	#pageX;
	#pageY;
	constructor() {
		super();
		document.addEventListener('mouseup', () => this.#dragElement = null);
		document.addEventListener('mousemove', event => this.#handleMouseMove(event));

		this.#shadowRoot = this.attachShadow({ mode: 'closed' });
		this.#htmlHuePicker = createElement('div', {
			id: 'hue-picker',
			child: this.#htmlHueSelector = createElement('div', {
				id: 'hue-selector',
				class:'selector',
				events: {
					mousedown: event => {
						this.#dragElement = event.currentTarget;
						this.#shiftX = this.#htmlHueSelector.offsetLeft;
						this.#shiftY = this.#htmlHueSelector.offsetTop;
						this.#pageX = event.pageX;
						this.#pageY = event.pageY;
						event.stopPropagation();
					},
				},
			}),
			events: {
				mousedown: event => this.#updateHue(event.offsetX / this.#htmlHuePicker.offsetWidth),
			},
		});
		this.#htmlMainPicker = createElement('div', {
			id: 'main-picker',
			events: {
				click: event => this.#updateLumSat(event),
				mousedown: event => {
					this.#dragElement = event.target;
					//this.#shiftX = event.offsetX - this.#htmlHueSelector.getBoundingClientRect().left;
					//this.#shiftY = event.offsetY - this.#htmlHueSelector.getBoundingClientRect().top;
				},
			},
		});
		this.#htmlAlphaPicker = createElement('div', {
			id: 'alpha-picker',
			class:'alpha-background',
			child: this.#htmlAlphaSelector = createElement('div', {
				id: 'alpha-selector',
				class:'selector',
				events: {
					mousedown: event => {
						this.#dragElement = event.currentTarget;
						this.#shiftX = this.#htmlAlphaSelector.offsetLeft;
						this.#shiftY = this.#htmlAlphaSelector.offsetTop;
						this.#pageX = event.pageX;
						this.#pageY = event.pageY;
						event.stopPropagation();
					},
				},
			}),
			events: {
				mousedown: event => this.#updateAlpha(1 - (event.offsetY / this.#htmlAlphaPicker.offsetHeight)),
			},
		});
		this.#htmlInput = createElement('input', { id: 'input' });
		this.#htmlSample = createElement('div', {
			id: 'sample',
			class:'alpha-background',
		});
		this.#htmlOk = createElement('button', { id: 'ok' });
	}

	#updateAlpha(alpha) {
		this.#color.alpha = alpha;
		this.#update();
		this.#colorChanged();
	}

	#updateHue(hue) {
		this.#color.setHue(hue);
		this.#update();
		this.#colorChanged();
	}

	#updateLumSat(event) {
		const sat = event.offsetX / event.target.offsetWidth;
		const lum = 1 - event.offsetY / event.target.offsetHeight;
		this.#color.setSatLum(sat, lum);
		this.#update();
		this.#colorChanged();
	}

	#colorChanged() {
		this.dispatchEvent(new CustomEvent('change', { detail: { hex: this.#color.getHex(), rgba: this.#color.getRgba() } }));
	}

	connectedCallback() {
		if (this.#doOnce) {
			shadowRootStyle(this.#shadowRoot, colorPickerCSS);
			this.#shadowRoot.append(this.#htmlHuePicker, this.#htmlMainPicker, this.#htmlAlphaPicker, this.#htmlInput, this.#htmlInput, this.#htmlSample, this.#htmlOk);
			this.#update();
			this.#doOnce = false;
		}
	}

	adoptStyleSheet(styleSheet) {
		this.#shadowRoot.adoptedStyleSheets.push(styleSheet);
	}

	#update() {
		const red = this.#color.red * 255;
		const green = this.#color.green * 255;
		const blue = this.#color.blue * 255;
		const hue = this.#color.getHue();
		this.#htmlAlphaPicker.style = `--foreground-layer: linear-gradient(rgb(${red} ${green} ${blue} / 1), rgb(${red} ${green} ${blue} / 0));`;

		// Note: As of today (feb 2024) the css image() function is not yet supported by any browser. We resort to use a constant linear gradient
		this.#htmlSample.style = `--foreground-layer: linear-gradient(rgb(${red} ${green} ${blue} / ${this.#color.alpha}), rgb(${red} ${green} ${blue} / ${this.#color.alpha}));`;

		this.#htmlMainPicker.style = `color: hsl(${hue}turn 100% 50%)`;

		this.#htmlInput.value = this.#color.getHex();

		this.#htmlHueSelector.style.left = `${hue * 100}%`;
		this.#htmlAlphaSelector.style.top = `${100 - this.#color.alpha * 100}%`;
	}

	getColor() {
		return this.#color;
	}

	setColor() {
		this.#update();
	}

	#handleMouseMove(event) {
		const pageX = event.pageX - this.#pageX;
		const pageY = event.pageY - this.#pageY;

		switch (this.#dragElement) {
			case this.#htmlHueSelector:
				const hue = Math.max(Math.min((pageX + this.#shiftX) / this.#htmlHuePicker.offsetWidth, 1), 0);
				this.#updateHue(hue);
				break;
			/*case this.#htmlMainPicker:
				this.#updateLumSat(event.offsetX - this.#shiftX, event.offsetY - this.#shiftY);
				break;*/
			case this.#htmlAlphaSelector:
				const alpha = Math.max(Math.min((pageY + this.#shiftY) / this.#htmlAlphaPicker.offsetHeight, 1), 0);
				this.#updateAlpha(1 - alpha);
				break;

			default:
				break;
		}

	}
}
