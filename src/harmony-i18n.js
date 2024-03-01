const I18N_DELAY_BEFORE_REFRESH = 100;

export class I18n {
	static #lang = 'english';
	static #translations = new Map();
	static #executing = false;
	static #refreshTimeout;
	static #observerConfig = { childList: true, subtree: true, attributeFilter: ['i18n', 'data-i18n-json', 'data-i18n-values'] };
	static #observer;
	static #observed = new Set();

	static start() {
		this.observeElement(document.body);
	}

	static setOptions(options) {
		if (options.translations) {
			for (let translation of options.translations) {
				this.addTranslation(translation);
			}
		}
		this.i18n();
	}

	static addTranslation(translation) {
		this.#translations.set(translation.lang, translation);
	}

	static #initObserver() {
		if (this.#observer) {
			return;
		}
		const callback = async (mutationsList, observer) => {
			for(let mutation of mutationsList) {
				if (mutation.type === 'childList') {
					for (let node of mutation.addedNodes) {
						if (node instanceof HTMLElement) {
							this.updateElement(node);
						}
					}
				} else if (mutation.type === 'attributes') {
					this.updateElement(mutation.target);
				}
			}
		};
		this.#observer = new MutationObserver(callback);
	}

	static observeElement(element) {
		this.#observed.add(element);

		this.#initObserver();
		this.#observer.observe(element, this.#observerConfig);
		this.updateElement(element);
	}

	static #processList(parentNode, className, attribute, subElement) {
		const elements = parentNode.querySelectorAll('.' + className);

		if (parentNode.classList?.contains(className)) {
			this.#processElement(parentNode, attribute, subElement);
		}

		for (let element of elements) {
			this.#processElement(element, attribute, subElement);
		}
	}

	static #processJSON(parentNode) {
		const className = 'i18n';
		const elements = parentNode.querySelectorAll('.' + className);

		if (parentNode.classList?.contains(className)) {
			this.#processElementJSON(parentNode);
		}

		for (let element of elements) {
			this.#processElementJSON(element);
		}
	}

	static #processElement(htmlElement, attribute, subElement) {
		let dataLabel = htmlElement.getAttribute(attribute);
		if (dataLabel) {
			htmlElement[subElement] = this.getString(dataLabel);
		}
	}

	static #processElementJSON(htmlElement) {
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
	}

	static i18n() {
		if (!this.#refreshTimeout) {
			this.#refreshTimeout = setTimeout((event) => this.#i18n(), I18N_DELAY_BEFORE_REFRESH);
		}
	}

	static #i18n() {
		this.#refreshTimeout = null;
		if (this.#executing) {return;}
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

	static updateElement(htmlElement) {
		this.#processList(htmlElement, 'i18n', 'data-i18n', 'innerHTML');
		this.#processList(htmlElement, 'i18n-title', 'data-i18n-title', 'title');
		this.#processList(htmlElement, 'i18n-placeholder', 'data-i18n-placeholder', 'placeholder');
		this.#processList(htmlElement, 'i18n-label', 'data-i18n-label', 'label');
		this.#processJSON(htmlElement);
	}

	static set lang(lang) {
		throw 'Deprecated, use setLang() instead';
	}

	static setLang(lang) {
		if (this.#lang != lang) {
			this.#lang = lang;
			this.i18n();
		}
	}

	static getString(s) {
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

	static formatString(s, values) {
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
