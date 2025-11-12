import { JSONObject } from 'harmony-types';
import { ET } from './utils/create';

const I18N_DELAY_BEFORE_REFRESH = 100;

export enum I18nEvents {
	LangChanged = 'langchanged',
	TranslationsUpdated = 'translationsupdated',
	Any = '*',
}

export type LangChangedEvent = { detail: { oldLang: string, newLang: string } };

const targets: ['innerHTML', 'innerText', 'placeholder', 'title', 'label'] = ['innerHTML', 'innerText', 'placeholder', 'title', 'label'];
export type I18nValue = string | number | boolean | null | undefined;
export type I18nTranslation = {
	lang: string,
	authors?: string[],
	strings: Record<string, string>,
};

export type I18nDescriptor = {
	innerHTML?: string | null,
	innerText?: string | null,
	placeholder?: string | null,
	title?: string | null,
	label?: string | null,
	values?: Record<string, I18nValue>,
}

type Target = {
	innerHTML?: string,
	innerText?: string,
	placeholder?: string,
	title?: string,
	label?: string,
}

export const I18nElements = new Map<Element, I18nDescriptor>();

export function AddI18nElement(element: Element, descriptor: string | I18nDescriptor | null):void {
	if (typeof descriptor == 'string') {
		descriptor = { innerText: descriptor };
	}

	const existing = I18nElements.get(element);
	if (existing) {
		if (descriptor === null) {
			I18nElements.delete(element);
			return;
		}

		for (const target of targets) {
			const desc = descriptor[target];
			if (desc === null) {
				delete existing[target];
			} else if (desc !== undefined) {
				existing[target] = desc;
			}
		}

		if (descriptor.values) {
			if (!existing.values) {
				existing.values = {};
			}

			for (const name in descriptor.values) {
				existing.values[name] = descriptor.values[name];
			}
		}

	} else {
		if (descriptor) {
			I18nElements.set(element, descriptor);
		}
	}

}

export class I18n {
	static #started = false;
	static #lang = 'english';
	static #defaultLang = 'english';
	static #translations = new Map<string, I18nTranslation>();
	static #executing = false;
	static #refreshTimeout: number | null;
	static #observerConfig = { childList: true, subtree: true, attributeFilter: ['i18n', 'data-i18n-json', 'data-i18n-values'] };
	static #observer?: MutationObserver;
	static #observed = new Set<HTMLElement | ShadowRoot>();
	static #eventTarget = new EventTarget();

	static start(): void {
		if (this.#started) {
			return;
		}
		this.#started = true;
		this.observeElement(document.body);
		ET.addEventListener('created', (event: Event) => this.#processElement2((event as CustomEvent<HTMLElement>).detail));
		ET.addEventListener('updated', (event: Event) => this.#processElement2((event as CustomEvent<HTMLElement>).detail));
	}

	static setOptions(options: { translations: I18nTranslation[] }): void {
		if (options.translations) {
			for (const translation of options.translations) {
				this.#addTranslation(translation);
			}
			this.#eventTarget.dispatchEvent(new CustomEvent(I18nEvents.TranslationsUpdated));
			this.#eventTarget.dispatchEvent(new CustomEvent(I18nEvents.Any));
		}
		this.i18n();
	}

	static addTranslation(translation: I18nTranslation): void {
		this.#addTranslation(translation);
		if (translation.lang == this.#lang) {
			this.i18n();
		}
	}

	static #addTranslation(translation: I18nTranslation): void {
		this.#translations.set(translation.lang, translation);
	}

	static #initObserver(): void {
		if (this.#observer) {
			return;
		}
		const callback = (mutationsList: MutationRecord[]) :void=> {
			for (const mutation of mutationsList) {
				if (mutation.type === 'childList') {
					for (const node of mutation.addedNodes) {
						if (node instanceof HTMLElement) {
							this.updateElement(node);
						}
					}
				} else if (mutation.type === 'attributes') {
					this.updateElement(mutation.target as Element);
				}
			}
		};
		this.#observer = new MutationObserver(callback);
	}

	static observeElement(element: HTMLElement | ShadowRoot): void {
		this.#observed.add(element);

		this.#initObserver();
		this.#observer?.observe(element, this.#observerConfig);
		this.updateElement(element);
	}

	static #processList(parentNode: Element | ShadowRoot, className: string, attribute: string, subElement: 'innerHTML'): void {
		const elements = parentNode.querySelectorAll('.' + className);

		if ((parentNode as HTMLElement).classList?.contains(className)) {
			this.#processElement(parentNode as Element, attribute, subElement);
		}

		for (const element of elements) {
			this.#processElement(element, attribute, subElement);
		}
	}

	static #processJSON(parentNode: Element | ShadowRoot): void {
		const className = 'i18n';
		const elements = parentNode.querySelectorAll('.' + className);

		if ((parentNode as HTMLElement).classList?.contains(className)) {
			this.#processElementJSON((parentNode as HTMLElement));
		}

		for (const element of elements) {
			this.#processElementJSON(element);
		}
	}

	static #processElement(htmlElement: Element, attribute: string, subElement: 'innerHTML'): void {
		const dataLabel = htmlElement.getAttribute(attribute);
		if (dataLabel) {
			htmlElement[subElement] = this.getString(dataLabel);
		}
	}

	// TODO: merge with function above
	static #processElement2(htmlElement: Element): void {
		const descriptor = I18nElements.get(htmlElement);
		if (descriptor) {
			const values = descriptor.values ?? {};
			for (const target of targets) {
				const desc = descriptor[target];
				if (desc && ((htmlElement as Target)[target] !== undefined)) {
					(htmlElement as Target)[target] = this.formatString(desc, values);
				}
			}
		}
	}

	static #processElementJSON(htmlElement: Element): void {
		const str = htmlElement.getAttribute('data-i18n-json');
		if (!str) {
			return;
		}

		const dataJSON = JSON.parse(str) as JSONObject;
		if (!dataJSON) {
			return;
		}

		let valuesJSON: Record<string, I18nValue>;
		const values = htmlElement.getAttribute('data-i18n-values');
		if (values) {
			valuesJSON = JSON.parse(values) as Record<string, I18nValue>;
		} else {
			valuesJSON = dataJSON.values as Record<string, I18nValue>;
		}

		const innerHTML = dataJSON.innerHTML as string;
		if (innerHTML) {
			htmlElement.innerHTML = this.formatString(innerHTML, valuesJSON);
		}
		const innerText = dataJSON.innerText as string;
		if (innerText && ((htmlElement as HTMLElement).innerText !== undefined)) {
			(htmlElement as HTMLElement).innerText = this.formatString(innerText, valuesJSON);
		}
	}

	static i18n(): void {
		if (!this.#refreshTimeout) {
			this.#refreshTimeout = setTimeout(() => this.#i18n(), I18N_DELAY_BEFORE_REFRESH);
		}
	}

	static #i18n(): void {
		this.#refreshTimeout = null;
		if (this.#executing) { return; }
		this.#executing = true;

		for (const element of this.#observed) {
			this.#processList(element, 'i18n', 'data-i18n', 'innerHTML');
			this.#processJSON(element);
		}

		for (const [element] of I18nElements) {
			this.#processElement2(element);
		}

		this.#executing = false;
		return;
	}

	static updateElement(htmlElement: Element | ShadowRoot): void {
		this.#processList(htmlElement, 'i18n', 'data-i18n', 'innerHTML');
		this.#processJSON(htmlElement);
	}

	/**
	 * @deprecated use setLang() instead
	 */
	static set lang(lang: string) {
		throw new Error('Deprecated, use setLang() instead');
	}

	static setLang(lang: string): void {
		if (this.#lang != lang) {
			const oldLang = this.#lang;
			this.#lang = lang;
			this.#eventTarget.dispatchEvent(new CustomEvent(I18nEvents.LangChanged, { detail: { oldLang: oldLang, newLang: lang } }));
			this.#eventTarget.dispatchEvent(new CustomEvent(I18nEvents.Any));
			this.i18n();
		}
	}

	static setDefaultLang(defaultLang: string): void {
		this.#defaultLang = defaultLang;
	}

	static addEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: AddEventListenerOptions | boolean): void {
		this.#eventTarget.addEventListener(type, callback, options);
	}

	static getString(s: string): string {
		const s2 = this.#translations.get(this.#lang)?.strings?.[s] ?? this.#translations.get(this.#defaultLang)?.strings?.[s];

		if (typeof s2 == 'string') {
			return s2;
		} else {
			console.warn('Missing translation for key ' + s);
			return s;
		}

		return s;
	}

	static formatString(s: string, values: Record<string, I18nValue>): string {
		let str = this.getString(s);

		for (const key in values) {
			str = str.replace(new RegExp("\\${" + key + "\\}", "gi"), String(values[key]));
		}
		return str;
	}

	/**
	 * @deprecated use getAuthors() instead
	 */
	static get authors(): void {
		throw new Error('Deprecated, use getAuthors() instead');
	}

	static getAuthors(): string[] {
		return this.#translations.get(this.#lang)?.authors ?? [];
	}

	static setValue(element: HTMLElement | undefined, name: string, value: I18nValue): void {
		if (!element) {
			return;
		}

		const i18n: Record<string, I18nValue> = {};
		i18n[name] = value;

		AddI18nElement(element, { values: i18n });
		this.#processElement2(element);
	}
	/*
		static async #checkLang() {
			if (!this.#path) {
				return false;
			}
			if (this.#translations.has(this.#lang)) {
				return true;
			} else {
				let url = this.#path + this.#lang + '.json';
				try {
					const response = await fetch(new Request(url));
					const json = await response.json();
					this.#loaded(json);
					/*.then((response) => {
						response.json().then((json) => {
							this.#loaded(json);
						})
					});* /
				} catch(e) {}
				this.#translations.set(this.#lang, {});
				return false;
			}
		}*/
	/*
		static #loaded(file) {
			if (file) {
				let lang = file.lang;
				this.#translations.set(lang, file);
				this.i18n();
				new I18nEvents().dispatchEvent(new CustomEvent('translationsloaded'));
			}
		}*/
}
