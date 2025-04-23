import { AddI18nElement } from './harmony-i18n';
import { ET } from './utils/create';

export function createElement(tagName: string, options?: any) {
	const element = document.createElement(tagName);
	createElementOptions(element, options);
	ET.dispatchEvent(new CustomEvent('created', { detail: element }));
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

export function updateElement(element: HTMLElement | undefined, options: any) {
	if (!element) {
		return;
	}
	createElementOptions(element, options);
	ET.dispatchEvent(new CustomEvent('updated', { detail: element }));
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

			if (optionName.startsWith('$')) {
				const eventType = optionName.substring(1);
				if (typeof optionValue === 'function') {
					element.addEventListener(eventType, optionValue);
				} else {
					element.addEventListener(eventType, optionValue.listener, optionValue.options);
				}
				continue;
			}

			switch (optionName) {
				case 'id':
					element.id = optionValue;
					break;
				case 'class':
					element.classList.add(...optionValue.split(' ').filter((n: string) => n));
					break;
				case 'i18n':
					AddI18nElement(element, optionValue);
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
					for (const eventType in optionValue) {
						const eventParams = optionValue[eventType];
						if (typeof eventParams === 'function') {
							element.addEventListener(eventType, eventParams);
						} else {
							element.addEventListener(eventType, eventParams.listener, eventParams.options);
						}
					}
					break;
				case 'properties':
					for (const name in optionValue) {
						(element as any)[name] = optionValue[name];
					}
					break;
				case 'hidden':
					if (optionValue) {
						hide(element);
					}
					break;
				case 'innerHTML':
					element.innerHTML = optionValue;
					break;
				case 'innerText':
					element.innerText = optionValue;
					break;
				case 'attributes':
					for (const attributeName in optionValue) {
						element.setAttribute(attributeName, optionValue[attributeName]);
					}
					break;
				case 'slot':
					element.slot = optionValue;
					break;
				case 'htmlFor':
					(element as any).htmlFor = optionValue;
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
				case 'checked':
					(element as HTMLInputElement).checked = optionValue;
					break;
				case 'elementCreated':
					break;
				default:
					element.setAttribute(optionName, optionValue);
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

export function display(htmlElement: HTMLElement | ShadowRoot | Array<HTMLElement | ShadowRoot> | undefined | null, visible: boolean) {
	if (Array.isArray(htmlElement)) {
		for (const e of htmlElement) {
			disp(e, visible);
		}
	} else {
		disp(htmlElement, visible);
	}
}

function disp(htmlElement: HTMLElement | ShadowRoot | undefined | null, visible: boolean) {
	if (!htmlElement) {
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

export function show(htmlElement: HTMLElement | ShadowRoot | Array<HTMLElement | ShadowRoot> | undefined | null) {
	display(htmlElement, true);
}

export function hide(htmlElement: HTMLElement | ShadowRoot | Array<HTMLElement | ShadowRoot> | undefined | null) {
	display(htmlElement, false);
}

export function toggle(htmlElement: HTMLElement | ShadowRoot | undefined | null) {
	if (!htmlElement) {
		return;
	}

	if (htmlElement instanceof ShadowRoot) {
		htmlElement = (htmlElement.host as HTMLElement);
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
