import { shadowRootStyle } from "../harmony-css";
import { createElement } from "../harmony-html";
import { toBool } from "../utils/attributes";
import panelCSS from '../css/harmony-panel.css';

let dragged = null;
let nextId = 0;
//let spliter: HTMLElement = createElement('div', { className: 'harmony-panel-splitter' }) as HTMLElement;
let highlitPanel: HTMLElement;

export class HTMLHarmonyPanelElement extends HTMLElement {
	#doOnce = true;
	#parent = null;
	#panels = new Set();
	#size = 1;
	#direction: string = 'undefined';
	#isContainer = false;
	#isMovable = false;
	#isCollapsible = false;
	#isCollapsed = false;
	customPanelId = nextId++;
	htmlTitle: HTMLElement;
	htmlContent: HTMLElement;
	#isDummy = false;
	#shadowRoot: ShadowRoot;

	constructor() {
		super();
		this.#shadowRoot = this.attachShadow({ mode: 'closed' });
		shadowRootStyle(this.#shadowRoot, panelCSS);
		//this.addEventListener('dragstart', event => this._handleDragStart(event));
		//this.addEventListener('dragover', event => this._handleDragOver(event));
		//this.addEventListener('drop', event => this._handleDrop(event));
		//this.addEventListener('mouseenter', event => this._handleMouseEnter(event));
		//this.addEventListener('mousemove', event => this._handleMouseMove(event));
		//this.addEventListener('mouseleave', event => this._handleMouseLeave(event));

		this.htmlTitle = createElement('div', {
			className: 'title',
			parent: this.#shadowRoot,
			events: {
				click: () => this.#toggleCollapse(),
			}
		});
		this.htmlContent = createElement('div', {
			className: 'content',
			parent: this.#shadowRoot,
		});
	}

	connectedCallback() {
		if (this.#doOnce) {
			//this.append(...this.childNodes);
			this.#doOnce = false;
		}

		super.append(this.htmlTitle);
		super.append(this.htmlContent);

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

	append() {
		this.htmlContent.append(...arguments);
	}

	prepend() {
		this.htmlContent.prepend(...arguments);
	}
	/*
		appendChild(child: HTMLElement) {
			this.htmlContent.appendChild(child);
		}
	*/

	get innerHTML() {
		return this.htmlContent.innerHTML;
	}

	set innerHTML(innerHTML) {
		this.htmlContent.innerHTML = innerHTML;
	}

	attributeChangedCallback(name: string, oldValue: string, newValue: string) {
		if (oldValue == newValue) {
			return;
		}
		if (name == 'panel-direction') {
			this.#direction = newValue;
		} else if (name == 'panel-size') {
			this.size = Number(newValue);
		} else if (name == 'is-container') {
			this.isContainer = toBool(newValue);
		} else if (name == 'is-movable') {
			this.isMovable = toBool(newValue);
		} else if (name == 'collapsible') {
			this.collapsible = toBool(newValue);
		} else if (name == 'collapsed') {
			this.collapsed = toBool(newValue);
		} else if (name == 'title') {
			this.title = newValue;
		} else if (name == 'title-i18n') {
			this.titleI18n = newValue;
		}
	}
	static get observedAttributes() {
		return ['panel-direction', 'panel-size', 'is-container', 'is-movable', 'title', 'title-i18n', 'collapsible', 'collapsed'];
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

	get direction() {
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

	get size() {
		return this.#size;
	}

	set isContainer(isContainer: boolean) {
		this.#isContainer = isContainer;
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
			this.htmlContent.style.display = 'none';
		} else {
			this.htmlContent.style.display = '';
		}
	}

	set title(title: string) {
		if (title) {
			this.htmlTitle = this.htmlTitle ?? document.createElement('div');
			this.htmlTitle.innerHTML = title;
			super.prepend(this.htmlTitle);
		} else {
			this.htmlTitle.remove();
		}
	}

	set titleI18n(titleI18n: string) {
		this.htmlTitle.classList.add('i18n');
		this.htmlTitle.setAttribute('data-i18n', titleI18n);
		this.htmlTitle.remove();
		this.title = titleI18n;
	}

	#toggleCollapse() {
		this.collapsed = !this.#isCollapsed;
	}


	static get nextId() {
		return `harmony-panel-dummy-${++nextId}`;
	}

	static saveDisposition() {
		let list = document.getElementsByTagName('harmony-panel');
		let json: { panels: { [key: string]: any }, dummies: Array<any> } = { panels: {}, dummies: [] };
		for (let panel of list) {
			if (panel.id && panel.parentElement && panel.parentElement.id && panel.parentElement.tagName == 'HARMONY-PANEL') {
				json.panels[(panel as any).id] = { parent: panel.parentElement.id, size: (panel as any).size, direction: (panel as any).direction };
				if ((panel as HTMLHarmonyPanelElement).#isDummy) {
					json.dummies.push((panel as any).id);
				}
			}
		}
		return json;
	}

	static restoreDisposition(json: { [key: string]: any }) {
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
		}*/
	}
}

let definedPanel = false;
export function defineHarmonyPanel() {
	if (window.customElements && !definedPanel) {
		customElements.define('harmony-panel', HTMLHarmonyPanelElement);
		definedPanel = true;
	}
}
