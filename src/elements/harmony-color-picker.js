import { shadowRootStyle } from '../harmony-css.js';
import { createElement } from '../harmony-html.js';

import colorPickerCSS from '../css/harmony-color-picker.css';

export class HTMLHarmonyColorPickerElement extends HTMLElement {
	#doOnce = true;
	#shadowRoot;
	#color = new Color({hex: '#00ccffff'});
	#htmlHuePicker;
	#htmlHueSelector;
	#htmlMainPicker;
	#htmlAlphaPicker;
	#htmlAlphaPickerInner;
	#htmlAlphaSelector;
	#htmlInput;
	#htmlSample;
	#htmlOk;
	constructor() {
		super();
		this.#shadowRoot = this.attachShadow({ mode: 'closed' });
		this.#htmlHuePicker = createElement('div', { id: 'hue-picker' });
		this.#htmlMainPicker = createElement('div', { id: 'main-picker' });
		this.#htmlAlphaPicker = createElement('div', {
			id: 'alpha-picker',
			class:'alpha-background',
			child: this.#htmlAlphaPickerInner = createElement('div'),
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
		const percent = 1 - (event.offsetY / event.target.offsetHeight);
		this.#color.alpha = percent;
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
		this.#htmlAlphaPickerInner.style = `background: linear-gradient(rgb(${red} ${green} ${blue} / 1), rgb(${red} ${green} ${blue} / 0));`;
		this.#htmlSample.style = `color: rgba(${red} ${green} ${blue} / ${this.#color.alpha});`;

		this.#htmlInput.value = this.#color.getHex();
	}

	setColor() {
		this.#update();
	}
}


export class Color {
	#rgba = [];
	constructor({red = 0, green = 0, blue = 0, alpha = 1, hex} = {}) {
		this.#rgba[0] = red;
		this.#rgba[1] = green;
		this.#rgba[2] = blue;
		this.#rgba[3] = alpha;

		if (hex) {
			this.setHex(hex);
		}
	}

	setHex(hex) {
		hex = (hex.startsWith('#') ? hex.slice(1) : hex)
			.replace(/^(\w{3})$/,          '$1F')                   //987      -> 987F
			.replace(/^(\w)(\w)(\w)(\w)$/, '$1$1$2$2$3$3$4$4')      //9876     -> 99887766
			.replace(/^(\w{6})$/,          '$1FF');                 //987654   -> 987654FF

		if (!hex.match(/^([0-9a-fA-F]{8})$/)) {
			throw new Error('Unknown hex color; ' + hex);
		}

		const rgba = hex
			.match(/^(\w\w)(\w\w)(\w\w)(\w\w)$/).slice(1)  //98765432 -> 98 76 54 32
			.map(x => parseInt(x, 16));                    //Hex to decimal

		this.#rgba[0] = rgba[0]/255;
		this.#rgba[1] = rgba[1]/255;
		this.#rgba[2] = rgba[2]/255;
		this.#rgba[3] = rgba[3]/255;
	}

	getHex() {
		const hex = this.#rgba.map(x => Math.round(x * 255).toString(16));
		return '#' + hex.map(x => x.padStart(2, '0')).join('');
	}

	set red(red) {
		this.#rgba[0] = red;
	}

	get red() {
		return this.#rgba[0];
	}

	set green(green) {
		this.#rgba[1] = green;
	}

	get green() {
		return this.#rgba[1];
	}

	set blue(blue) {
		this.#rgba[2] = blue;
	}

	get blue() {
		return this.#rgba[2];
	}

	set alpha(alpha) {
		this.#rgba[3] = alpha;
	}

	get alpha() {
		return this.#rgba[3];
	}
}
