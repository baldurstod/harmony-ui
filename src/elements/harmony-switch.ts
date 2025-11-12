import switchCSS from '../css/harmony-switch.css';
import { shadowRootStyle } from '../harmony-css';
import { createElement } from '../harmony-html';
import { I18n } from '../harmony-i18n';
import { toBool } from '../utils/attributes';
import { injectGlobalCss } from '../utils/globalcss';
import { HTMLHarmonyElement } from './harmony-element';

export type HarmonySwitchChange = {
	/** State of the switch. Is undefined if switch is ternary and in undefined state */
	state: boolean | undefined;
	/** @deprecated use state instead */
	value: boolean | undefined;
}

export class HTMLHarmonySwitchElement extends HTMLHarmonyElement {
	#shadowRoot?: ShadowRoot;
	#disabled = false;
	#htmlLabel?: HTMLElement;
	#htmlSwitchOuter?: HTMLElement;
	#state? = false;
	#ternary = false;

	protected createElement(): void {
		this.#shadowRoot = this.attachShadow({ mode: 'closed' });
		void shadowRootStyle(this.#shadowRoot, switchCSS);
		I18n.observeElement(this.#shadowRoot);

		this.#htmlLabel = createElement('div', {
			parent: this.#shadowRoot,
			class: 'label',
		});

		createElement('slot', {
			parent: this.#shadowRoot,
			name: 'prepend',
			$click: () => this.state = false,
		}) as HTMLSlotElement;

		this.#htmlSwitchOuter = createElement('span', {
			parent: this.#shadowRoot,
			class: 'harmony-switch-outer',
			child: createElement('span', { class: 'harmony-switch-inner' }),
			$click: () => this.toggle(),
		});

		createElement('slot', {
			parent: this.#shadowRoot,
			name: 'append',
			$click: () => this.state = true,
		}) as HTMLSlotElement;

		this.#refresh();
	}

	set disabled(disabled) {
		this.#disabled = disabled ? true : false;
		this.classList[this.#disabled ? 'add' : 'remove']('disabled');
	}

	get disabled(): boolean {
		return this.#disabled;
	}

	set state(state) {
		if (this.#state != state) {
			this.#state = state;
			this.dispatchEvent(new CustomEvent<HarmonySwitchChange>('change', { detail: { state: state, value: state } }));
		} else {
			this.#state = state;
		}
		this.#refresh();
	}

	get state(): boolean | undefined {
		return this.#state;
	}

	set checked(checked) {
		this.state = checked;
	}

	get checked(): boolean | undefined {
		return this.#state;
	}

	set ternary(ternary) {
		this.#ternary = ternary;
		this.#refresh();
	}

	get ternary(): boolean {
		return this.#ternary;
	}

	toggle(): void {
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

	#refresh(): void {
		this.#htmlSwitchOuter?.classList.remove('on', 'off', 'ternary');
		if (this.#ternary) {
			this.#htmlSwitchOuter?.classList.add('ternary');
		}
		if (this.#state === undefined) {
			return;
		}
		this.#htmlSwitchOuter?.classList.add(this.#state ? 'on' : 'off');
	}

	protected onAttributeChanged(name: string, oldValue: string, newValue: string): void {
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

	static get observedAttributes(): string[] {
		return ['data-label', 'data-i18n', 'disabled', 'ternary', 'state'];
	}
}

let definedSwitch = false;
export function defineHarmonySwitch(): void {
	if (window.customElements && !definedSwitch) {
		customElements.define('harmony-switch', HTMLHarmonySwitchElement);
		definedSwitch = true;
		injectGlobalCss();
	}
}
