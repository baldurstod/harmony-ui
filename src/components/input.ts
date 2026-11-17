import { errorOnce, MyEventTarget } from 'harmony-utils';
import inputCSS from '../css/components/input.css';
import { shadowRootStyle } from '../harmony-css';
import { addRemoveClass, createElement, hide, show, updateElement } from '../harmony-html';
import { AddAndProcessI18nElement, I18n, I18nDescriptor } from '../harmony-i18n';
import { HasI18n } from '../interfaces/hasi18n';
import { HarmonyComponent } from './component';

export type HarmonyInputParams = {
	/** Label. */
	label?: string;
	/** Internationalized label. */
	labelI18n?: string | I18nDescriptor | null;
	/** Set the input disabled. Default to false. */
	disabled?: boolean;
	/** Set the input value. */
	value?: string;
}

export type HarmonyInputEventData = {
	input: HarmonyInput;
	originalEvent?: Event;
};

export type HarmonyInputInfoLevel = 'info' | 'error' | 'warning';

export class HarmonyInput extends MyEventTarget implements HarmonyComponent, HasI18n {
	readonly htmlElement = createElement('div');
	#shadowRoot?: ShadowRoot;
	#htmlLabel?: HTMLSpanElement;
	#htmlInput?: HTMLInputElement;
	#htmlInfo?: HTMLDivElement;
	#disabled = false;
	#active = false;

	constructor(params: HarmonyInputParams = {}) {
		super();
		this.setParams(params);
	}

	setParams(params: HarmonyInputParams): void {
		this.#initHTML();
	}

	#initHTML(): void {
		if (this.#shadowRoot) {
			return;
		}

		this.#shadowRoot = this.htmlElement.attachShadow({ mode: 'closed' });
		I18n.observeElement(this.#shadowRoot);
		void shadowRootStyle(this.#shadowRoot, inputCSS);

		createElement('label', {
			parent: this.#shadowRoot,
			childs: [
				this.#htmlLabel = createElement('span',),
				this.#htmlInput = createElement('input', {
					//$click: (event: Event) => { event.stopPropagation(); this.close() },
				}),
			],
		});
		this.#htmlInfo = createElement('div', {
			parent: this.#shadowRoot,
			hidden: true,
			class: 'info-box',
		});
	}

	setLabel(label: string): void {
		this.#initHTML();
		this.#htmlLabel!.innerText = label;
	}

	setTitleI18n(i18n: string | I18nDescriptor | null): void {
		this.#initHTML();
		if (typeof i18n === 'string') {
			updateElement(this.#htmlLabel!, {
				i18n,
			});
		} else {
			errorOnce('unhandled type ' + typeof i18n + i18n);
		}
	}

	setDisabled(disabled: boolean): void {
		this.#initHTML();
		this.#disabled = disabled ? true : false;
		addRemoveClass(this.#htmlInput, 'disabled', this.#disabled);
	}

	getDisabled(): boolean {
		return this.#disabled;
	}

	scrollIntoView(): void {
		this.#initHTML();
		this.#htmlInput!.scrollIntoView();
	}

	setInfo(info: string | I18nDescriptor | null) {
		this.setInfoBox(info, 'info');
	}

	setWarning(info: string | I18nDescriptor | null) {
		this.setInfoBox(info, 'warning');
	}

	setError(info: string | I18nDescriptor | null) {
		this.setInfoBox(info, 'error');
	}

	setInfoBox(info: string | I18nDescriptor | null, level: HarmonyInputInfoLevel = 'info') {
		this.#initHTML();
		for (const level of ['info', 'warning', 'error']) {
			this.#htmlInfo!.classList.remove(level);
		}
		this.#htmlInfo!.classList.add(level);
		AddAndProcessI18nElement(this.#htmlInfo!, info);
		if (!info) {
			hide(this.#htmlInfo);
		} else {
			show(this.#htmlInfo);
		}
	}
}
