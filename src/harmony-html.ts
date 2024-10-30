export function createElement(tagName, options) {
	let element = document.createElement(tagName);
	return createElementOptions(element, options);
}

export function createElementNS(namespaceURI, tagName, options) {
	let element = document.createElementNS(namespaceURI, tagName);
	return createElementOptions(element, options);
}

export function updateElement(element, options) {
	createElementOptions(element, options);
	return element;
}

function append(element, child) {
	if (child === null || child === undefined) {
		return;
	}

	if (child instanceof ShadowRoot) {
		element.append(child.host);
	} else {
		element.append(child);
	}
}

function createElementOptions(element, options) {
	let shadowRoot;
	if (options) {
		if (options.attachShadow) {
			shadowRoot = element.attachShadow(options.attachShadow);
		}

		for (const optionName in options) {
			const optionValue = options[optionName];
			switch (optionName) {
				case 'class':
					element.classList.add(...optionValue.split(' '));
					break;
				case 'i18n':
					element.setAttribute('data-i18n', optionValue);
					element.innerHTML = optionValue;
					element.classList.add('i18n');
					break;
				case 'i18n-title':
					element.setAttribute('data-i18n-title', optionValue);
					element.classList.add('i18n-title');
					break;
				case 'i18n-placeholder':
					element.setAttribute('data-i18n-placeholder', optionValue);
					element.classList.add('i18n-placeholder');
					break;
				case 'i18n-label':
					element.setAttribute('data-i18n-label', optionValue);
					element.classList.add('i18n-label');
					break;
				case 'i18n-json':
					element.setAttribute('data-i18n-json', JSON.stringify(optionValue));
					element.classList.add('i18n');
					break;
				case 'i18n-values':
					element.setAttribute('data-i18n-values', JSON.stringify(optionValue));
					element.classList.add('i18n');
					break;
				case 'parent':
					optionValue.append(element);
					break;
				case 'child':
					append(shadowRoot ?? element, optionValue);
					break;
				case 'childs':
					optionValue.forEach(entry => append(shadowRoot ?? element, entry));
					break;
				case 'events':
					for (let eventType in optionValue) {
						let eventParams = optionValue[eventType];
						if (typeof eventParams === 'function') {
							element.addEventListener(eventType, eventParams);
						} else {
							element.addEventListener(eventType, eventParams.listener, eventParams.options);
						}
					}
					break;
				case 'hidden':
					if (optionValue) {
						hide(element);
					}
					break;
				case 'attributes':
					for (let attributeName in optionValue) {
						element.setAttribute(attributeName, optionValue[attributeName]);
					}
					break;
				case 'list':
					element.setAttribute(optionName, optionValue);
					break;
				case 'adoptStyle':
					adoptStyleSheet(shadowRoot ?? element, optionValue);
					break;
				case 'adoptStyles':
					optionValue.forEach(entry => {
						adoptStyleSheet(shadowRoot ?? element, entry);
					});
					break;
					break;
				default:
					if (optionName.startsWith('data-')) {
						element.setAttribute(optionName, optionValue);
					} else {
						element[optionName] = optionValue;
					}
					break;
			}
		}

		options.elementCreated?.(element, shadowRoot);
	}
	return shadowRoot ?? element;
}

async function adoptStyleSheet(element, cssText) {
	const sheet = new CSSStyleSheet;
	await sheet.replace(cssText);
	if (element.adoptStyleSheet) {
		element.adoptStyleSheet(sheet);
	} else {
		if (element.adoptedStyleSheets) {
			element.adoptedStyleSheets.push(sheet);
		}
	}
}

export function display(htmlElement, visible) {
	if (htmlElement == undefined) return;

	if (htmlElement instanceof ShadowRoot) {
		htmlElement = htmlElement.host;
	}

	if (visible) {
		htmlElement.style.display = '';
	} else {
		htmlElement.style.display = 'none';
	}
}

export function show(htmlElement) {
	display(htmlElement, true);
}

export function hide(htmlElement) {
	display(htmlElement, false);
}

export function toggle(htmlElement) {
	if (!(htmlElement instanceof HTMLElement)) {
		return;
	}
	if (htmlElement.style.display == 'none') {
		htmlElement.style.display = '';
	} else {
		htmlElement.style.display = 'none';
	}
}

export function isVisible(htmlElement) {
	return htmlElement.style.display == ''
}

export const visible = isVisible;

export function styleInject(css) {
	document.head.append(createElement('style', {textContent: css}));
}
