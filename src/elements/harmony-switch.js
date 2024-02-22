import { shadowRootStyle } from '../harmony-css.js';
import { createElement } from '../harmony-html.js';
import { I18n } from '../harmony-i18n.js';

import switchCSS from '../css/harmony-switch.css';

export class HTMLHarmonySwitchElement extends HTMLElement {
	#doOnce;
	#disabled;
	#htmlLabel;
	#htmlSwitchOuter;
	#htmlSwitchInner;
	#state = false;
	#ternary = false;
	#shadowRoot;
	constructor() {
		super();
		this.#doOnce = true;
		this.#shadowRoot = this.attachShadow({ mode: 'closed' });
		shadowRootStyle(this.#shadowRoot, switchCSS);
		this.#htmlLabel = createElement('div', { class: 'harmony-switch-label' });
		this.#htmlSwitchOuter = createElement('span', { class: 'harmony-switch-outer' });
		this.#htmlSwitchInner = createElement('span', { class: 'harmony-switch-inner' });
		this.addEventListener('click', () => this.toggle());
	}

	connectedCallback() {
		if (this.#doOnce) {
			I18n.observeElement(this.#shadowRoot);
			this.#shadowRoot.append(this.#htmlLabel, this.#htmlSwitchOuter);
			this.#htmlSwitchOuter.append(this.#htmlSwitchInner);
			this.#refresh();
			this.#doOnce = false;
		}
	}

	set disabled(disabled) {
		this.#disabled = disabled ? true : false;
		this.classList[this.#disabled?'add':'remove']('disabled');
	}

	get disabled() {
		return this.#disabled;
	}

	set state(state) {
		if (this.#state != state) {
			this.#state = state;
			this.dispatchEvent(new CustomEvent('change', { detail: { state: state, value: state } }));
		} else {
			this.#state = state;
		}
		this.#refresh();
	}

	get state() {
		return this.#state;
	}

	set checked(checked) {
		this.state = checked;
	}

	get checked() {
		return this.#state;
	}

	set ternary(ternary) {
		this.#ternary = ternary;
		this.#refresh();
	}

	get ternary() {
		return this.#ternary;
	}

	toggle() {
		if (this.#ternary) {
			if (this.#state === false) {
				this.state = undefined;
			} else if (this.#state === undefined) {
				this.state = true;
			} else {
				this.state = false;
			}
		} else {
			this.state = !this.#state;
		}
		this.#refresh();
	}

	#refresh() {
		this.#htmlSwitchOuter.classList.remove('on');
		this.#htmlSwitchOuter.classList.remove('off');
		this.#htmlSwitchOuter.classList[this.#ternary ? 'add' : 'remove']('ternary');
		if (this.#state === undefined) {
			return;
		}
		this.#htmlSwitchOuter.classList.add(this.#state ? 'on' : 'off');
	}

	attributeChangedCallback(name, oldValue, newValue) {
		switch (name) {
			case 'data-label':
				this.#htmlLabel.innerHTML = newValue;
				this.#htmlLabel.classList.remove('i18n');
				break;
			case 'data-i18n':
				this.#htmlLabel.setAttribute('data-i18n', newValue);
				this.#htmlLabel.innerHTML = newValue;
				this.#htmlLabel.classList.add('i18n');
				break;
			case 'disabled':
				this.disabled = newValue;
				break;
			case 'ternary':
				this.ternary = true;
				break;
		}
	}

	static get observedAttributes() {
		return ['data-label', 'data-i18n', 'disabled', 'ternary'];
	}
}
