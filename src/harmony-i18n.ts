const I18N_DELAY_BEFORE_REFRESH = 100;

export enum I18nEvents {
	LangChanged = 'langchanged',
	TranslationsUpdated = 'translationsupdated',
	Any = '*',
}

export type LangChangedEvent = { detail: { oldLang: string, newLang: string } };

export class I18n {
	static #lang = 'english';
	static #translations = new Map();
	static #executing = false;
	static #refreshTimeout: number | null;
	static #observerConfig = { childList: true, subtree: true, attributeFilter: ['i18n', 'data-i18n-json', 'data-i18n-values'] };
	static #observer?: MutationObserver;
	static #observed = new Set<HTMLElement | ShadowRoot>();
	static #eventTarget = new EventTarget();

	static start() {
		this.observeElement(document.body);
	}

	static setOptions(options: { translations: any }) {
		if (options.translations) {
			for (let translation of options.translations) {
				this.addTranslation(translation);
			}
			this.#eventTarget.dispatchEvent(new CustomEvent(I18nEvents.TranslationsUpdated));
			this.#eventTarget.dispatchEvent(new CustomEvent(I18nEvents.Any));
		}
		this.i18n();
	}

	static addTranslation(translation: any) {
		this.#translations.set(translation.lang, translation);
	}

	static #initObserver() {
		if (this.#observer) {
			return;
		}
		const callback = async (mutationsList: Array<MutationRecord>, observer: MutationObserver) => {
			for (let mutation of mutationsList) {
				if (mutation.type === 'childList') {
					for (let node of mutation.addedNodes) {
						if (node instanceof HTMLElement) {
							this.updateElement(node);
						}
					}
				} else if (mutation.type === 'attributes') {
					this.updateElement(mutation.target as HTMLElement);
				}
			}
		};
		this.#observer = new MutationObserver(callback);
	}

	static observeElement(element: HTMLElement | ShadowRoot) {
		this.#observed.add(element);

		this.#initObserver();
		this.#observer?.observe(element, this.#observerConfig);
		this.updateElement(element);
	}

	static #processList(parentNode: Element | ShadowRoot, className: string, attribute: string, subElement: string) {
		const elements = parentNode.querySelectorAll('.' + className);

		if ((parentNode as HTMLElement).classList?.contains(className)) {
			this.#processElement(parentNode as Element, attribute, subElement);
		}

		for (let element of elements) {
			this.#processElement(element, attribute, subElement);
		}
	}

	static #processJSON(parentNode: HTMLElement | ShadowRoot) {
		const className = 'i18n';
		const elements = parentNode.querySelectorAll('.' + className);

		if ((parentNode as HTMLElement).classList?.contains(className)) {
			this.#processElementJSON((parentNode as HTMLElement));
		}

		for (let element of elements) {
			this.#processElementJSON(element as HTMLElement);
		}
	}

	static #processElement(htmlElement: Element, attribute: string, subElement: string) {
		let dataLabel = htmlElement.getAttribute(attribute);
		if (dataLabel) {
			(htmlElement as any)[subElement] = this.getString(dataLabel);
		}
	}

	static #processElementJSON(htmlElement: HTMLElement) {
		const str = htmlElement.getAttribute('data-i18n-json');
		if (!str) {
			return;
		}

		const dataJSON = JSON.parse(str);
		if (!dataJSON) {
			return;
		}

		let valuesJSON;
		const values = htmlElement.getAttribute('data-i18n-values');
		if (values) {
			valuesJSON = JSON.parse(values);
		} else {
			valuesJSON = dataJSON.values;
		}

		const innerHTML = dataJSON.innerHTML;
		if (innerHTML) {
			htmlElement.innerHTML = this.formatString(innerHTML, valuesJSON);
		}
		const innerText = dataJSON.innerText;
		if (innerText) {
			(htmlElement).innerText = this.formatString(innerText, valuesJSON);
		}
	}

	static i18n() {
		if (!this.#refreshTimeout) {
			this.#refreshTimeout = setTimeout(() => this.#i18n(), I18N_DELAY_BEFORE_REFRESH);
		}
	}

	static #i18n() {
		this.#refreshTimeout = null;
		if (this.#executing) { return; }
		this.#executing = true;

		for (const element of this.#observed) {
			this.#processList(element, 'i18n', 'data-i18n', 'innerHTML');
			this.#processList(element, 'i18n-title', 'data-i18n-title', 'title');
			this.#processList(element, 'i18n-placeholder', 'data-i18n-placeholder', 'placeholder');
			this.#processList(element, 'i18n-label', 'data-i18n-label', 'label');
			this.#processJSON(element);
		}

		this.#executing = false;
		return;
	}

	static updateElement(htmlElement: HTMLElement | ShadowRoot) {
		this.#processList(htmlElement, 'i18n', 'data-i18n', 'innerHTML');
		this.#processList(htmlElement, 'i18n-title', 'data-i18n-title', 'title');
		this.#processList(htmlElement, 'i18n-placeholder', 'data-i18n-placeholder', 'placeholder');
		this.#processList(htmlElement, 'i18n-label', 'data-i18n-label', 'label');
		this.#processJSON(htmlElement);
	}

	static set lang(lang: string) {
		throw 'Deprecated, use setLang() instead';
	}

	static setLang(lang: string) {
		if (this.#lang != lang) {
			const oldLang = this.#lang;
			this.#lang = lang;
			this.#eventTarget.dispatchEvent(new CustomEvent(I18nEvents.LangChanged, { detail: { oldLang: oldLang, newLang: lang } }));
			this.#eventTarget.dispatchEvent(new CustomEvent(I18nEvents.Any));
			this.i18n();
		}
	}

	static addEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: AddEventListenerOptions | boolean): void {
		this.#eventTarget.addEventListener(type, callback, options);
	}

	static getString(s: string) {
		const strings = this.#translations.get(this.#lang)?.strings;
		if (strings) {
			let s2 = strings[s]
			if (typeof s2 == 'string') {
				return s2;
			} else {
				console.warn('Missing translation for key ' + s);
				return s;
			}
		}
		return s;
	}

	static formatString(s: string, values: any) {
		let str = this.getString(s);

		for (let key in values) {
			str = str.replace(new RegExp("\\\${" + key + "\\}", "gi"), values[key]);
		}
		return str;
	}

	static get authors() {
		throw 'Deprecated, use getAuthors() instead';
	}

	static getAuthors() {
		return this.#translations.get(this.#lang)?.authors ?? [];
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
