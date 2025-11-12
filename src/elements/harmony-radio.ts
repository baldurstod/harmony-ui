import radioCSS from '../css/harmony-radio.css';
import { shadowRootStyle } from '../harmony-css';
import { createElement, hide, show } from '../harmony-html';
import { I18n } from '../harmony-i18n';
import { toBool } from '../utils/attributes';
import { injectGlobalCss } from '../utils/globalcss';

export type RadioChangedEventData = { value: string, state: boolean };

export class HTMLHarmonyRadioElement extends HTMLElement {
	#doOnce = true;
	#disabled = false;
	#multiple = false;
	#htmlLabel: HTMLElement;
	#buttons = new Map<string, HTMLButtonElement>();
	#buttons2 = new Set<HTMLButtonElement>();
	#slots = new Set<HTMLSlotElement>();
	#selected = new Set<string>();
	#shadowRoot;
	#lastSelected?: HTMLElement;

	constructor() {
		super();
		this.#shadowRoot = this.attachShadow({ mode: 'closed', slotAssignment: "manual" });
		this.#htmlLabel = createElement('div', { class: 'label' });
		this.#initMutationObserver();
	}

	connectedCallback(): void {
		if (this.#doOnce) {
			I18n.observeElement(this.#shadowRoot);
			void shadowRootStyle(this.#shadowRoot, radioCSS);
			this.#shadowRoot.prepend(this.#htmlLabel);
			hide(this.#htmlLabel);
			this.#processChilds();
			this.#doOnce = false;
		}
	}

	#processChilds(): void {
		for (const child of this.children) {
			this.#initButton(child as HTMLButtonElement)
		}
	}

	#initButton(htmlButton: HTMLButtonElement): void {
		this.#buttons.set(htmlButton.value, htmlButton);

		if (!this.#buttons2.has(htmlButton)) {
			htmlButton.addEventListener('click', () => this.select(htmlButton.value, !this.#multiple || !htmlButton.hasAttribute('selected')));
			this.#buttons2.add(htmlButton);
			const htmlSlot: HTMLSlotElement = createElement('slot', {
				parent: this.#shadowRoot,
			}) as HTMLSlotElement;
			this.#slots.add(htmlSlot);
			htmlSlot.assign(htmlButton);
			I18n.updateElement(htmlButton);
		}

		if (this.#selected.has(htmlButton.value) || htmlButton.hasAttribute('selected')) {
			this.select(htmlButton.value, true);
		}
	}

	select(value: string, select = true): void {
		this.#selected[select ? 'add' : 'delete'](value);

		const htmlButton = this.#buttons.get(value);
		if (htmlButton) {
			if (select) {
				if (!this.#multiple) {
					for (const child of this.children) {
						if (child.hasAttribute('selected')) {
							child.removeAttribute('selected');
							this.dispatchEvent(new CustomEvent<RadioChangedEventData>('change', { detail: { value: (child as HTMLButtonElement).value, state: false } }));
							child.dispatchEvent(new CustomEvent<RadioChangedEventData>('change', { detail: { value: (child as HTMLButtonElement).value, state: false } }));
						}
					}
				}
				htmlButton.setAttribute('selected', '');

				if (this.#lastSelected) {
					this.#lastSelected.classList.remove('last-selected');
				}

				this.#lastSelected = htmlButton;
				this.#lastSelected.classList.add('last-selected');
			} else {
				htmlButton.removeAttribute('selected');
			}
			this.dispatchEvent(new CustomEvent<RadioChangedEventData>('change', { detail: { value: htmlButton.value, state: select } }));
			htmlButton.dispatchEvent(new CustomEvent<RadioChangedEventData>('change', { detail: { value: htmlButton.value, state: select } }));
		}
	}

	isSelected(value: string): string | false {
		const htmlButton = this.#buttons.get(value);
		return htmlButton?.value ?? false;
	}

	set disabled(disabled) {
		this.#disabled = disabled ? true : false;
		this.classList[this.#disabled ? 'add' : 'remove']('disabled');
	}

	get disabled(): boolean {
		return this.#disabled;
	}

	clear(): void {
		for (const button of this.#buttons2) {
			button.remove();
		}
		for (const slot of this.#slots) {
			slot.remove();
		}

		this.#buttons.clear();
		this.#buttons2.clear();
		this.#selected.clear();
		this.#slots.clear();
	}

	#initMutationObserver(): void {
		const config = { childList: true, subtree: true };
		const mutationCallback = (mutationsList: MutationRecord[]): void => {
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

	attributeChangedCallback(name: string, oldValue: string, newValue: string): void {
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

	static get observedAttributes(): string[] {
		return ['data-label', 'data-i18n', 'disabled', 'multiple', 'value'];
	}
}

let definedRadio = false;
export function defineHarmonyRadio(): void {
	if (window.customElements && !definedRadio) {
		customElements.define('harmony-radio', HTMLHarmonyRadioElement);
		definedRadio = true;
		injectGlobalCss();
	}
}
