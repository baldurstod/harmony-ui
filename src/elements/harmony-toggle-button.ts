import toggleButtonCSS from '../css/harmony-toggle-button.css';
import { shadowRootStyle } from '../harmony-css';
import { createElement, hide, show } from '../harmony-html';
import { I18n } from '../harmony-i18n';
import { toBool } from '../utils/attributes';
import { injectGlobalCss } from '../utils/globalcss';

export class HTMLHarmonyToggleButtonElement extends HTMLElement {
	#state = false;
	#shadowRoot: ShadowRoot;
	#htmlSlotOn: HTMLSlotElement;
	#htmlSlotOff: HTMLSlotElement;

	constructor() {
		super();
		this.#shadowRoot = this.attachShadow({ mode: 'closed' });
		this.#htmlSlotOn = createElement('slot', {
			parent: this.#shadowRoot,
			name: 'on',
		}) as HTMLSlotElement;
		this.#htmlSlotOff = createElement('slot', {
			parent: this.#shadowRoot,
			name: 'off',
		}) as HTMLSlotElement;


		I18n.observeElement(this.#shadowRoot);
		void shadowRootStyle(this.#shadowRoot, toggleButtonCSS);

		this.addEventListener('click', (event: Event) => {
			this.#click();
			event.stopPropagation();
		});
		this.#initObserver();
	}

	connectedCallback(): void {
		this.#refresh();
	}

	attributeChangedCallback(name: string, oldValue: string, newValue: string): void {
		if (name == 'state') {
			this.state = toBool(newValue);
		}
	}

	get state(): boolean {
		return this.#state;
	}

	set state(state) {
		state = state ? true : false;
		if (this.#state != state) {
			this.#state = state;
			this.dispatchEvent(new CustomEvent('change', { detail: { oldState: this.#state, newState: state } }));
			this.#refresh();
		}
	}

	#refresh(): void {
		this.classList.remove('on', 'off');
		if (this.#state) {
			this.classList.add('on');
			if (this.#htmlSlotOn.assignedElements().length) {
				show(this.#htmlSlotOn);
				hide(this.#htmlSlotOff);
			}
		} else {
			this.classList.add('off');
			if (this.#htmlSlotOff.assignedElements().length) {
				hide(this.#htmlSlotOn);
				show(this.#htmlSlotOff);
			}
		}
	}

	#click(): void {
		this.state = !this.#state;
	}

	#initObserver(): void {
		const config = { childList: true, subtree: true };
		const mutationCallback = (mutationsList: MutationRecord[]): void => {
			for (const mutation of mutationsList) {
				for (const addedNode of mutation.addedNodes) {
					if (addedNode.parentNode == this) {
						this.#refresh();
					}
				}
			}
		};

		const observer = new MutationObserver(mutationCallback);
		observer.observe(this, config);
	}

	adoptStyleSheet(styleSheet: CSSStyleSheet): void {
		this.#shadowRoot.adoptedStyleSheets.push(styleSheet);
	}

	static get observedAttributes(): string[] {
		return ['state'];
	}
}

let definedToggleButton = false;
export function defineHarmonyToggleButton(): void {
	if (window.customElements && !definedToggleButton) {
		customElements.define('harmony-toggle-button', HTMLHarmonyToggleButtonElement);
		definedToggleButton = true;
		injectGlobalCss();
	}
}
