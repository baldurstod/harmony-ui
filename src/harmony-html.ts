export function createElement(tagName: string, options?: any) {
	const element = document.createElement(tagName);
	createElementOptions(element, options);
	return element;
}

export function createElementNS(namespaceURI: string, tagName: string, options: any) {
	const element = (document.createElementNS(namespaceURI, tagName) as HTMLElement);
	createElementOptions(element, options);
	return element;
}

export function createShadowRoot(tagName: string, options?: any, mode: 'open' | 'closed' = 'closed') {
	const element = document.createElement(tagName);
	const shadowRoot = element.attachShadow({ mode: mode });
	createElementOptions(element, options, shadowRoot);
	return shadowRoot;
}

export function updateElement(element: HTMLElement, options: any) {
	createElementOptions(element, options);
	return element;
}

function append(element: HTMLElement | ShadowRoot, child: HTMLElement) {
	if (child === null || child === undefined) {
		return;
	}

	if (child instanceof ShadowRoot) {
		element.append(child.host);
	} else {
		element.append(child);
	}
}

function createElementOptions(element: HTMLElement, options: any, shadowRoot?: ShadowRoot) {
	if (options) {
		for (const optionName in options) {
			const optionValue = options[optionName];
			switch (optionName) {
				case 'id':
					element.id = optionValue;
					break;
				case 'class':
					element.classList.add(...optionValue.split(' ').filter((n: string) => n));
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
					optionValue.forEach((entry: HTMLElement) => append(shadowRoot ?? element, entry));
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
				case 'multiple':
					element.setAttribute(optionName, optionValue);
					break;
				case 'slot':
					element.slot = optionValue;
					break;
				case 'adoptStyle':
					adoptStyleSheet(shadowRoot ?? element, optionValue);
					break;
				case 'adoptStyles':
					optionValue.forEach((entry: string) => {
						adoptStyleSheet(shadowRoot ?? element, entry);
					});
					break;
				case 'style':
					element.style.cssText = optionValue;
					break;
				default:
					if (optionName.startsWith('data-')) {
						element.setAttribute(optionName, optionValue);
					} else {
						(element as any)[optionName] = optionValue;
					}
					break;
			}
		}

		options.elementCreated?.(element, shadowRoot);
	}
}

async function adoptStyleSheet(element: HTMLElement | Document | ShadowRoot, cssText: string) {
	const sheet = new CSSStyleSheet;
	await sheet.replace(cssText);
	if ((element as any).adoptStyleSheet) {
		(element as any).adoptStyleSheet(sheet);
	} else {
		if ((element as Document).adoptedStyleSheets) {
			(element as Document).adoptedStyleSheets.push(sheet);
		}
	}
}

export function display(htmlElement: HTMLElement | undefined, visible: boolean) {
	if (htmlElement == undefined) {
		return;
	}

	if (htmlElement instanceof ShadowRoot) {
		htmlElement = (htmlElement.host as HTMLElement);
	}

	if (visible) {
		htmlElement.style.display = '';
	} else {
		htmlElement.style.display = 'none';
	}
}

export function show(htmlElement?: HTMLElement) {
	display(htmlElement, true);
}

export function hide(htmlElement?: HTMLElement) {
	display(htmlElement, false);
}

export function toggle(htmlElement: HTMLElement) {
	if (!(htmlElement instanceof HTMLElement)) {
		return;
	}
	if (htmlElement.style.display == 'none') {
		htmlElement.style.display = '';
	} else {
		htmlElement.style.display = 'none';
	}
}

export function isVisible(htmlElement: HTMLElement) {
	return htmlElement.style.display == ''
}

export const visible = isVisible;

export function styleInject(css: string) {
	document.head.append(createElement('style', { textContent: css }));
}
