import panelCSS from '../css/harmony-panel.css';
import { shadowRootStyle } from '../harmony-css';
import { createElement, defineElement, display, hide, show } from '../harmony-html';
import { AddI18nElement as addI18nElement } from '../harmony-i18n';
import { toBool } from '../utils/attributes';
import { injectGlobalCss } from '../utils/globalcss';

//const dragged = null;
let nextId = 0;
//let spliter: HTMLElement = createElement('div', { class: 'harmony-panel-splitter' }) as HTMLElement;
let highlitPanel: HTMLElement;

const DRAG_THRESHOLD = 15;

enum DragMode {
	None,
	Move,
	Resize,
}

export class HTMLHarmonyPanelElement extends HTMLElement {
	#doOnce = true;
	#parent = null;
	#size = 1;
	#direction = 'undefined';
	#isMovable = false;
	#isCollapsible = true;
	#isCollapsed = false;
	customPanelId = nextId++;
	readonly #htmlHeader: HTMLElement;
	readonly #htmlContent: HTMLElement;
	readonly #htmlResize: HTMLElement;
	#isDummy = false;
	#shadowRoot: ShadowRoot;
	#hasHeader = true;
	#isDraggable = true;
	#floating = false;
	static #dragMode = DragMode.None;
	static #resizeX = 0;
	static #resizeY = 0;
	static #dragging = false;
	static #draggedPanel?: HTMLHarmonyPanelElement;
	static #deltaX = 0;
	static #deltaY = 0;
	static #startClientX = 0;
	static #startClientY = 0;
	static #mouseDown = false;
	static #panels = new Set<HTMLHarmonyPanelElement>;
	static #target: HTMLHarmonyPanelElement | null = null;
	static #startRect?: DOMRect;

	static {
		document.addEventListener('mousedown', (event: Event) => HTMLHarmonyPanelElement.#handleDocumentMouseDown(event as MouseEvent));
		document.addEventListener('mousemove', (event: Event) => HTMLHarmonyPanelElement.#handleDocumentMouseMove(event as MouseEvent));
		document.addEventListener('mouseup', (event: Event) => HTMLHarmonyPanelElement.#handleDocumentMouseUp(event as MouseEvent));
	}

	constructor() {
		super();
		HTMLHarmonyPanelElement.#panels.add(this);
		this.#shadowRoot = this.attachShadow({ mode: 'closed' });
		void shadowRootStyle(this.#shadowRoot, panelCSS);

		this.#htmlHeader = createElement('div', {
			class: 'header',
			parent: this.#shadowRoot,
			$dblclick: () => this.#toggleCollapse(),
			$mousedown: (event: Event) => this.#handleMouseDown(event as MouseEvent),
		});
		this.#htmlContent = createElement('div', {
			class: 'content',
			parent: this.#shadowRoot,
		});
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

	connectedCallback(): void {
		if (this.#doOnce) {
			//this.append(...this.childNodes);
			this.#doOnce = false;
		}

		//super.append(this.#htmlTitle);
		//super.append(this.#htmlContent);

		//let parentElement = this.parentElement;

		/*if (this._parent && (this._parent != parentElement)) {
			this._parent._removePanel(this);
		}

		if (parentElement && parentElement.tagName == 'HARMONY-PANEL') {
			parentElement._addPanel(this);
			this._parent = parentElement;
		}*/

		/*if (!this._firstTime) {
			this._firstTime = true;
			//this.style.backgroundColor = `rgb(${255*Math.random()},${255*Math.random()},${255*Math.random()})`;
			//this.append(this.CustomPanelId);
			this.title = this.CustomPanelId;
			this.direction = this._direction;
			//this.size = this._size;
			//this.draggable = true;
		}*/
	}

	append(...nodes: (Node | string)[]): void {
		// eslint-disable-next-line prefer-rest-params
		this.#htmlContent.append(...nodes);
	}

	prepend(...nodes: (Node | string)[]): void {
		// eslint-disable-next-line prefer-rest-params
		this.#htmlContent.prepend(...nodes);
	}
	/*
		appendChild(child: HTMLElement) {
			this.htmlContent.appendChild(child);
		}
	*/

	get innerHTML(): string {
		return this.#htmlContent.innerHTML;
	}

	set innerHTML(innerHTML) {
		this.#htmlContent.innerHTML = innerHTML;
	}

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
			case 'title-i18n':
				this.setTitleI18n(newValue);
				break;
			case 'has-header':
				this.hasHeader = toBool(newValue);
				break;
			case 'draggable':
				this.#isDraggable = toBool(newValue);
				this.#htmlHeader.setAttribute('draggable', newValue);
				break;
		}
	}

	static get observedAttributes(): string[] {
		return ['panel-direction', 'panel-size', 'is-movable', 'title', 'title-i18n', 'collapsible', 'collapsed', 'has-header', 'draggable'];
	}
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
	set direction(direction) {
		this.#direction = direction;
		this.classList.remove('harmony-panel-row');
		this.classList.remove('harmony-panel-column');
		if (direction == 'row') {
			this.classList.add('harmony-panel-row');
		} else if (direction == 'column') {
			this.classList.add('harmony-panel-column');
		}
	}

	get direction(): string {
		return this.#direction;
	}

	set size(size) {
		/*if (size === undefined) {
			return;
		}*/
		this.#size = size;
		//this.style.flexBasis = size;
		this.style.flex = String(size);
	}

	get size(): number {
		return this.#size;
	}

	set isMovable(isMovable: boolean) {
		this.#isMovable = isMovable;
	}

	set collapsible(collapsible: boolean) {
		this.#isCollapsible = collapsible;
		this.setAttribute('collapsible', String(this.#isCollapsible ? 1 : 0));
	}

	set collapsed(collapsed: boolean) {
		this.#isCollapsed = (collapsed == true) ? this.#isCollapsible : false;
		this.setAttribute('collapsed', String(this.#isCollapsed ? 1 : 0));
		if (this.#isCollapsed) {
			this.collapse();
		} else {
			this.expand();
		}
	}

	set hasHeader(hasHeader: boolean) {
		this.#hasHeader = hasHeader;

		display(this.#htmlHeader, hasHeader);
	}

	get hasHeader(): boolean {
		return this.#hasHeader;
	}

	collapse(): void {
		hide(this.#htmlContent);
		this.#isCollapsed = true;
	}

	expand(): void {
		show(this.#htmlContent);
		this.#isCollapsed = false;
	}

	setTitle(title: string): void {
		this.#htmlHeader.innerText = title;
		/*
		if (title) {
			//this.#htmlTitle = this.#htmlTitle ?? document.createElement('div');
			super.prepend(this.#htmlTitle);
		} else {
			this.#htmlTitle.remove();
		}
		*/
	}

	setTitleI18n(titleI18n: string): void {
		addI18nElement(this.#htmlHeader, titleI18n);
		this.title = titleI18n;
	}

	#toggleCollapse(): void {
		this.collapsed = !this.#isCollapsed;
	}


	static get nextId(): string {
		return `harmony-panel-dummy-${++nextId}`;
	}

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
		this.#shadowRoot.adoptedStyleSheets.push(styleSheet);
	}

	#handleMouseDown(event: MouseEvent): void {
		if (this.#isDraggable && event.button === 0) {
			HTMLHarmonyPanelElement.#draggedPanel = this;
		}
	}

	#startDrag(): void {
		if (HTMLHarmonyPanelElement.#dragging) {
			return;
		}
		HTMLHarmonyPanelElement.#dragging = true;
		HTMLHarmonyPanelElement.#dragMode = DragMode.Move;

		const rect = this.getBoundingClientRect();
		document.body.append(this);
		this.setFloating();

		this.style.left = `${rect.x}px`;
		this.style.top = `${rect.y}px`;
		this.style.width = `${rect.width}px`;
		this.style.height = `${rect.height}px`;
		this.style.position = 'absolute';

		HTMLHarmonyPanelElement.#deltaX = rect.x - HTMLHarmonyPanelElement.#startClientX;
		HTMLHarmonyPanelElement.#deltaY = rect.y - HTMLHarmonyPanelElement.#startClientY;
	}

	setFloating(): void {
		this.#floating = true;
		this.classList.add('floating');
		this.classList.remove('docked');
	}

	setDocked(): void {
		this.#floating = false;
		this.classList.remove('floating');
		this.classList.add('docked');
	}

	#drag(event: MouseEvent): void {
		if (!HTMLHarmonyPanelElement.#dragging) {
			return;
		}

		this.style.left = `${(event as MouseEvent).clientX + HTMLHarmonyPanelElement.#deltaX}px`;
		this.style.top = `${(event as MouseEvent).clientY + HTMLHarmonyPanelElement.#deltaY}px`;

		if (event.ctrlKey) {
			HTMLHarmonyPanelElement.#setTarget(null);
		} else {
			const panel = this.#getPanelAtMousePosition(event);
			HTMLHarmonyPanelElement.#setTarget(panel);
		}
	}

	#stopDrag(): void {
		HTMLHarmonyPanelElement.#dragging = false;
		HTMLHarmonyPanelElement.#dragMode = DragMode.None;
		if (HTMLHarmonyPanelElement.#target) {
			HTMLHarmonyPanelElement.#target.append(this);
			this.setDocked();
			this.style = '';
		}
	}

	#resize(event: MouseEvent): void {
		if (HTMLHarmonyPanelElement.#dragMode !== DragMode.Resize || !HTMLHarmonyPanelElement.#startRect) {
			return;
		}

		const deltaX = (event as MouseEvent).clientX - HTMLHarmonyPanelElement.#startClientX;
		const deltaY = (event as MouseEvent).clientY - HTMLHarmonyPanelElement.#startClientY;

		const rect = HTMLHarmonyPanelElement.#startRect;

		let deltaTop = 0, deltaWidth = 0, deltaHeight = 0, deltaLeft = 0;

		switch (HTMLHarmonyPanelElement.#resizeX) {
			case -1:
				deltaLeft += deltaX;
				deltaWidth -= deltaX;

				break;
			case 1:
				deltaWidth += deltaX;
				break;
		}

		switch (HTMLHarmonyPanelElement.#resizeY) {
			case -1:
				deltaTop += deltaY;
				deltaHeight -= deltaY;
				break;
			case 1:
				deltaHeight += deltaY;
				break;
		}

		this.style.left = `${rect.x + deltaLeft}px`;
		this.style.top = `${rect.y + deltaTop}px`;
		this.style.width = `${rect.width + deltaWidth}px`;
		this.style.height = `${rect.height + deltaHeight}px`;

	}

	#stopResize(): void {
		HTMLHarmonyPanelElement.#dragging = false;
		HTMLHarmonyPanelElement.#dragMode = DragMode.None;
	}

	static #setTarget(target: HTMLHarmonyPanelElement | null): void {
		if (this.#target) {
			this.#target.#htmlHeader.classList.remove('target');
			this.#target.#htmlContent.classList.remove('target');
		}

		if (target) {
			target.#htmlHeader.classList.add('target');
			target.#htmlContent.classList.add('target');
		}
		this.#target = target;
	}

	static #handleDocumentMouseMove(event: MouseEvent): void {
		if (!this.#mouseDown || !this.#draggedPanel) {
			return;
		}

		switch (HTMLHarmonyPanelElement.#dragMode) {
			case DragMode.None:

				const deltaX = (event as MouseEvent).clientX - this.#startClientX;
				const deltaY = (event as MouseEvent).clientY - this.#startClientY;

				if (deltaX * deltaX + deltaY * deltaY > DRAG_THRESHOLD) {
					this.#draggedPanel.#startDrag();
				}

				break;
			case DragMode.Move:
				this.#draggedPanel.#drag(event);
				break;
			case DragMode.Resize:
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
		HTMLHarmonyPanelElement.#dragging = false;
		HTMLHarmonyPanelElement.#dragMode = DragMode.None;

		if (this.#draggedPanel) {
			this.#draggedPanel.#stopDrag();
			this.#draggedPanel.#stopResize();
		}

		this.#draggedPanel = undefined;
		this.#setTarget(null);
	}

	#getPanelAtMousePosition(event: MouseEvent): HTMLHarmonyPanelElement | null {
		for (const panel of HTMLHarmonyPanelElement.#panels) {
			if (panel === this || !panel.isConnected) {
				continue;
			}

			const rect = panel.getBoundingClientRect();
			if (event.clientX >= rect.left
				&& event.clientX < rect.right
				&& event.clientY >= rect.top
				&& event.clientY < rect.bottom
			) {
				return panel;
			}
		}
		return null;
	}

	#startResize(event: MouseEvent, x: number, y: number): void {
		if (HTMLHarmonyPanelElement.#dragMode !== DragMode.None) {
			return;
		}

		HTMLHarmonyPanelElement.#dragMode = DragMode.Resize;
		HTMLHarmonyPanelElement.#resizeX = x;
		HTMLHarmonyPanelElement.#resizeY = y;

		HTMLHarmonyPanelElement.#startRect = this.getBoundingClientRect();
	}
}

let definedPanel = false;
export function defineHarmonyPanel(): void {
	if (!definedPanel) {
		defineElement('harmony-panel', HTMLHarmonyPanelElement);
		definedPanel = true;
		injectGlobalCss();
	}
}
