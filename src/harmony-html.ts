import { HTMLHarmony2dManipulatorElement, HTMLHarmonyAccordionElement, HTMLHarmonyCircularProgressElement, HTMLHarmonyColorPickerElement, HTMLHarmonyCopyElement, HTMLHarmonyFileInputElement, HTMLHarmonyFilterElement, HTMLHarmonyInfoBoxElement, HTMLHarmonyInputElement, HTMLHarmonyItemElement, HTMLHarmonyLabelPropertyElement, HTMLHarmonyMenuElement, HTMLHarmonyPaletteElement, HTMLHarmonyPanelElement, HTMLHarmonyRadioElement, HTMLHarmonySelectElement, HTMLHarmonySliderElement, HTMLHarmonySlideshowElement, HTMLHarmonySplitterElement, HTMLHarmonySwitchElement, HTMLHarmonyTabElement, HTMLHarmonyTabGroupElement, HTMLHarmonyToggleButtonElement, HTMLHarmonyTooltipElement, HTMLHarmonyTreeElement } from './browser';
import { AddI18nElement, I18nDescriptor } from './harmony-i18n';
import { HasI18n } from './interfaces/hasi18n';
import { ET } from './utils/create';
import { Help } from './utils/help';
import { getObject } from './utils/registry';

export const svgNamespace = 'http://www.w3.org/2000/svg';

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
	/**
	 * Internationalization.
	 * If a string is provided, will internationalize element innerText.
	 * If a descriptor is provided, the element will be internationalized according to the properties of the descriptor.
	 * If a null value is provided, internationalization will be removed for this element.
	 */
	i18n?: string | I18nDescriptor | null,
	parent?: Element | ShadowRoot,
	after?: Element,
	before?: Element,
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
	/**
	 * Help for this element. See i18n for more details.
	 */
	help?: string | I18nDescriptor | null,
	value?: string,
	elementCreated?: (element: Element, root?: ShadowRoot) => void,
	[key: string]: unknown,
	[key: `$${string}`]: HarmonyEventListener,
	[key: `@${string}`]: string,
}

export type CreateShadowRootOptions = {
	clonable?: boolean;
	customElementRegistry?: CustomElementRegistry;
	delegatesFocus?: boolean;
	mode: ShadowRootMode;
	serializable?: boolean;
	slotAssignment?: SlotAssignmentMode;
}

export type CreateElementOptionValue = null | boolean | string | I18nDescriptor | EventListenerOrEventListenerObject | [] | Record<string, string>;

// Overloads for standard elements
export function createElement(tagName: 'button', options?: CreateElementOptions): HTMLButtonElement;
export function createElement(tagName: 'canvas', options?: CreateElementOptions): HTMLCanvasElement;
export function createElement(tagName: 'datalist', options?: CreateElementOptions): HTMLDataListElement;
export function createElement(tagName: 'dialog', options?: CreateElementOptions): HTMLDialogElement;
export function createElement(tagName: 'div', options?: CreateElementOptions): HTMLDivElement;
export function createElement(tagName: 'img', options?: CreateElementOptions): HTMLImageElement;
export function createElement(tagName: 'input', options?: CreateElementOptions): HTMLInputElement;
export function createElement(tagName: 'label', options?: CreateElementOptions): HTMLLabelElement;
export function createElement(tagName: 'optgroup', options?: CreateElementOptions): HTMLOptGroupElement;
export function createElement(tagName: 'option', options?: CreateElementOptions): HTMLOptionElement;
export function createElement(tagName: 'select', options?: CreateElementOptions): HTMLSelectElement;
export function createElement(tagName: 'slot', options?: CreateElementOptions): HTMLSlotElement;
export function createElement(tagName: 'span', options?: CreateElementOptions): HTMLSpanElement;
export function createElement(tagName: 'textarea', options?: CreateElementOptions): HTMLTextAreaElement;

// Overloads for harmony elements
export function createElement(tagName: 'harmony-2d-manipulator', options?: CreateElementOptions): HTMLHarmony2dManipulatorElement;
export function createElement(tagName: 'harmony-accordion', options?: CreateElementOptions): HTMLHarmonyAccordionElement;
export function createElement(tagName: 'harmony-circular-progress', options?: CreateElementOptions): HTMLHarmonyCircularProgressElement;
export function createElement(tagName: 'harmony-color-picker', options?: CreateElementOptions): HTMLHarmonyColorPickerElement;
export function createElement(tagName: 'harmony-copy', options?: CreateElementOptions): HTMLHarmonyCopyElement;
export function createElement(tagName: 'harmony-file-input', options?: CreateElementOptions): HTMLHarmonyFileInputElement;
export function createElement(tagName: 'harmony-filter', options?: CreateElementOptions): HTMLHarmonyFilterElement;
export function createElement(tagName: 'harmony-info-box', options?: CreateElementOptions): HTMLHarmonyInfoBoxElement;
export function createElement(tagName: 'harmony-input', options?: CreateElementOptions): HTMLHarmonyInputElement;
export function createElement(tagName: 'harmony-item', options?: CreateElementOptions): HTMLHarmonyItemElement;
export function createElement(tagName: 'harmony-label-property', options?: CreateElementOptions): HTMLHarmonyLabelPropertyElement;
export function createElement(tagName: 'harmony-menu', options?: CreateElementOptions): HTMLHarmonyMenuElement;
export function createElement(tagName: 'harmony-palette', options?: CreateElementOptions): HTMLHarmonyPaletteElement;
export function createElement(tagName: 'harmony-panel', options?: CreateElementOptions): HTMLHarmonyPanelElement;
export function createElement(tagName: 'harmony-radio', options?: CreateElementOptions): HTMLHarmonyRadioElement;
export function createElement(tagName: 'harmony-select', options?: CreateElementOptions): HTMLHarmonySelectElement;
export function createElement(tagName: 'harmony-slider', options?: CreateElementOptions): HTMLHarmonySliderElement;
export function createElement(tagName: 'harmony-slideshow', options?: CreateElementOptions): HTMLHarmonySlideshowElement;
export function createElement(tagName: 'harmony-splitter', options?: CreateElementOptions): HTMLHarmonySplitterElement;
export function createElement(tagName: 'harmony-switch', options?: CreateElementOptions): HTMLHarmonySwitchElement;
export function createElement(tagName: 'harmony-tab-group', options?: CreateElementOptions): HTMLHarmonyTabGroupElement;
export function createElement(tagName: 'harmony-tab', options?: CreateElementOptions): HTMLHarmonyTabElement;
export function createElement(tagName: 'harmony-toggle-button', options?: CreateElementOptions): HTMLHarmonyToggleButtonElement;
export function createElement(tagName: 'harmony-tooltip', options?: CreateElementOptions): HTMLHarmonyTooltipElement;
export function createElement(tagName: 'harmony-tree', options?: CreateElementOptions): HTMLHarmonyTreeElement;

export function createElement(tagName: string, options?: CreateElementOptions): HTMLElement;
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

type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export function createShadowRoot(tagName: string, options?: CreateElementOptions, shadowOptions?: PartialBy<ShadowRootInit, 'mode'>): ShadowRoot {
	const element = document.createElement(tagName);
	const shadowRoot = element.attachShadow({
		clonable: shadowOptions?.clonable,
		customElementRegistry: shadowOptions?.customElementRegistry,
		delegatesFocus: shadowOptions?.delegatesFocus,
		mode: shadowOptions?.mode ?? 'closed',
		serializable: shadowOptions?.serializable,
		slotAssignment: shadowOptions?.slotAssignment,
	});
	createElementOptions(element, options, shadowRoot);
	return shadowRoot;
}

export function createShadowRootNS(namespaceURI: string, tagName: string, options?: CreateElementOptions, shadowOptions?: PartialBy<ShadowRootInit, 'mode'>): ShadowRoot {
	const element = document.createElementNS(namespaceURI, tagName);
	const shadowRoot = element.attachShadow({
		clonable: shadowOptions?.clonable,
		customElementRegistry: shadowOptions?.customElementRegistry,
		delegatesFocus: shadowOptions?.delegatesFocus,
		mode: shadowOptions?.mode ?? 'closed',
		serializable: shadowOptions?.serializable,
		slotAssignment: shadowOptions?.slotAssignment,
	});
	createElementOptions(element as HTMLElement, options, shadowRoot);
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

export function updateShadowRoot(shadowRoot: ShadowRoot | undefined, options: CreateElementOptions): ShadowRoot | undefined {
	if (!shadowRoot) {
		return;
	}
	createElementOptions(shadowRoot.host as HTMLElement, options, shadowRoot);
	ET.dispatchEvent(new CustomEvent<ShadowRoot>('updated', { detail: shadowRoot }));
	return shadowRoot;
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
				element.addEventListener(optionName.substring(1), optionValue as EventListener);
				continue;
			}

			if (optionName.startsWith('@')) {
				element.setAttribute(optionName.substring(1), optionValue as string);
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
					if ((element as unknown as HasI18n).setTitleI18n) {
						(element as unknown as HasI18n).setTitleI18n(optionValue as string | I18nDescriptor | null);
					} else {
						AddI18nElement(element, optionValue as string | I18nDescriptor | null);
					}
					break;
				case 'parent':
					(optionValue as Element | ShadowRoot | undefined)?.append(element);
					break;
				case 'after':
					(optionValue as Element | undefined)?.after(element);
					break;
				case 'before':
					(optionValue as Element | undefined)?.before(element);
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
					(shadowRoot ?? element).innerHTML = (optionValue as string) ?? '';
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
					if (optionValue) {
						void adoptStyle(shadowRoot ?? element, optionValue as string);
					}
					break;
				case 'adoptStyles':
					((optionValue as string[]) ?? []).forEach((entry: string) => {
						void adoptStyle(shadowRoot ?? element, entry);
					});
					break;
				case 'adoptStyleSheet':
					if (optionValue) {
						adoptStyleSheet(shadowRoot ?? element, optionValue as CSSStyleSheet);
					}
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
					(getObject('Help') as typeof Help | undefined)?.addElement(element, optionValue as string | I18nDescriptor);
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

export async function adoptStyle(element: HTMLElement | Document | ShadowRoot, cssText: string): Promise<void> {
	const sheet = new CSSStyleSheet;
	await sheet.replace(cssText);
	adoptStyleSheet(element, sheet);
}

export function adoptStyleSheet(element: HTMLElement | Document | ShadowRoot, sheet: CSSStyleSheet): void {
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

export function isVisible(htmlElement: HTMLElement | SVGElement | ShadowRoot | undefined | null): boolean {
	if (!htmlElement) {
		return false;
	}

	if (htmlElement instanceof ShadowRoot) {
		return (htmlElement.host as HTMLElement).style.display == '';
	}

	return htmlElement.style.display == '';
}

export const visible = isVisible;

export function styleInject(css: string): void {
	document.head.append(createElement('style', { textContent: css }));
}

let customElementRegistry: CustomElementRegistry;
export function getCustomElementRegistry(): CustomElementRegistry | undefined {
	if (!customElementRegistry) {
		try {
			// As of writing, firefox doesn't support CustomElementRegistry constructor
			customElementRegistry = new CustomElementRegistry();
		}
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		catch (e) {
			return;
		}
	}
	return customElementRegistry;
}

export function defineElement(name: string, constructor: CustomElementConstructor, options?: ElementDefinitionOptions): void {
	if (window.customElements) {
		if (!customElements.get(name)) {
			customElements.define(name, constructor, options);
		}
	}
	const customRegistry = getCustomElementRegistry();
	if (customRegistry && !customRegistry.get(name)) {
		customRegistry.define(name, constructor, options);
	}
}

export function addRemoveClass(element: HTMLElement | undefined, clas: string, add: boolean): void {
	if (add) {
		element?.classList.add(clas);
	} else {
		element?.classList.remove(clas);
	}
}
