import { shadowRootStyle } from '../harmony-css';
import { createElement, hide, show, updateElement } from '../harmony-html';
import sliderCSS from '../css/harmony-slider.css';
import { I18n } from '../harmony-i18n';
import { injectGlobalCss } from '../utils/globalcss';
import { HTMLHarmonyElement } from './harmony-element';

export class HTMLHarmonySliderElement extends HTMLHarmonyElement {
	#initialized = false;
	#shadowRoot?: ShadowRoot;
	#htmlLabel?: HTMLLabelElement;
	#htmlSlider?: HTMLInputElement;
	#htmlInput?: HTMLInputElement;
	#htmlPrependSlot?: HTMLSlotElement;
	#htmlAppendSlot?: HTMLSlotElement;
	#htmlPrependIcon?: HTMLImageElement;
	#htmlAppendIcon?: HTMLImageElement;
	#min = 0;
	#max = 100;
	#value: Array<number> = [50, 50];
	#isRange = false;

	createElement() {
		this.#shadowRoot = this.attachShadow({ mode: 'closed' });
		shadowRootStyle(this.#shadowRoot, sliderCSS);
		I18n.observeElement(this.#shadowRoot);

		this.#htmlLabel = createElement('label', {
			parent: this.#shadowRoot,
			hidden: true,
		}) as HTMLLabelElement;

		this.#htmlPrependSlot = createElement('slot', {
			parent: this.#shadowRoot,
			name: 'prepend',
		}) as HTMLSlotElement;

		this.#htmlPrependIcon = createElement('img', {
			parent: this.#shadowRoot,
		}) as HTMLImageElement;

		this.#htmlSlider = createElement('input', {
			type: 'range',
			parent: this.#shadowRoot,
			step: 'any',
			$change: (event: Event) => this.#setValue(Number((event.target as HTMLInputElement).value), undefined, event.target as HTMLElement),
			$input: (event: Event) => this.#setValue(Number((event.target as HTMLInputElement).value), undefined, event.target as HTMLElement),
		}) as HTMLInputElement;

		this.#htmlAppendIcon = createElement('img', {
			parent: this.#shadowRoot,
		}) as HTMLImageElement;

		this.#htmlAppendSlot = createElement('slot', {
			parent: this.#shadowRoot,
			name: 'append',
		}) as HTMLSlotElement;

		this.#htmlInput = createElement('input', {
			type: 'number',
			hidden: true,
			parent: this.#shadowRoot,
			value: 50,
			step: 'any',
			min: 0,
			max: 1000,
			$change: (event: Event) => this.#setValue(Number((event.target as HTMLInputElement).value), undefined, event.target as HTMLElement),
			$input: (event: Event) => this.#setValue(Number((event.target as HTMLInputElement).value), undefined, event.target as HTMLElement),
		}) as HTMLInputElement;
	}

	#checkMin(value: number): number {
		if (value < this.#min) {
			return this.#min;
		}
		return value;
	}

	#checkMax(max: number): number {
		if (max > this.#max) {
			return this.#max;
		}
		return max;
	}

	#setValue(min?: number, max?: number, initiator?: HTMLElement) {
		//	 TODO: swap min/max

		if (min !== undefined) {
			this.#value[0] = this.#checkMin(min);
		}

		if (max !== undefined) {
			this.#value[1] = this.#checkMax(max);
		}

		if (initiator != this.#htmlSlider) {
			this.#htmlSlider!.value = String(min ?? this.#value[0]);
		}
		if (initiator != this.#htmlInput) {
			this.#htmlInput!.value = String((min ?? this.#value[0]).toFixed(2));
		}

		this.dispatchEvent(new CustomEvent('input', {
			detail: {
				value: this.#isRange ? this.#value : this.#value[0],
			}
		}));
	}

	get value() {
		return this.#isRange ? this.#value : this.#value[0];
	}

	isRange() {
		return this.#isRange;
	}

	setValue(value: number | Array<number>) {
		if (Array.isArray(value)) {
			this.#setValue(value[0], value[1]);
		} else {
			if (this.#isRange) {
				console.error('value must be an array');
			} else {
				this.#setValue(value);
			}
		}
	}

	onAttributeChanged(name: string, oldValue: string | null, newValue: string | null) {
		let step: number | undefined;
		switch (name) {
			case 'label':
				updateElement(this.#htmlLabel, { i18n: newValue, });
				this.#htmlLabel!.innerHTML = newValue as string;
				show(this.#htmlLabel);
				break;
			case 'min':
				this.#min = Number(newValue);
				this.#htmlSlider!.setAttribute('min', String(this.#min));
				this.#htmlInput!.setAttribute('min', String(this.#min));
				break;
			case 'max':
				this.#max = Number(newValue);
				this.#htmlSlider!.setAttribute('max', String(this.#max));
				this.#htmlInput!.setAttribute('max', String(this.#max));
				break;
			case 'value':
				if (newValue === null) {
					break;
				}

				const value = JSON.parse(newValue);
				if (Array.isArray(value)) {
					this.setValue(value);
				} else {
					const n = Number(value);
					if (!Number.isNaN(n)) {
						this.setValue(n);
					}
				}
				break;
			case 'step':
				step = Number(newValue);
				if (Number.isNaN(step)) {
					step = undefined;
				} else {
					step = step;
				}
				this.#htmlSlider!.setAttribute('step', step ? String(step) : 'any');
				break;
			case 'input-step':
				step = Number(newValue);
				if (Number.isNaN(step)) {
					step = undefined;
				} else {
					step = step;
				}
				this.#htmlInput!.setAttribute('step', step ? String(step) : 'any');
				break;
			case 'has-input':
				if (newValue === null) {
					hide(this.#htmlInput);
				} else {
					show(this.#htmlInput);
				}
				break;
			/*
			case 'data-label':
				this.#htmlText.innerHTML = newValue;
				this.#htmlText.classList.remove('i18n');
				break;
			case 'data-i18n':
				this.#htmlText.setAttribute('data-i18n', newValue);
				this.#htmlText.innerHTML = newValue;
				this.#htmlText.classList.add('i18n');
				break;
			case 'data-position':
				this.#htmlText.setAttribute('data-position', newValue);
				break;
				*/
		}
	}

	static get observedAttributes() {
		return super.observedAttributes.concat(['label', 'min', 'max', 'input-step', 'has-input', 'append-icon', 'prepend-icon', 'value']);
	}
}

let definedSlider = false;
export function defineHarmonySlider() {
	if (window.customElements && !definedSlider) {
		customElements.define('harmony-slider', HTMLHarmonySliderElement);
		definedSlider = true;
		injectGlobalCss();
	}
}
