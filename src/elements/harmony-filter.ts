import { BugReporter } from 'harmony-utils';
import filterCSS from '../css/harmony-filter.css';
import { shadowRootStyle } from '../harmony-css';
import { createElement, defineElement } from '../harmony-html';
import { injectGlobalCss } from '../utils/globalcss';
import { HTMLHarmonyElement } from './harmony-element';
import { defineHarmonyItem } from './harmony-item';

export type HarmonyFilterType = 'string' | 'number' | 'range' | 'list' | 'select' | 'custom';

/**
 * For list like filters, determine the type of options
 */
export enum HarmonyFilterListType {
	/** Value can be true or false. Default option value is false */
	Boolean,
	/** Value can be true, false or undefined. Default option value is undefined */
	Ternary,
}

export type HarmonyFilterOption = {
	/** Option name. Must be unique among all options of a filter */
	name: string;
	/** Option title */
	title?: string;
	/** Enable internationalization of title. Default to true */
	i18n?: boolean;
	/** Optional icon */
	icon?: string;
	/** Optional color */
	color?: string;
	/** Default option value. If not provided the default value will follow the rules of HarmonyFilterListType */
	value?: boolean | undefined;
};

export type HarmonyFilterItem = {
	/** Filter name. Must be unique among all filters */
	name: string;
	/** Filter type */
	type: HarmonyFilterType;
	/** Filter title */
	title?: string;
	/** Filter placeholder */
	placeholder?: string;
	/** Enable internationalization of title and placeholder. Default to true */
	i18n?: boolean;
	/** For range or number filters, number of allowed decimals. 0 means integer. Default to 0 */
	decimals?: number;
	/** Default filter value */
	value?: any;
	/** For list like filters, determine the options type. See HarmonyFilterListType for more details */
	listType?: HarmonyFilterListType;
	/** For list like filters, list the default options */
	options?: HarmonyFilterOption[];
};

export type HarmonyFilter = HarmonyFilterItem[];

export type HarmonyFilterEvent = {
	name: string;
	value: any;
};

export class HTMLHarmonyFilterElement extends HTMLHarmonyElement {
	#shadowRoot?: ShadowRoot;
	readonly #items = new WeakSet<HTMLElement>();

	protected createElement(): void {
		this.#shadowRoot = this.attachShadow({ mode: 'closed' });
		void shadowRootStyle(this.#shadowRoot, filterCSS);

		this.#initObserver();
		this.#processChilds();
	}

	#initObserver(): void {
		const config = { childList: true, subtree: true };
		const mutationCallback = (mutationsList: MutationRecord[]): void => {
			for (const mutation of mutationsList) {
				for (const addedNode of mutation.addedNodes) {
					if (addedNode.parentNode == this) {
						this.addItem(addedNode as HTMLElement);
					}
				}
			}
		};

		const observer = new MutationObserver(mutationCallback);
		observer.observe(this, config);
	}

	#processChilds(): void {
		for (const child of this.children) {
			this.addItem(child as HTMLElement)
		}
	}

	addItem(item: HTMLElement): void {
		if (this.#items.has(item)) {
			return;
		}
		this.initElement();
		this.#shadowRoot!.append(item);

		/*
		const htmlSlot: HTMLSlotElement = createElement('slot', {
			parent: this.#shadowRoot,
		}) as HTMLSlotElement;
		htmlSlot.assign(item);
		*/
		this.#items.add(item);
	}

	/*
	addItem(item: HTMLElement): void {
		if (this.#items.has(item)) {
			return;
		}
		this.initElement();
		this.append(item);

		const htmlSlot: HTMLSlotElement = createElement('slot', {
			parent: this.#shadowRoot,
		}) as HTMLSlotElement;
		htmlSlot.assign(item);
		this.#items.add(item);
	}
	*/

	addFilters(filters: HarmonyFilterItem[]): void {
		for (const filter of filters) {
			const element = this.#createFilterElement(filter);
			if (element) {
				this.addItem(element);
			}
		}
	}

	addFilter(filter: HarmonyFilterItem): void {
		const element = this.#createFilterElement(filter);
		if (element) {
			this.addItem(element);
		}
	}

	#createFilterElement(filter: HarmonyFilterItem): HTMLElement | null {
		switch (filter.type) {
			/*
			export enum HarmonyFilterType {
				String,
				Number,
				Range,
				List,
				Select,
				Custom,
			}*/

			case 'string':
				return createElement('label', {
					class: 'string',
					childs: [
						createElement('span', {
							...(filter.i18n !== false) && {
								i18n: filter.title,
							},
							...(filter.i18n === false) && {
								innerText: filter.title,
							},
						}),
						createElement('input', {
							...(filter.i18n !== false) && {
								i18n: {
									placeholder: filter.placeholder ?? '',
								},
							},
							...(filter.i18n === false) && {
								placeholder: filter.placeholder ?? '',
							},
							$input: (event: InputEvent) => {
								this.#dispatchEvent(filter.name, (event.target as HTMLInputElement).value);
								event.stopPropagation();
							}
						}),
					],
				});
			case 'number':
				return createElement('input', { type: 'number', });
			case 'range':
				return createElement('div', {
					childs: [
						createElement('input', { type: 'number', }),
						createElement('input', { type: 'number', }),
					],
				});
			default:
				BugReporter.reportBug('error', `missing filter type ${filter.type}`);
				break;
		}

		return null;
	}

	#dispatchEvent(name: string, value: any): void {
		this.dispatchEvent(new CustomEvent<HarmonyFilterEvent>('filter', {
			detail: {
				name,
				value,
			},
		}));
	}

}

let definedFilter = false;
export function defineHarmonyFilter(): void {
	if (!definedFilter) {
		defineHarmonyItem();
		defineElement('harmony-filter', HTMLHarmonyFilterElement);
		definedFilter = true;
		injectGlobalCss();
	}
}
