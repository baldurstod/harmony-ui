import { HTMLHarmonyToggleButtonElement } from './browser';
import { AddI18nElement, I18nDescriptor } from './harmony-i18n';
import { ET } from './utils/create';
import { getHelp } from './utils/help';

export type CreateElementChildOption = Element | ShadowRoot | string | null | undefined;

export type HarmonyEventListener = ((evt: Event) => void) |
	((evt: MouseEvent) => void) |
	((evt: WheelEvent) => void) |
	((evt: PointerEvent) => void) |
	((evt: KeyboardEvent) => void) |
	((evt: InputEvent) => void) |
	((evt: CustomEvent) => void);

export type CreateElementOptions = {
	id?: string,
	class?: string,
	i18n?: string | I18nDescriptor | null,
	parent?: Element | ShadowRoot,
	child?: CreateElementChildOption,
	childs?: CreateElementChildOption[],
	events?: Record<string, HarmonyEventListener>,
	properties?: Record<string, unknown>,
	hidden?: boolean,
	innerHTML?: string | null,
	innerText?: string | null,
	attributes?: Record<string, string>,
	slot?: string,
	htmlFor?: string,
	adoptStyle?: string,
	adoptStyles?: string[],
	adoptStyleSheet?: CSSStyleSheet,
	adoptStyleSheets?: CSSStyleSheet[],
	style?: string,
	checked?: boolean,
	disabled?: boolean,
	help?: string,
	value?: string,
	elementCreated?: (element: Element, root?: ShadowRoot) => void,
	[key: string]: unknown,
	[key: `$${string}`]: HarmonyEventListener,
}

export type CreateElementOptionValue = null | boolean | string | I18nDescriptor | EventListenerOrEventListenerObject | [] | Record<string, string>;

export function createElement(tagName: string, options?: CreateElementOptions): HTMLElement {
	const element = document.createElement(tagName);
	createElementOptions(element, options);
	ET.dispatchEvent(new CustomEvent<HTMLElement>('created', { detail: element }));
	return element;
}

export function createElementNS(namespaceURI: string, tagName: string, options?: CreateElementOptions): Element {
	const element = document.createElementNS(namespaceURI, tagName);
	createElementOptions(element as HTMLElement, options);
	return element;
}

export function createShadowRoot(tagName: string, options?: CreateElementOptions, mode: 'open' | 'closed' = 'closed'): ShadowRoot {
	const element = document.createElement(tagName);
	const shadowRoot = element.attachShadow({ mode: mode });
	createElementOptions(element, options, shadowRoot);
	return shadowRoot;
}

export function updateElement(element: HTMLElement | undefined, options: CreateElementOptions): HTMLElement | undefined {
	if (!element) {
		return;
	}
	createElementOptions(element, options);
	ET.dispatchEvent(new CustomEvent<HTMLElement>('updated', { detail: element }));
	return element;
}

function append(element: Element | ShadowRoot, child: CreateElementChildOption): void {
	if (child === null || child === undefined) {
		return;
	}

	if (child instanceof ShadowRoot) {
		element.append(child.host);
	} else {
		element.append(child);
	}
}

function createElementOptions(element: HTMLElement, options?: CreateElementOptions, shadowRoot?: ShadowRoot): void {
	if (options) {
		for (const optionName in options) {
			const optionValue = options[optionName] as CreateElementOptionValue;

			if (optionName.startsWith('$')) {
				const eventType = optionName.substring(1);
				element.addEventListener(eventType, optionValue as EventListener);
				continue;
			}

			switch (optionName) {
				case 'id':
					element.id = optionValue as string;
					break;
				case 'class':
					element.classList.add(...(optionValue as string).split(' ').filter((n: string) => n));
					break;
				case 'i18n':
					AddI18nElement(element, optionValue as string | I18nDescriptor | null);
					break;
				case 'parent':
					(optionValue as Element | ShadowRoot).append(element);
					break;
				case 'child':
					append(shadowRoot ?? element, optionValue as CreateElementChildOption);
					break;
				case 'childs':
					(optionValue as CreateElementChildOption[]).forEach((entry: CreateElementChildOption) => append(shadowRoot ?? element, entry));
					break;
				case 'events':
					for (const eventType in optionValue as Record<string, EventListener>) {
						const eventParams = (optionValue as Record<string, EventListener>)[eventType]!;
						element.addEventListener(eventType, eventParams);
					}
					break;
				case 'properties':
					for (const name in optionValue as Record<string, unknown>) {
						// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
						(element as any)[name] = (optionValue as Record<string, unknown>)[name];
					}
					break;
				case 'hidden':
					if (optionValue) {
						hide(element);
					}
					break;
				case 'innerHTML':
					element.innerHTML = (optionValue as string) ?? '';
					break;
				case 'innerText':
					element.innerText = (optionValue as string) ?? '';
					break;
				case 'attributes':
					for (const attributeName in optionValue as Record<string, string>) {
						element.setAttribute(attributeName, (optionValue as Record<string, string>)[attributeName]!);
					}
					break;
				case 'slot':
					element.slot = optionValue as string;
					break;
				case 'htmlFor':
					(element as HTMLLabelElement).htmlFor = optionValue as string;
					break;
				case 'adoptStyle':
					void adoptStyle(shadowRoot ?? element, optionValue as string);
					break;
				case 'adoptStyles':
					((optionValue as string[]) ?? []).forEach((entry: string) => {
						void adoptStyle(shadowRoot ?? element, entry);
					});
					break;
				case 'adoptStyleSheet':
					adoptStyleSheet(shadowRoot ?? element, optionValue as CSSStyleSheet);
					break;
				case 'adoptStyleSheets':
					((optionValue as CSSStyleSheet[]) ?? []).forEach((entry: CSSStyleSheet) => {
						adoptStyleSheet(shadowRoot ?? element, entry);
					});
					break;
				case 'style':
					element.style.cssText = optionValue as string;
					break;
				case 'checked':
					(element as HTMLInputElement).checked = optionValue as boolean;
					break;
				case 'help':
					getHelp().addElement(element, optionValue as string);
					break;
				case 'elementCreated':
					break;
				default:
					element.setAttribute(optionName, optionValue as string);
					break;
			}
		}

		options.elementCreated?.(element, shadowRoot);
	}
}

async function adoptStyle(element: HTMLElement | Document | ShadowRoot, cssText: string): Promise<void> {
	const sheet = new CSSStyleSheet;
	await sheet.replace(cssText);
	adoptStyleSheet(element, sheet);
}

function adoptStyleSheet(element: HTMLElement | Document | ShadowRoot, sheet: CSSStyleSheet): void {
	if ((element as HTMLHarmonyToggleButtonElement).adoptStyleSheet) {
		(element as HTMLHarmonyToggleButtonElement).adoptStyleSheet(sheet);
	} else {
		if ((element as Document).adoptedStyleSheets) {
			(element as Document).adoptedStyleSheets.push(sheet);
		}
	}
}

export function display(htmlElement: HTMLElement | SVGElement | ShadowRoot | (HTMLElement | SVGElement | ShadowRoot)[] | undefined | null, visible: boolean): void {
	if (Array.isArray(htmlElement)) {
		for (const e of htmlElement) {
			disp(e, visible);
		}
	} else {
		disp(htmlElement, visible);
	}
}

function disp(htmlElement: HTMLElement | SVGElement | ShadowRoot | undefined | null, visible: boolean): void {
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

export function show(htmlElement: HTMLElement | SVGElement | ShadowRoot | (HTMLElement | SVGElement | ShadowRoot)[] | undefined | null): void {
	display(htmlElement, true);
}

export function hide(htmlElement: HTMLElement | SVGElement | ShadowRoot | (HTMLElement | SVGElement | ShadowRoot)[] | undefined | null): void {
	display(htmlElement, false);
}

export function toggle(htmlElement: HTMLElement | SVGElement | ShadowRoot | undefined | null): void {
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

export function isVisible(htmlElement: HTMLElement): boolean {
	return htmlElement.style.display == ''
}

export const visible = isVisible;

export function styleInject(css: string): void {
	document.head.append(createElement('style', { textContent: css }));
}
