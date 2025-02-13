import { shadowRootStyle } from '../harmony-css';
import { createElement } from '../harmony-html';
import { I18n } from '../harmony-i18n';
import switchCSS from '../css/harmony-switch.css';
import { toBool } from '../utils/attributes';
import { injectGlobalCss } from '../utils/globalcss';
import { HTMLHarmonyElement } from './harmony-element';

export class HTMLHarmonySwitchElement extends HTMLHarmonyElement {
	#shadowRoot?: ShadowRoot;
	#doOnce = true;
	#disabled = false;
	#htmlLabel?: HTMLElement;
	#htmlSwitchOuter?: HTMLElement;
	#htmlSwitchInner?: HTMLElement;
	#state? = false;
	#ternary = false;

	protected createElement() {
		this.#shadowRoot = this.attachShadow({ mode: 'closed' });
		shadowRootStyle(this.#shadowRoot, switchCSS);
		I18n.observeElement(this.#shadowRoot);

		this.#htmlLabel = createElement('div', {
			parent: this.#shadowRoot,
			class: 'harmony-switch-label',
		}) as HTMLElement;

		this.#htmlSwitchOuter = createElement('span', {
			parent: this.#shadowRoot,
			class: 'harmony-switch-outer',
			child: this.#htmlSwitchInner = createElement('span', { class: 'harmony-switch-inner' }) as HTMLElement,
		}) as HTMLElement;

		this.addEventListener('click', () => this.toggle());
		this.#refresh();
	}

	set disabled(disabled) {
		this.#disabled = disabled ? true : false;
		this.classList[this.#disabled ? 'add' : 'remove']('disabled');
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
		this.#htmlSwitchOuter?.classList.remove('on', 'off', 'ternary');
		if (this.#ternary) {
			this.#htmlSwitchOuter?.classList.add('ternary');
		}
		if (this.#state === undefined) {
			return;
		}
		this.#htmlSwitchOuter?.classList.add(this.#state ? 'on' : 'off');
	}

	attributeChangedCallback(name: string, oldValue: string, newValue: string) {
		switch (name) {
			case 'data-label':
				if (this.#htmlLabel) {
					this.#htmlLabel.innerHTML = newValue;
				}
				this.#htmlLabel?.classList.remove('i18n');
				break;
			case 'data-i18n':
				this.#htmlLabel?.setAttribute('data-i18n', newValue);
				if (this.#htmlLabel) {
					this.#htmlLabel.innerHTML = newValue;
				}
				this.#htmlLabel?.classList.add('i18n');
				break;
			case 'disabled':
				this.disabled = toBool(newValue);
				break;
			case 'ternary':
				this.ternary = true;
			case 'state':
				if (newValue == '' || newValue == 'undefined') {
					this.state = undefined
				} else {
					if (newValue == 'true' || newValue == '1') {
						this.state = true;
					} else {
						this.state = false;
					}
				}
				break;
		}
	}

	static get observedAttributes() {
		return ['data-label', 'data-i18n', 'disabled', 'ternary', 'state'];
	}
}

let definedSwitch = false;
export function defineHarmonySwitch() {
	if (window.customElements && !definedSwitch) {
		customElements.define('harmony-switch', HTMLHarmonySwitchElement);
		definedSwitch = true;
		injectGlobalCss();
	}
}
