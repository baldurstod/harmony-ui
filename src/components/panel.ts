import { errorOnce } from 'harmony-utils';
import panelCSS from '../css/harmony-panel.css';
import { shadowRootStyle } from '../harmony-css';
import { addRemoveClass, createElement, display, hide, show, updateElement, updateShadowRoot } from '../harmony-html';
import { I18n, I18nDescriptor } from '../harmony-i18n';
import { HasI18n } from '../interfaces/hasi18n';
import { HarmonyComponent } from './component';
import { HarmonyTab } from './tab';
import { HarmonyTabGroup } from './tabgroup';

//const dragged = null;
let nextId = 0;
//let spliter: HTMLElement = createElement('div', { class: 'harmony-panel-splitter' }) as HTMLElement;
let highlitPanel: HTMLElement;

const DRAG_THRESHOLD = 15;

type DragMode = 'none' | 'move' | 'resize';

export type HarmonyPanelLayout = 'row' | 'column' | 'tabs';

export type HarmonyPanelParams = {
	/** Define if this panel can be collapsed. Default to true. */
	collapsible?: boolean;
	/** Create this panel collapsed. Default to false. */
	collapsed?: boolean;
	/** Create this panel floating. Default to false. */
	floating?: boolean;
	/** Create this panel closed. Only for floating panels. Default to false. */
	closed?: boolean;
	/** Can this panel be moved. Default to false. */
	movable?: boolean;
	/** Can this panel be a drop target for other panels. Default to false. */
	dropTarget?: boolean;
	/** Panel layout. Default to row. */
	layout?: HarmonyPanelLayout;
	/** Panel title. */
	title?: string;
	/** Internationalized Panel title. */
	titleI18n?: string | I18nDescriptor | null;
	/** Panel size. */
	size?: number;
	/** Add a custom style sheet to the panel. */
	adoptStyleSheet?: CSSStyleSheet,
	/** Add custom style sheets to the panel. */
	adoptStyleSheets?: CSSStyleSheet[],
	/** Add a custom style sheet to the panel. */
	adoptStyle?: string;
	/** Add custom style sheets to the panel. */
	adoptStyles?: string[];
}

export class HarmonyPanel implements HarmonyComponent, HasI18n {
	readonly htmlElement = createElement('div');
	readonly isHarmonyPanel = true as const;
	#doOnce = true;
	#parent = null;
	#size = 1;
	#layout?: HarmonyPanelLayout;
	isMovable = false;
	#collapsible = true;
	#collapsed = false;
	#startClosed = false;
	#dropTarget!: boolean;
	customPanelId = nextId++;
	#htmlHeader?: HTMLElement;
	#htmlTabGroup?: HarmonyTabGroup;
	#htmlContent?: HTMLElement;
	#htmlResize?: HTMLElement;
	#isDummy = false;
	#shadowRoot?: ShadowRoot;
	#headerVisible = false;
	#isDraggable = true;
	#floating = false;
	#floatingWidth?: number;
	#floatingHeight?: number;
	#childPanels = new Set<HarmonyPanel>;
	#title?: string;
	#titleI18n?: string | I18nDescriptor | null;
	#parentTab?: HarmonyTab;
	static #dragMode = 'none';
	static #resizeX = 0;
	static #resizeY = 0;
	static #dragging = false;
	static #draggedPanel?: HarmonyPanel;
	static #deltaX = 0;
	static #deltaY = 0;
	static #startClientX = 0;
	static #startClientY = 0;
	static #mouseDown = false;
	static #panels = new Set<HarmonyPanel>;
	static #target: HarmonyPanel | null = null;
	static #startRect?: DOMRect;

	static {
		document.addEventListener('mousedown', (event: Event) => HarmonyPanel.#handleDocumentMouseDown(event as MouseEvent));
		document.addEventListener('mousemove', (event: Event) => HarmonyPanel.#handleDocumentMouseMove(event as MouseEvent));
		document.addEventListener('mouseup', (event: Event) => HarmonyPanel.#handleDocumentMouseUp(event as MouseEvent));
	}

	constructor(params: HarmonyPanelParams = {}) {
		HarmonyPanel.#panels.add(this);
		this.setParams(params);
	}

	setParams(params: HarmonyPanelParams): void {
		this.#startClosed = params.closed ?? false;
		this.setCollapsible(params.collapsible ?? true);
		this.setCollapsed(params.collapsed ?? false);
		this.isMovable = params.movable ?? false;
		this.#dropTarget = params.dropTarget ?? false;
		this.setLayout(params.layout ?? 'row');
		if (params.floating) {
			this.setFloating();
			// If we start in floating mode, force a the presence of a header
			this.getHeader();
		}

		if (params.size !== undefined) {
			this.setSize(params.size);
		}

		if (params.title !== undefined) {
			this.setTitle(params.title);
		}

		if (params.titleI18n !== undefined) {
			this.setTitleI18n(params.titleI18n);
		}

		if (params.adoptStyle || params.adoptStyles || params.adoptStyleSheet || params.adoptStyleSheets) {
			this.#initHTML();
			updateShadowRoot(this.#shadowRoot!, {
				adoptStyle: params.adoptStyle,
				adoptStyles: params.adoptStyles,
				adoptStyleSheet: params.adoptStyleSheet,
				adoptStyleSheets: params.adoptStyleSheets,
			});
		}
	}

	#initHTML(): void {
		if (this.#shadowRoot) {
			return;
		}

		this.#shadowRoot = this.htmlElement.attachShadow({ mode: 'closed' });
		I18n.observeElement(this.#shadowRoot);
		void shadowRootStyle(this.#shadowRoot, panelCSS);
		this.#htmlContent = createElement('div', {
			class: 'content',
			parent: this.#shadowRoot,
		});
		display(this.#shadowRoot.host as HTMLElement, !this.#startClosed);
		this.#htmlResize = createElement('div', {
			class: 'resize',
			parent: this.#shadowRoot,
			childs: [
				createElement('div', { class: 'side top', $mousedown: (event: MouseEvent) => this.#startResize(event, 0, -1) }),
				createElement('div', { class: 'side right', $mousedown: (event: MouseEvent) => this.#startResize(event, 1, 0) }),
				createElement('div', { class: 'side bottom', $mousedown: (event: MouseEvent) => this.#startResize(event, 0, 1) }),
				createElement('div', { class: 'side left', $mousedown: (event: MouseEvent) => this.#startResize(event, -1, 0) }),

				createElement('div', { class: 'corner top_right', $mousedown: (event: MouseEvent) => this.#startResize(event, 1, -1) }),
				createElement('div', { class: 'corner bottom_right', $mousedown: (event: MouseEvent) => this.#startResize(event, 1, 1) }),
				createElement('div', { class: 'corner bottom_left', $mousedown: (event: MouseEvent) => this.#startResize(event, -1, 1) }),
				createElement('div', { class: 'corner top_left', $mousedown: (event: MouseEvent) => this.#startResize(event, -1, -1) }),
			],
			$mousedown: (event: Event) => this.#handleMouseDown(event as MouseEvent),
		});
	}

	getHeader(): HTMLElement {
		this.#initHTML();

		if (!this.#htmlHeader) {
			this.#htmlHeader = createElement('div', {
				class: 'header',
				$dblclick: () => this.#toggleCollapse(),
				$mousedown: (event: Event) => this.#handleMouseDown(event as MouseEvent),
			});
		}
		this.#shadowRoot!.prepend(this.#htmlHeader);

		return this.#htmlHeader;
	}

	getContent(): HTMLElement {
		this.#initHTML();
		return this.#htmlContent!;
	}

	append(...nodes: (Node | string | HarmonyComponent)[]): void {
		this.#initHTML();
		for (const node of nodes) {

			const htmlElement = (node as HarmonyComponent).htmlElement;
			if (htmlElement) {
				if ((node as HarmonyPanel).isHarmonyPanel) {
					this.#childPanels.add((node as HarmonyPanel));
					if (this.#layout === 'tabs') {
						this.#addTab((node as HarmonyPanel));
					}
				}
				this.#htmlContent!.append(htmlElement);
			} else {
				// eslint-disable-next-line prefer-rest-params
				this.#htmlContent!.append(node as Node | string);
			}
		}
	}

	prepend(...nodes: (Node | string | HarmonyComponent)[]): void {
		this.#initHTML();
		for (const node of nodes) {

			const htmlElement = (node as HarmonyComponent).htmlElement;
			if (htmlElement) {
				if ((node as HarmonyPanel).isHarmonyPanel) {
					this.#childPanels.add((node as HarmonyPanel));
					if (this.#layout === 'tabs') {
						this.#addTab((node as HarmonyPanel));
					}
				}
				this.#htmlContent!.prepend(htmlElement);
			} else {
				// eslint-disable-next-line prefer-rest-params
				this.#htmlContent!.prepend(node as Node | string);
			}
		}
	}
	/*
		appendChild(child: HTMLElement) {
			this.htmlContent.appendChild(child);
		}
	*/

	/*
	get innerHTML(): string {
		return this.#htmlContent.innerHTML;
	}

	set innerHTML(innerHTML) {
		this.#htmlContent.innerHTML = innerHTML;
	}
	*/

	/*
	attributeChangedCallback(name: string, oldValue: string, newValue: string): void {
		if (oldValue == newValue) {
			return;
		}

		switch (name) {
			case 'panel-direction':
				this.#direction = newValue;
				break;
			case 'panel-size':
				this.size = Number(newValue);
				break;
			case 'is-movable':
				this.isMovable = toBool(newValue);
				break;
			case 'collapsible':
				this.collapsible = toBool(newValue);
				break;
			case 'collapsed':
				this.collapsed = toBool(newValue);
				break;
			case 'title':
				this.setTitle(newValue);
				break;
			case 'has-header':
				this.hasHeader = toBool(newValue);
				break;
			case 'draggable':
				this.#isDraggable = toBool(newValue);
				this.#htmlHeader.setAttribute('draggable', newValue);
				break;
			case 'hidden-title':
				if (toBool(newValue)) {
					this.#htmlHeader.classList.add('hidden');
				} else {
					this.#htmlHeader.classList.remove('hidden');
				}
				break;
		}
	}
	*/
	/*
	static get observedAttributes(): string[] {
		return ['panel-direction', 'panel-size', 'is-movable', 'title', 'collapsible', 'collapsed', 'has-header', 'draggable', 'hidden-title'];
	}
	*/
	/*
		_handleDragStart(event) {
			if (this._isMovable == false) {
				event.preventDefault();
				return;
			}
			event.stopPropagation();
			event.dataTransfer.setData('text/plain', null);
			dragged = event.target;
		}

		_handleDragOver(event) {
			if (this._isContainer != false) {
				event.preventDefault();
			}
			event.stopPropagation();
		}

		_handleDrop(event) {
			if (this._isContainer != false) {
				event.stopPropagation();
				event.preventDefault();
				if (dragged) {
					if (this != dragged) {
						this._addChild(dragged, event.offsetX, event.offsetY);
						//OptionsManager.setItem('app.layout.disposition', HTMLHarmonyPanelElement.saveDisposition());
					}
				}
			}
			dragged = null;
		}

		_handleMouseEnter(event) {
			//console.error(this, event);
			//clearInterval(HTMLHarmonyPanelElement._interval);
			//HTMLHarmonyPanelElement._interval = setInterval(event => this.style.opacity = (Math.floor(new Date().getTime() / 500) % 2) / 2 + 0.5, 100);
			//event.stopPropagation();
		}

		_handleMouseMove(event) {
			const delta = 5;
			//console.error(event.offsetX, event.offsetY);
			//this.style.opacity = (Math.floor(new Date().getTime() / 1000) % 2);
			//HTMLHarmonyPanelElement.highlitPanel = this;
			event.stopPropagation();
			if (event.offsetX < delta || event.offsetY < delta) {
				HTMLHarmonyPanelElement.highlitPanel = this;
				this.parentNode.insertBefore(HTMLHarmonyPanelElement._spliter, this);
			} else if ((this.offsetWidth - event.offsetX) < delta || (this.offsetHeight - event.offsetY) < delta) {
				HTMLHarmonyPanelElement.highlitPanel = this;
				this.parentNode.insertBefore(HTMLHarmonyPanelElement._spliter, this.nextSibling);
			} else {
				HTMLHarmonyPanelElement.highlitPanel = null;
			}

		}

		_handleMouseLeave(event) {
			//console.error(this, event);
			//clearInterval(HTMLHarmonyPanelElement._interval);
		}
			*/

	static set highlitPanel(panel: HTMLElement) {
		if (highlitPanel) {
			highlitPanel.style.filter = '';
		}
		highlitPanel = panel;
		if (highlitPanel) {
			highlitPanel.style.filter = 'grayscale(80%)';///'contrast(200%)';
		}
	}
	/*
		_addChild(child, x, y) {
			let percent = 0.2;
			let percent2 = 0.8;
			let height = this.clientHeight;
			let width = this.clientWidth;

			if (this._direction == undefined) {
				if (x <= width * percent) {
					this.prepend(dragged);
					this.direction = 'row';
				}
				if (x >= width * percent2) {
					this.append(dragged);
					this.direction = 'row';
				}
				if (y <= height * percent) {
					this.prepend(dragged);
					this.direction = 'column';
				}
				if (y >= height * percent2) {
					this.append(dragged);
					this.direction = 'column';
				}
			} else if (this._direction == 'row') {
				if (x <= width * percent) {
					this.prepend(dragged);
				}
				if (x >= width * percent2) {
					this.append(dragged);
				}
				if (y <= height * percent) {
					this._split(dragged, true, 'column');
				}
				if (y >= height * percent2) {
					this._split(dragged, false, 'column');
				}
			} else if (this._direction == 'column') {
				if (x <= width * percent) {
					this._split(dragged, true, 'row');
				}
				if (x >= width * percent2) {
					this._split(dragged, false, 'row');
				}
				if (y <= height * percent) {
					this.prepend(dragged);
				}
				if (y >= height * percent2) {
					this.append(dragged);
				}
			}
		}*/

	/*
		_split(newNode, before, direction) {
			let panel = HTMLHarmonyPanelElement._createDummy();//document.createElement('harmony-panel');
			/*panel.id = HTMLHarmonyPanelElement.nextId;
			panel._isDummy = true;
			panel.classList.add('dummy');* /
			panel.size = this.size;
			this.style.flex = this.style.flex;
			this.after(panel);
			if (before) {
				panel.append(newNode);
				panel.append(this);
			} else {
				panel.append(this);
				panel.append(newNode);
			}
			panel.direction = direction;
		}
	*/
	/*
		static _createDummy() {
			let dummy = document.createElement('harmony-panel');
			dummy.id = HTMLHarmonyPanelElement.#nextId;
			dummy._isDummy = true;
			dummy.classList.add('dummy');
			return dummy;
		}
	*/
	/*
		_addPanel(panel) {
			this._panels.add(panel);
		}

		_removePanel(panel) {
			this._panels.delete(panel);
			if (this._isDummy) {
				if (this._panels.size == 0) {
					this.remove();
				} else if (this._panels.size == 1) {
					this.after(this._panels.values().next().value);
					this.remove();
				}
			}
		}
	*/
	/*
		set active(active) {
			if (this._active != active) {
				this.dispatchEvent(new CustomEvent('activated'));
			}
			this._active = active;
			this.style.display = active ? '' : 'none';
			if (active) {
				this._header.classList.add('activated');
			} else {
				this._header.classList.remove('activated');
			}
		}
		*/
	/*
		_click() {
			this.active = true;
			if (this._group) {
				this._group.active = this;
			}
		}
	*/
	setLayout(layout?: HarmonyPanelLayout): void {
		this.#layout = layout;
		this.htmlElement.classList.remove('harmony-panel-row');
		this.htmlElement.classList.remove('harmony-panel-column');

		if (layout) {
			this.htmlElement.classList.add(`harmony-panel-${layout}`);
		}

		if (layout === 'tabs') {
			for (const panel of this.#childPanels) {
				this.#addTab(panel);
			}
		} else {
			hide(this.#htmlTabGroup?.htmlElement);
		}
	}

	#addTab(panel: HarmonyPanel): void {
		if (!this.#htmlTabGroup) {
			this.#initHTML();
			this.#htmlTabGroup = new HarmonyTabGroup();
			this.#htmlContent!.before(this.#htmlTabGroup.htmlElement);
		}
		const tab = new HarmonyTab({
			title: panel.#title,
			titleI18n: panel.#titleI18n,
			content: panel.htmlElement,
			draggable: true,
			panel,
		});
		this.#htmlTabGroup!.addTab(tab);
		//tab.activate();
		panel.#parentTab = tab;
	}

	getLayout(): HarmonyPanelLayout | undefined {
		return this.#layout;
	}

	setSize(size: number): void {
		/*if (size === undefined) {
			return;
		}*/
		this.#size = size;
		//this.style.flexBasis = size;
		this.htmlElement.style.flex = String(size);
	}

	getSize(): number {
		return this.#size;
	}

	setCollapsible(collapsible: boolean): void {
		this.#collapsible = collapsible;
		//this.htmlElement.setAttribute('collapsible', String(this.#collapsible ? 1 : 0));
		addRemoveClass(this.htmlElement, 'collapsible', collapsible);
	}

	setCollapsed(collapsed: boolean): void {
		this.#collapsed = collapsed && this.#collapsible;
		//this.htmlElement.setAttribute('collapsed', String(this.#isCollapsed ? 1 : 0));
		addRemoveClass(this.htmlElement, 'collapsed', this.#collapsed);
		if (this.#collapsed) {
			this.collapse();
		} else {
			this.expand();
		}
	}

	displayHeader(visible: boolean) {
		this.#headerVisible = visible;

		display(this.#htmlHeader, visible);
	}

	headerVisible(): boolean {
		return this.#headerVisible;
	}

	collapse(): void {
		hide(this.#htmlContent);
		this.#collapsed = true;
	}

	expand(): void {
		show(this.#htmlContent);
		this.#collapsed = false;
	}

	setTitle(title: string): void {
		this.#title = title;
		const header = this.getHeader();
		header.innerText = title;
		show(header);
		/*
		if (title) {
			//this.#htmlTitle = this.#htmlTitle ?? document.createElement('div');
			super.prepend(this.#htmlTitle);
		} else {
			this.#htmlTitle.remove();
		}
		*/
	}

	setTitleI18n(i18n: string | I18nDescriptor | null): void {
		this.#titleI18n = i18n;
		if (typeof i18n === 'string') {
			updateElement(this.getHeader(), {
				i18n,
			});
		} else {
			errorOnce('unhandled type ' + typeof i18n + i18n);
		}
		show(this.#htmlHeader);
	}

	#toggleCollapse(): void {
		this.setCollapsed(!this.#collapsed);
	}

	/*
	static getNextId(): string {
		return `harmony-panel-dummy-${++nextId}`;
	}
	*/

	/*
	static saveDisposition(): JSONObject {
		const list = document.getElementsByTagName('harmony-panel');
		const json: { panels: Record<string, any>, dummies: any[] } = { panels: {}, dummies: [] };
		for (const panel of list) {
			if (panel.id && panel.parentElement && panel.parentElement.id && panel.parentElement.tagName == 'HARMONY-PANEL') {
				json.panels[(panel as any).id] = { parent: panel.parentElement.id, size: (panel as any).size, direction: (panel as any).direction };
				if ((panel as HTMLHarmonyPanelElement).#isDummy) {
					json.dummies.push((panel as any).id);
				}
			}
		}
		return json;
	}
	*/

	/*
	static restoreDisposition(json: Record<string, any>): void {
		return;
		/*
		if (!json || !json.dummies || !json.panels) { return; }

		let dummiesList = new Map();
		for (let oldDummy of json.dummies) {
			let newDummy = HTMLHarmonyPanelElement._createDummy();
			document.body.append(newDummy);
			dummiesList.set(oldDummy, newDummy.id);
		}

		let list = document.getElementsByTagName('harmony-panel');
		for (let panel of list) {
			if (panel.id) {
				let p = json.panels[panel.id];
				if (p) {
					if (p.size != 1 || panel._isDummy) {
						panel.size = p.size;
					}
					panel.direction = p.direction;
					let newParentId = dummiesList.get(p.parent) || p.parent;
					if (p && newParentId) {
						let parent = document.getElementById(newParentId);
						/*if (!parent && p.dummy) {
							parent = document.createElement('harmony-panel');
						}* /
						if (parent) {
							parent.append(panel);
						} else {
							console.error('no parent', panel, newParentId);
						}
					}
				}
			}
		}* /
	}
	*/

	adoptStyleSheet(styleSheet: CSSStyleSheet): void {
		this.#initHTML();
		this.#shadowRoot!.adoptedStyleSheets.push(styleSheet);
	}

	#handleMouseDown(event: MouseEvent): void {
		if (this.#isDraggable && event.button === 0) {
			HarmonyPanel.#draggedPanel = this;
		}
	}

	#startDrag(): void {
		if (HarmonyPanel.#dragging) {
			return;
		}
		HarmonyPanel.#dragging = true;
		HarmonyPanel.#dragMode = 'move';

		if (this.#parentTab) {
			this.#parentTab.close();
			this.#parentTab = undefined;
		}

		const rect = this.htmlElement.getBoundingClientRect();
		this.setFloating();

		this.#floatingWidth = this.#floatingWidth ?? rect.width;
		this.#floatingHeight = this.#floatingHeight ?? rect.height;

		this.htmlElement.style.left = `${rect.x}px`;
		this.htmlElement.style.top = `${rect.y}px`;
		this.htmlElement.style.width = `${this.#floatingWidth}px`;
		this.htmlElement.style.height = `${this.#floatingHeight}px`;
		this.htmlElement.style.position = 'absolute';

		HarmonyPanel.#deltaX = rect.x - HarmonyPanel.#startClientX;
		HarmonyPanel.#deltaY = rect.y - HarmonyPanel.#startClientY;
	}

	setFloating(): void {
		document.body.append(this.htmlElement);
		this.#floating = true;
		this.htmlElement.classList.add('floating');
		this.htmlElement.classList.remove('docked');

		this.htmlElement.style.left = `25%`;
		this.htmlElement.style.top = `25%`;
		this.htmlElement.style.width = `50%`;
		this.htmlElement.style.height = `50%`;
		this.htmlElement.style.position = 'absolute';
	}

	setDocked(parentPanel: HarmonyPanel): void {
		parentPanel.append(this);
		this.#floating = false;
		this.htmlElement.classList.remove('floating');
		this.htmlElement.classList.add('docked');

		// Reset styles used during drag
		this.htmlElement.style.left = '';
		this.htmlElement.style.top = '';
		this.htmlElement.style.width = '';
		this.htmlElement.style.height = '';
		this.htmlElement.style.position = '';
		this.htmlElement.style.flex = '';
	}

	#drag(event: MouseEvent): void {
		if (!HarmonyPanel.#dragging) {
			return;
		}

		this.htmlElement.style.left = `${(event as MouseEvent).clientX + HarmonyPanel.#deltaX}px`;
		this.htmlElement.style.top = `${(event as MouseEvent).clientY + HarmonyPanel.#deltaY}px`;

		if (event.ctrlKey) {
			HarmonyPanel.#setTarget(null);
		} else {
			const panel = this.#getDropTargetAtMousePosition(event);
			HarmonyPanel.#setTarget(panel);
		}
	}

	#stopDrag(): void {
		HarmonyPanel.#dragging = false;
		HarmonyPanel.#dragMode = 'none';
		if (HarmonyPanel.#target) {
			this.setDocked(HarmonyPanel.#target);
		}
	}

	#resize(event: MouseEvent): void {
		if (HarmonyPanel.#dragMode !== 'resize' || !HarmonyPanel.#startRect) {
			return;
		}

		const deltaX = (event as MouseEvent).clientX - HarmonyPanel.#startClientX;
		const deltaY = (event as MouseEvent).clientY - HarmonyPanel.#startClientY;

		const rect = HarmonyPanel.#startRect;

		let deltaTop = 0, deltaWidth = 0, deltaHeight = 0, deltaLeft = 0;

		switch (HarmonyPanel.#resizeX) {
			case -1:
				deltaLeft += deltaX;
				deltaWidth -= deltaX;

				break;
			case 1:
				deltaWidth += deltaX;
				break;
		}

		switch (HarmonyPanel.#resizeY) {
			case -1:
				deltaTop += deltaY;
				deltaHeight -= deltaY;
				break;
			case 1:
				deltaHeight += deltaY;
				break;
		}


		this.#floatingWidth = rect.width + deltaWidth;
		this.#floatingHeight = rect.height + deltaHeight;

		this.htmlElement.style.left = `${rect.x + deltaLeft}px`;
		this.htmlElement.style.top = `${rect.y + deltaTop}px`;
		this.htmlElement.style.width = `${this.#floatingWidth}px`;
		this.htmlElement.style.height = `${this.#floatingHeight}px`;
	}

	#stopResize(): void {
		HarmonyPanel.#dragging = false;
		HarmonyPanel.#dragMode = 'none';
	}

	static #setTarget(target: HarmonyPanel | null): void {
		if (this.#target) {
			this.#target.#htmlHeader?.classList.remove('target');
			this.#target.#htmlContent?.classList.remove('target');
		}

		if (target) {
			target.#htmlHeader?.classList.add('target');
			target.#htmlContent?.classList.add('target');
		}
		this.#target = target;
	}

	static #handleDocumentMouseMove(event: MouseEvent): void {
		if (!this.#mouseDown || !this.#draggedPanel) {
			return;
		}

		switch (HarmonyPanel.#dragMode) {
			case 'none':

				const deltaX = (event as MouseEvent).clientX - this.#startClientX;
				const deltaY = (event as MouseEvent).clientY - this.#startClientY;

				if (deltaX * deltaX + deltaY * deltaY > DRAG_THRESHOLD) {
					this.#draggedPanel.#startDrag();
				}

				break;
			case 'move':
				this.#draggedPanel.#drag(event);
				break;
			case 'resize':
				this.#draggedPanel.#resize(event);
				break;
		}

	}

	static #handleDocumentMouseDown(event: MouseEvent): void {
		this.#mouseDown = true;

		this.#startClientX = (event as MouseEvent).clientX;
		this.#startClientY = (event as MouseEvent).clientY;
	}

	static #handleDocumentMouseUp(event: MouseEvent): void {
		this.#mouseDown = false;
		HarmonyPanel.#dragging = false;
		HarmonyPanel.#dragMode = 'none';

		if (this.#draggedPanel) {
			this.#draggedPanel.#stopDrag();
			this.#draggedPanel.#stopResize();
		}

		this.#draggedPanel = undefined;
		this.#setTarget(null);
	}

	#getDropTargetAtMousePosition(event: MouseEvent): HarmonyPanel | null {
		let best: HarmonyPanel | null = null;
		let bestRect: DOMRect | undefined;
		for (const panel of HarmonyPanel.#panels) {
			if (panel === this || !panel.htmlElement.isConnected || !panel.#dropTarget) {
				continue;
			}

			const rect = panel.htmlElement.getBoundingClientRect();
			if (event.clientX >= rect.left
				&& event.clientX < rect.right
				&& event.clientY >= rect.top
				&& event.clientY < rect.bottom
			) {
				if (!best ||
					(bestRect!.left <= rect.left
						&& bestRect!.right >= rect.right
						&& bestRect!.top <= rect.top
						&& bestRect!.bottom >= rect.bottom
					)
				) {
					best = panel;
					bestRect = rect;
				}
			}
		}
		return best;
	}

	#startResize(event: MouseEvent, x: number, y: number): void {
		if (HarmonyPanel.#dragMode !== 'none') {
			return;
		}

		HarmonyPanel.#dragMode = 'resize';
		HarmonyPanel.#resizeX = x;
		HarmonyPanel.#resizeY = y;

		HarmonyPanel.#startRect = this.htmlElement.getBoundingClientRect();
	}

	activate(): void {
		this.#parentTab?.activate();
	}

	open(): void {
		show(this.getContent());
	}

	close(): void {
		if (this.#htmlContent) {
			hide(this.#htmlContent);
		}
	}
}
