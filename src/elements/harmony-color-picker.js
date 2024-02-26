import { shadowRootStyle } from '../harmony-css.js';
import { createElement } from '../harmony-html.js';
import { Color } from '../utils/color.js';

import colorPickerCSS from '../css/harmony-color-picker.css';

export class HTMLHarmonyColorPickerElement extends HTMLElement {
	#doOnce = true;
	#shadowRoot;
	#color = new Color({hex: '#00ccffff'});
	#htmlHuePicker;
	#htmlHueSelector;
	#htmlMainPicker;
	#htmlAlphaPicker;
	#htmlAlphaSelector;
	#htmlInput;
	#htmlSample;
	#htmlOk;
	constructor() {
		super();
		this.#shadowRoot = this.attachShadow({ mode: 'closed' });
		this.#htmlHuePicker = createElement('div', {
			id: 'hue-picker',
			events: {
				click: event => this.#updateHue(event),
				mousemove: event => {
					if (event.buttons > 0) {
						this.#updateHue(event)
					}
				},
			},
		});
		this.#htmlMainPicker = createElement('div', {
			id: 'main-picker',
			events: {
				click: event => this.#updateLumSat(event),
				mousemove: event => {
					if (event.buttons > 0) {
						this.#updateLumSat(event)
					}
				},
			},
		});
		this.#htmlAlphaPicker = createElement('div', {
			id: 'alpha-picker',
			class:'alpha-background',
			events: {
				click: event => this.#updateAlpha(event),
				mousemove: event => {
					if (event.buttons > 0) {
						this.#updateAlpha(event)
					}
				},
			},
		});
		this.#htmlInput = createElement('input', { id: 'input' });
		this.#htmlSample = createElement('div', {
			id: 'sample',
			class:'alpha-background',
		});
		this.#htmlOk = createElement('button', { id: 'ok' });
	}

	#updateAlpha(event) {
		const percent = 1 - event.offsetY / event.target.offsetHeight;
		this.#color.alpha = percent;
		this.#update();
	}

	#updateHue(event) {
		const percent = event.offsetX / event.target.offsetWidth;
		this.#color.setHue(percent);
		this.#update();
	}

	#updateLumSat(event) {
		const sat = event.offsetX / event.target.offsetWidth;
		const lum = 1 - event.offsetY / event.target.offsetHeight;
		this.#color.setSatLum(sat, lum);
		this.#update();
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
		this.#htmlAlphaPicker.style = `--foreground-layer: linear-gradient(rgb(${red} ${green} ${blue} / 1), rgb(${red} ${green} ${blue} / 0));`;

		// Note: As of today (feb 2024) the css image() function is not yet supported by any browser. We resort to use a constant linear gradient
		this.#htmlSample.style = `--foreground-layer: linear-gradient(rgb(${red} ${green} ${blue} / ${this.#color.alpha}), rgb(${red} ${green} ${blue} / ${this.#color.alpha}));`;

		this.#htmlMainPicker.style = `color: hsl(${this.#color.getHue()}turn 100% 50%)`;

		this.#htmlInput.value = this.#color.getHex();
	}

	setColor() {
		this.#update();
	}
}
