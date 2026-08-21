import { closeSVG } from 'harmony-svg';
import { errorOnce, MyEventTarget } from 'harmony-utils';
import tabCSS from '../css/components/tab.css';
import { shadowRootStyle } from '../harmony-css';
import { addRemoveClass, createElement, display, show } from '../harmony-html';
import { AddI18nElement, I18nDescriptor } from '../harmony-i18n';
import { HasI18n } from '../interfaces/hasi18n';
import { HarmonyComponent } from './component';
import { HarmonyTabGroup } from './tabgroup';

export type HarmonyTabParams = {
	/** Tab title. */
	title?: string;
	/** Internationalized Tab title. */
	titleI18n?: string;
	/** Set the tab disabled. Default to false. */
	disabled?: boolean;
	/** Set the tab closable. Default to false. */
	closable?: boolean;
}

export type HarmonyTabEventData = {
	tab: HarmonyTab;
	originalEvent?: Event;
};

export class HarmonyTab extends MyEventTarget implements HarmonyComponent, HasI18n {
	readonly htmlElement = createElement('div', {
		$click: () => this.#click(),
	});
	#shadowRoot?: ShadowRoot;
	#disabled = false;
	#active = false;
	//#header?: HTMLElement;
	#htmlHeader?: HTMLElement;
	#htmlTitle?: HTMLElement;
	#htmlClose?: HTMLElement;
	#group?: HarmonyTabGroup;
	#closable = false;
	#closed = false;
	content?: HTMLElement;

	constructor(params: HarmonyTabParams = {}) {
		super();
		this.setParams(params);
	}

	setParams(params: HarmonyTabParams): void {

		if (params.title !== undefined) {
			this.setTitle(params.title);
		}

		if (params.titleI18n !== undefined) {
			this.setTitleI18n(params.titleI18n);
		}
	}

	#initHTML(): void {
		if (this.#shadowRoot) {
			return;
		}

		this.#shadowRoot = this.htmlElement.attachShadow({ mode: 'closed' });
		void shadowRootStyle(this.#shadowRoot, tabCSS);

		this.#htmlHeader = createElement('div', {
			class: 'tab',
			parent: this.#shadowRoot,
			childs: [
				this.#htmlTitle = createElement('span',),
				this.#htmlClose = createElement('span', {
					class: 'close',
					innerHTML: closeSVG,
					hidden: !this.#closable,
					$click: (event: Event) => { event.stopPropagation(); this.close() },
				}),
			],
			$click: () => this.#click(),
			$contextmenu: (event: PointerEvent) => this.#onContextMenu(event),
		});
	}

	setTitle(title: string): void {
		this.#initHTML();
		this.#htmlTitle!.innerText = title;
		show(this.#htmlTitle);
	}

	setTitleI18n(i18n: string | I18nDescriptor | null): void {
		this.#initHTML();
		if (typeof i18n === 'string') {
			AddI18nElement(this.#htmlTitle!, i18n);
		} else {
			errorOnce('unhandled type ' + typeof i18n + i18n);
		}
		show(this.#htmlTitle);
	}

	setDisabled(disabled: boolean): void {
		this.#disabled = disabled ? true : false;
		addRemoveClass(this.#htmlHeader, 'disabled', this.#disabled);
	}

	getDisabled(): boolean {
		return this.#disabled;
	}

	activate(): void {
		this.setActive(true);
	}

	close(): boolean {
		if (this.#closed) {
			return false;
		}
		if (!this.dispatchEvent(new CustomEvent<HarmonyTabEventData>('close', { cancelable: true, detail: { tab: this } }))) {
			return false;
		}
		this.#group?.closeTab(this);
		return true;
	}

	setActive(active: boolean): void {
		if (this.#active != active) {
			this.#active = active;
			if (active) {
				this.dispatchEvent(new CustomEvent<HarmonyTabEventData>('activated', { detail: { tab: this } }));
			} else {
				this.dispatchEvent(new CustomEvent<HarmonyTabEventData>('deactivated', { detail: { tab: this } }));
			}
		}
		//display(this.htmlElement, active);
		this.#initHTML();
		addRemoveClass(this.#htmlHeader, 'activated', active);

		if (active && this.#group) {
			this.#group.activateTab(this);
		}
		display(this.content, active);
	}

	isActive(): boolean {
		return this.#active;
	}

	isClosed(): boolean {
		return this.#closed;
	}

	#click(): void {
		if (!this.dispatchEvent(new CustomEvent<HarmonyTabEventData>('click', { cancelable: true, detail: { tab: this } }))) {
			return;
		}

		if (!this.#disabled) {
			this.activate();
		}
	}

	#onContextMenu(event: PointerEvent): void {
		this.dispatchEvent(new CustomEvent<HarmonyTabEventData>('contextmenu', { detail: { tab: this, originalEvent: event } }));
	}

	scrollIntoView(): void {
		this.#initHTML();
		this.#htmlHeader!.scrollIntoView();
	}

	setClosable(closable: boolean): void {
		this.#closable = closable;
		display(this.#htmlClose, closable);
	}

	setGroup(group?: HarmonyTabGroup): void {
		this.#group = group;
	}
}
