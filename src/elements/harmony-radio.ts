import { shadowRootStyle } from '../harmony-css';
import { createElement, hide, show } from '../harmony-html';
import { I18n } from '../harmony-i18n';
import radioCSS from '../css/harmony-radio.css';
import { toBool } from '../utils/attributes';
import { injectGlobalCss } from '../utils/globalcss';

export type RadioChangedEventData = { value: string, state: boolean };

export class HTMLHarmonyRadioElement extends HTMLElement {
	#doOnce = true;
	#disabled = false;
	#multiple = false;
	#htmlLabel: HTMLElement;
	#state = false;
	#buttons = new Map<string, HTMLButtonElement>();
	#buttons2 = new Set<HTMLButtonElement>();
	#selected = new Set();
	#shadowRoot;
	constructor() {
		super();
		this.#shadowRoot = this.attachShadow({ mode: 'closed' });
		this.#htmlLabel = createElement('div', { class: 'label' });
		this.#initObserver();
	}

	connectedCallback() {
		if (this.#doOnce) {
			I18n.observeElement(this.#shadowRoot);
			shadowRootStyle(this.#shadowRoot, radioCSS);
			this.#shadowRoot.prepend(this.#htmlLabel);
			hide(this.#htmlLabel);
			this.#processChilds();
			this.#doOnce = false;
		}
	}

	#processChilds() {
		while (this.children.length) {
			this.#initButton(this.children[0] as HTMLButtonElement);
		}
	}

	#initButton(htmlButton: HTMLButtonElement): void {
		this.#buttons.set(htmlButton.value, htmlButton);
		if (!this.#buttons2.has(htmlButton)) {
			htmlButton.addEventListener('click', () => this.select(htmlButton.value, !this.#multiple || !htmlButton.hasAttribute('selected')));
			this.#buttons2.add(htmlButton);
		}

		if (this.#selected.has(htmlButton.value) || htmlButton.hasAttribute('selected')) {
			this.select(htmlButton.value, true);
		}
		this.#shadowRoot.append(htmlButton);
		I18n.updateElement(htmlButton);
	}

	append(...params: Array<any>) {
		for (const param of params) {
			this.#initButton(param);
			//this.#shadowRoot.append(param);
			//I18n.updateElement(param);
		}
	}

	select(value: string, select: boolean) {
		this.#selected[select ? 'add' : 'delete'](value);

		const htmlButton = this.#buttons.get(value);
		if (htmlButton) {
			if (select && !this.#multiple) {
				for (const child of this.#shadowRoot.children) {
					if (child.hasAttribute('selected')) {
						child.removeAttribute('selected');
						this.dispatchEvent(new CustomEvent<RadioChangedEventData>('change', { detail: { value: (child as HTMLButtonElement).value, state: false } }));
						child.dispatchEvent(new CustomEvent<RadioChangedEventData>('change', { detail: { value: (child as HTMLButtonElement).value, state: false } }));
					}
				}
			}
			select ? htmlButton.setAttribute('selected', '') : htmlButton.removeAttribute('selected');
			this.dispatchEvent(new CustomEvent<RadioChangedEventData>('change', { detail: { value: htmlButton.value, state: select } }));
			htmlButton.dispatchEvent(new CustomEvent<RadioChangedEventData>('change', { detail: { value: htmlButton.value, state: select } }));
		}
	}

	isSelected(value: string) {
		const htmlButton = this.#buttons.get(value);
		return htmlButton?.value ?? false;
	}

	set disabled(disabled) {
		this.#disabled = disabled ? true : false;
		this.classList[this.#disabled ? 'add' : 'remove']('disabled');
	}

	get disabled() {
		return this.#disabled;
	}

	#initObserver() {
		const config = { childList: true, subtree: true };
		const mutationCallback = (mutationsList: Array<MutationRecord>, observer: MutationObserver) => {
			for (const mutation of mutationsList) {
				const addedNodes = mutation.addedNodes;
				for (const addedNode of addedNodes) {
					if (addedNode.parentNode == this) {
						this.#initButton(addedNode as HTMLButtonElement);
					}
				}
			}
		};

		const observer = new MutationObserver(mutationCallback);
		observer.observe(this, config);
	}

	attributeChangedCallback(name: string, oldValue: string, newValue: string) {
		switch (name) {
			case 'data-label':
				this.#htmlLabel.innerHTML = newValue;
				this.#htmlLabel.classList.remove('i18n');
				show(this.#htmlLabel);
				break;
			case 'data-i18n':
				this.#htmlLabel.setAttribute('data-i18n', newValue);
				this.#htmlLabel.innerHTML = newValue;
				this.#htmlLabel.classList.add('i18n');
				show(this.#htmlLabel);
				break;
			case 'disabled':
				this.disabled = toBool(newValue);
				break;
			case 'multiple':
				this.#multiple = true;
			case 'value':
				this.select(newValue, true);
				break;
		}
	}

	static get observedAttributes() {
		return ['data-label', 'data-i18n', 'disabled', 'multiple', 'value'];
	}
}

let definedRadio = false;
export function defineHarmonyRadio() {
	if (window.customElements && !definedRadio) {
		customElements.define('harmony-radio', HTMLHarmonyRadioElement);
		definedRadio = true;
		injectGlobalCss();
	}
}
