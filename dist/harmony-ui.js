import { checkOutlineSVG } from 'harmony-svg';

function createElement(tagName, options) {
	let element = document.createElement(tagName);
	createElementOptions(element, options);
	if (options?.elementCreated) {
		options.elementCreated(element);
	}
	return element;
}

function createElementNS(namespaceURI, tagName, options) {
	let element = document.createElementNS(namespaceURI, tagName);
	createElementOptions(element, options);
	return element;
}

function updateElement(element, options) {
	createElementOptions(element, options);
	return element;
}

function createElementOptions(element, options) {
	if (options) {
		for (let optionName in options) {
			let optionValue = options[optionName];
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
					if (optionValue) {
						element.append(optionValue);
					}
					break;
				case 'childs':
					optionValue.forEach(entry => {
						if (entry !== null && entry !== undefined) {
							element.append(entry);
						}
					});
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
				default:
					if (optionName.startsWith('data-')) {
						element.setAttribute(optionName, optionValue);
					} else {
						element[optionName] = optionValue;
					}
					break;
			}
		}
	}
	return element;
}

function display(htmlElement, visible) {
	if (htmlElement == undefined) return;

	if (visible) {
		htmlElement.style.display = '';
	} else {
		htmlElement.style.display = 'none';
	}
}

function show(htmlElement) {
	display(htmlElement, true);
}

function hide(htmlElement) {
	display(htmlElement, false);
}

function toggle(htmlElement) {
	if (!(htmlElement instanceof HTMLElement)) {
		return;
	}
	if (htmlElement.style.display == 'none') {
		htmlElement.style.display = '';
	} else {
		htmlElement.style.display = 'none';
	}
}

function visible(htmlElement) {
	return htmlElement.style.display == ''
}

function styleInject(css) {
	document.head.append(createElement('style', {textContent: css}));
}

class HTMLHarmonyAccordionElement extends HTMLElement {
	#doOnce;
	#multiple;
	#disabled;
	#items;
	#selected;
	constructor() {
		super();
		this.#doOnce = true;
		this.#multiple = false;
		this.#disabled = false;
		this.#items = new Map();
		this.#selected = new Set();
		this.#initMutationObserver();
	}

	connectedCallback() {
		if (this.#doOnce) {
			this.#processChilds();
			this.#doOnce = false;
		}
	}

	#processChilds() {
		//This is a 2 steps process cause we may change DOM
		const children = this.children;
		let list = [];
		for (let child of children) {
			list.push(child);
		}
		list.forEach(element => this.addItem(element));
	}

	addItem(item) {
		if (item.tagName == 'ITEM') {
			let header = item.getElementsByTagName('header')[0];
			let content = item.getElementsByTagName('content')[0];

			let htmlItemHeader = createElement('div', {class:'header'});
			let htmlItemContent = createElement('div', {class:'content'});

			htmlItemHeader.addEventListener('click', () => this.#toggle(htmlItemHeader));

			htmlItemHeader.append(header);
			htmlItemContent.append(content);

			this.#items.set(htmlItemHeader, htmlItemContent);
			this.#refresh();
			item.remove();

			if (header.getAttribute('select')) {
				this.#toggle(htmlItemHeader);
			}
		}
	}

	createItem(header, content) {
		let item = createElement('item', {childs:[header, content]});
		this.append(item);
		return item;
	}

	#refresh() {
		this.innerHTML = '';
		for (let [header, content] of this.#items) {
			let htmlItem = createElement('div', {class:'item'});
			htmlItem.append(header, content);
			this.append(htmlItem);
		}
	}

	#toggle(header, collapse = true) {
		let content  = this.#items.get(header);
		if (collapse && !this.#multiple) {
			for (let selected of this.#selected) {
				if (header != selected) {
					this.#toggle(selected, false);
				}
			}
		}
		if (this.#selected.has(header)) {
			this.#selected.delete(header);
			header.classList.remove('selected');
			content.classList.remove('selected');
			this.#dispatchSelect(false, header, content);
		} else {
			this.#selected.add(header);
			header.classList.add('selected');
			content.classList.add('selected');
			this.#dispatchSelect(true, header, content);
		}
	}

	#dispatchSelect(selected, header, content) {
		this.dispatchEvent(new CustomEvent(selected ? 'select' : 'unselect', {detail:{header:header.children[0], content:content.children[0]}}));
	}

	#initMutationObserver() {
		let config = {childList:true, subtree: true};
		const mutationCallback = (mutationsList, observer) => {
			for (const mutation of mutationsList) {
				let addedNodes = mutation.addedNodes;
				for (let addedNode of addedNodes) {
					if (addedNode.parentNode == this) {
						this.addItem(addedNode);
					}
				}
			}
		};

		let observer = new MutationObserver(mutationCallback);
		observer.observe(this, config);

	}

	set disabled(disabled) {
		this.#disabled = disabled ? true : false;
		this.classList[this.#disabled?'add':'remove']('disabled');
	}

	get disabled() {
		return this.#disabled;
	}

	attributeChangedCallback(name, oldValue, newValue) {
		switch (name) {
			case 'multiple':
				this.#multiple = newValue == true;
				break;
		}
	}

	static get observedAttributes() {
		return ['multiple'];
	}
}

class HTMLHarmonyContextMenuElement extends HTMLElement {
	constructor() {
		super();
		this._subMenus = new Map();

		document.addEventListener('click', (event) => {
			if (!this.contains(event.target)) {
				this.close();
			}
		});


	}

	show(items, clientX , clientY, userData) {
		document.body.append(this);
		this.setItems(items, userData);
		this.style.position = 'absolute';
		this.style.left = clientX + 'px';
		this.style.top = clientY + 'px';
		this._checkSize();
	}

	_checkSize() {
		let bodyRect = document.body.getBoundingClientRect();
		let elemRect = this.getBoundingClientRect();

		this.style.maxWidth = bodyRect.width + 'px';
		this.style.maxHeight = bodyRect.height + 'px';

		if (elemRect.right > bodyRect.right) {
			this.style.left = Math.max((bodyRect.width - elemRect.width), 0) + 'px';
			/*if (elemRect.width > bodyRect.width) {
				this.style.maxWidth = bodyRect.width + 'px';
			} else {
				this.style.maxWidth = '';
			}*/
		}

		if (elemRect.bottom > bodyRect.bottom) {
			this.style.top = Math.max((bodyRect.height - elemRect.height), 0) + 'px';
			/*if (elemRect.height > bodyRect.height) {
				this.style.maxHeight = bodyRect.height + 'px';
			} else {
				this.style.maxHeight = '';
			}*/
		}

		if (elemRect.left < 0) {
			this.style.left = '0px';
		}
		if (elemRect.top < 0) {
			this.style.top = '0px';
		}

	}

	close() {
		this.remove();
	}

	connectedCallback() {
		let callback = (entries, observer) => {
			entries.forEach(entry => {
				this._checkSize();
			});
		};
		let resizeObserver = new ResizeObserver(callback);
		resizeObserver.observe(this);
		resizeObserver.observe(document.body);
	}

	setItems(items, userData) {
		this.innerHTML = '';
		if (items instanceof Array) {
			for (let item of items) {
				this.append(this.addItem(item, userData));
			}
		} else {
			for (let itemId in items) {
				let item = items[itemId];
				this.append(this.addItem(item, userData));
			}

		}
	}

	_openSubMenu(htmlSubMenu) {
		for (let [htmlItem, sub] of this._subMenus) {
			if (sub == htmlSubMenu || sub.contains(htmlSubMenu)) {
				htmlItem.classList.add('opened');
					htmlItem.classList.remove('closed');
			} else {
				htmlItem.classList.remove('opened');
				htmlItem.classList.add('closed');
			}
		}
		this._checkSize();
	}

	addItem(item, userData) {
		let htmlItem = document.createElement('div');
		htmlItem.className = 'harmony-context-menu-item';
		//this.append(htmlItem);
		if (!item) {
			htmlItem.classList.add('separator');
		} else {
				let htmlItemTitle = document.createElement('div');
				htmlItemTitle.className = 'harmony-context-menu-item-title';
				if (item.i18n) {
					htmlItemTitle.classList.add('i18n');
					htmlItemTitle.setAttribute('data-i18n', item.i18n);
					htmlItemTitle.innerHTML = item.i18n;
				} else {
					htmlItemTitle.innerHTML = item.name;
				}
				htmlItem.append(htmlItemTitle);

				if (item.selected) {
					htmlItem.classList.add('selected');
				}
				if (item.disabled) {
					htmlItem.classList.add('disabled');
				}
				if (item.submenu) {
					let htmlSubMenu = document.createElement('div');
					this._subMenus.set(htmlItem, htmlSubMenu);
					htmlSubMenu.className = 'submenu';
					if (item.submenu instanceof Array) {
						for (let subItem of item.submenu) {
							htmlSubMenu.append(this.addItem(subItem, userData));
						}
					} else {
						for (let subItemName in item.submenu) {
							let subItem = item.submenu[subItemName];
							htmlSubMenu.append(this.addItem(subItem, userData));
						}
					}
					htmlItem.append(htmlSubMenu);
					//htmlSubMenu.style.display = 'none';
					htmlItem.classList.add('closed');
					htmlItem.addEventListener('click', (event) => {this._openSubMenu(htmlSubMenu);event.stopPropagation();});
				} else {
					htmlItem.addEventListener('click', () =>
						{
							if (item.cmd) {
								this.dispatchEvent(new CustomEvent(item.cmd));
							}
							if (item.f) {
								item.f(userData);
							}
						}
					);
				htmlItem.addEventListener('click', () => this.close());
			}
		}
		return htmlItem;
	}
}

class HTMLHarmonyCopyElement extends HTMLElement {
	#doOnce = true;
	#htmlCopied;
	constructor() {
		super();
		this.#htmlCopied = createElement('div', { class: 'harmony-copy-copied' });
		this.addEventListener('click', () => this.#copy());
	}

	connectedCallback() {
		if (this.#doOnce) {
			this.#doOnce = false;
			this.append(this.#htmlCopied);
			hide(this.#htmlCopied);
		}
	}

	async #copy() {
		try {
			const text = this.innerText;
			this.#htmlCopied.innerText = text;
			show(this.#htmlCopied);
			await navigator.clipboard.writeText(text);
			this.#htmlCopied.classList.add('harmony-copy-copied-end');

			setTimeout(() => { this.#htmlCopied.classList.remove('harmony-copy-copied-end'); hide(this.#htmlCopied); }, 1000);
		} catch (e) {
			console.log(e);
		}
	}
}

class HTMLHarmonyLabelPropertyElement extends HTMLElement {
	#doOnce = false;
	#htmlLabel;
	#htmlProperty;
	constructor() {
		super();
		this.#initHtml();
	}

	#initHtml() {
		this.#htmlLabel = createElement('label', {i18n:''});
		this.#htmlProperty = createElement('span');
	}

	set label(label) {
		this.#htmlLabel.setAttribute('data-i18n', label);
	}

	set property(property) {
		this.#htmlProperty.innerHTML = property;
	}

	connectedCallback() {
		if (!this.#doOnce) {
			this.#doOnce = true;
			this.append(this.#htmlLabel, this.#htmlProperty);
		}
	}
}

function clampColor(val) {
	return Math.min(Math.max(0, val), 1);
}

class HTMLHarmonyPaletteElement extends HTMLElement {
	#initialized = false;
	#multiple = false;
	#colors = new Map();
	#selected = new Map();
	#colorElements = new Map();
	#preSelected = new Set();
	constructor() {
		super();
	}

	connectedCallback() {
		if (!this.#initialized) {
			this.#initialized = true;
			this.#processChilds();
			//this.append(this.#htmlCopied);
			//hide(this.#htmlCopied);
		}
	}

	#processChilds() {
		//This is a 2 steps process cause we may change DOM
		const children = this.children;
		let list = [];
		for (let child of children) {
			list.push(child);
		}
		list.forEach(element => {
			const c = this.#addColor(element.innerText);
			element.remove();
			if (c && element.hasAttribute('selected')) {
				this.#preSelected.add(c.h);
			}
		});
		this.#refreshHTML();
	}

	#refreshHTML() {
		if (!this.#initialized) {
			return;
		}
		this.innerHTML = '';
		this.#colorElements.clear();

		for (const [colorHex, color] of this.#colors) {
			const element = createElement('div', {
				parent: this,
				class: 'harmony-palette-color',
				'data-color': colorHex,
				style: `background-color: ${colorHex}`,
				events: {
					click: event => this.#selectColor(colorHex, event.target),
				}
			});
			this.#colorElements.set(colorHex, element);
			if (this.#preSelected.has(colorHex)) {
				this.#selectColor(colorHex, element);

			}
		}
		this.#preSelected.clear();
	}

	#selectColor(hex, element, selected) {
		if (this.#selected.has(hex) && selected !==  true) {
			this.#setSelected(this.#selected.get(hex), false);
			this.#dispatchSelect(hex, false);
			this.#selected.delete(hex);
		} else {
			if (!this.#multiple) {
				for (const [h, e] of this.#selected) {
					this.#setSelected(e, false);
					this.#dispatchSelect(h, false);
					this.#selected.delete(h);
				}
			}
			this.#dispatchSelect(hex, true);
			this.#selected.set(hex, element);
			this.#setSelected(element, true);
		}
	}

	#setSelected(element, selected) {
		if (!element) {
			return;
		}
		if (selected) {
			element.classList.add('selected');
			element.innerHTML = checkOutlineSVG;
		} else {
			element.classList.remove('selected');
			element.innerText = '';
		}

	}

	#dispatchSelect(hex, selected) {
		this.dispatchEvent(new CustomEvent(selected ? 'select' : 'unselect', { detail: { hex: hex } }));
	}

	clearColors() {
		this.#colors.clear();
		this.#refreshHTML();
	}

	addColor(color, tooltip) {
		const c = this.#addColor(color, tooltip);
		this.#refreshHTML();
		return c;
	}

	selectColor(color, selected = true) {
		const c = this.#getColorAsRGB(color);
		this.#selectColor(c.h, this.#colorElements.get(c.h), selected);
	}

	toggleColor(color) {
		const c = this.#getColorAsRGB(color);
		this.#selectColor(c.h, this.#colorElements.get(c.h));
	}

	#addColor(color, tooltip) {
		const c = this.#getColorAsRGB(color);
		if (!c) {
			return;
		}

		c.selected = false;
		c.tooltip = tooltip;

		this.#colors.set(c.h, c);
		return c;
	}

	#getColorAsRGB(color) {
		let r, g, b;
		switch (true) {
			case typeof color == 'string':
				let c = parseInt('0x' + color.replace('#', ''), 16);
				r = ((c >> 16) & 0xFF) / 255;
				g = ((c >> 8) & 0xFF) / 255;
				b = (c & 0xFF) / 255;
				break;
			case typeof color == 'array':
				r = clampColor(color[0]);
				g = clampColor(color[1]);
				b = clampColor(color[2]);
				break;
		}
		return { r: r, g: g, b: b, h: '#' + Number((r * 255 << 16) + (g * 255 << 8) + (b * 255)).toString(16).padStart(6, '0') };
	}

	attributeChangedCallback(name, oldValue, newValue) {
		switch (name) {
			case 'multiple':
				this.#multiple = newValue == true;
				break;
		}
	}

	static get observedAttributes() {
		return ['multiple'];
	}
}

let CustomPanelId = 0;
let dragged = null;
class HTMLHarmonyPanelElement extends HTMLElement {
	static #nextId = 0;
	constructor() {
		super();
		this._parent = null;
		this._panels = new Set();
		this._size = 1;
		this._direction = undefined;
		this._isContainer = undefined;
		this._isMovable = undefined;
		this._isCollapsible = false;
		this._isCollapsed = false;

		//this.addEventListener('dragstart', event => this._handleDragStart(event));
		//this.addEventListener('dragover', event => this._handleDragOver(event));
		//this.addEventListener('drop', event => this._handleDrop(event));
		//this.addEventListener('mouseenter', event => this._handleMouseEnter(event));
		//this.addEventListener('mousemove', event => this._handleMouseMove(event));
		//this.addEventListener('mouseleave', event => this._handleMouseLeave(event));
		this.CustomPanelId = CustomPanelId++;
		if (!HTMLHarmonyPanelElement._spliter) {
			HTMLHarmonyPanelElement._spliter = document.createElement('div');
			HTMLHarmonyPanelElement._spliter.className = 'harmony-panel-splitter';
		}

		this.htmlTitle = document.createElement('div');
		this.htmlTitle.className = 'title';
		this.htmlTitle.addEventListener('click', () => this._toggleCollapse());
		this.htmlContent = document.createElement('div');
		this.htmlContent.className = 'content';
	}

	connectedCallback() {
		if (!this.connectedCallbackOnce) {
			this.append(...this.childNodes);
			this.connectedCallbackOnce = true;
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
	appendChild(child) {
		this.htmlContent.appendChild(child);
	}


	get innerHTML() {
		return this.htmlContent.innerHTML;
	}
	set innerHTML(innerHTML) {
		this.htmlContent.innerHTML = innerHTML;
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if (oldValue == newValue) {
			return;
		}
		if (name == 'panel-direction') {
			this.direction = newValue;
		} else  if (name == 'panel-size') {
			this.size = newValue;
		} else  if (name == 'is-container') {
			this.isContainer = newValue;
		} else  if (name == 'is-movable') {
			this.isMovable = newValue;
		} else  if (name == 'collapsible') {
			this.collapsible = newValue;
		} else  if (name == 'collapsed') {
			this.collapsed = newValue;
		} else  if (name == 'title') {
			this.title = newValue;
		} else  if (name == 'title-i18n') {
			this.titleI18n = newValue;
		}
	}
	static get observedAttributes() {
		return ['panel-direction', 'panel-size', 'is-container', 'is-movable', 'title', 'title-i18n', 'collapsible', 'collapsed'];
	}

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

	static set highlitPanel(panel) {
		if (HTMLHarmonyPanelElement._highlitPanel) {
			HTMLHarmonyPanelElement._highlitPanel.style.filter = null;
		}
		HTMLHarmonyPanelElement._highlitPanel = panel;
		if (HTMLHarmonyPanelElement._highlitPanel) {
			HTMLHarmonyPanelElement._highlitPanel.style.filter = 'grayscale(80%)';///'contrast(200%)';
		}
	}

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
	}

	_split(newNode, before, direction) {
		let panel = HTMLHarmonyPanelElement._createDummy();//document.createElement('harmony-panel');
		/*panel.id = HTMLHarmonyPanelElement.nextId;
		panel._isDummy = true;
		panel.classList.add('dummy');*/
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

	static _createDummy() {
		let dummy = document.createElement('harmony-panel');
		dummy.id = HTMLHarmonyPanelElement.#nextId;
		dummy._isDummy = true;
		dummy.classList.add('dummy');
		return dummy;
	}

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

	_click() {
		this.active = true;
		if (this._group) {
			this._group.active = this;
		}
	}

	set direction(direction) {
		this._direction = direction;
		this.classList.remove('harmony-panel-row');
		this.classList.remove('harmony-panel-column');
		if (direction == 'row') {
			this.classList.add('harmony-panel-row');
		} else if (direction == 'column') {
			this.classList.add('harmony-panel-column');
		}
	}
	get direction() {
		return this._direction;
	}

	set size(size) {
		/*if (size === undefined) {
			return;
		}*/
		this._size = size;
		//this.style.flexBasis = size;
		this.style.flex = size;
	}
	get size() {
		return this._size;
	}

	set isContainer(isContainer) {
		this._isContainer = (isContainer == true) ? true : false;
	}

	set isMovable(isMovable) {
		this._isMovable = (isMovable == true) ? true : false;
	}

	set collapsible(collapsible) {
		this._isCollapsible = (collapsible == true) ? true : false;
		this.setAttribute('collapsible', this._isCollapsible ? 1 : 0);
		if (this._isCollapsible) ;
	}

	set collapsed(collapsed) {
		this._isCollapsed = (collapsed == true) ? this._isCollapsible : false;
		this.setAttribute('collapsed', this._isCollapsed ? 1 : 0);
		if (this._isCollapsed) {
			this.htmlContent.style.display = 'none';
		} else {
			this.htmlContent.style.display = '';
		}
	}

	set title(title) {
		if (title) {
			this.htmlTitle = this.htmlTitle ?? document.createElement('div');
			this.htmlTitle.innerHTML = title;
			super.prepend(this.htmlTitle);
		} else {
			this.htmlTitle.remove();
		}
	}

	set titleI18n(titleI18n) {
		this.htmlTitle.classList.add('i18n');
		this.htmlTitle.setAttribute('data-i18n', titleI18n);
		this.htmlTitle.remove();
		this.title = titleI18n;
	}

	_toggleCollapse() {
		this.collapsed = ! this._isCollapsed;
	}


	static get nextId() {
		return `harmony-panel-dummy-${++HTMLHarmonyPanelElement.#nextId}`;
	}

	static saveDisposition() {
		let list = document.getElementsByTagName('harmony-panel');
		let json = {panels:{},dummies:[]};
		for (let panel of list) {
			if (panel.id && panel.parentElement && panel.parentElement.id && panel.parentElement.tagName == 'HARMONY-PANEL') {
				json.panels[panel.id] = {parent:panel.parentElement.id, size:panel.size, direction:panel.direction};
				if (panel._isDummy) {
					json.dummies.push(panel.id);
				}
			}
		}
		return json;
	}

	static restoreDisposition(json) {
		return;
	}
}

class HTMLHarmonyRadioElement extends HTMLElement {
	#doOnce;
	#disabled;
	#multiple = false;
	#htmlLabel;
	#state = false;
	#current;
	#buttons = new Map();
	#buttons2 = new Set();
	#selected = new Set();
	constructor(options) {
		super();
		this.#doOnce = true;
		this.#htmlLabel = createElement('div', {class: 'harmony-radio-label'});
		this.#initObserver();
	}

	connectedCallback() {
		if (this.#doOnce) {
			this.prepend(this.#htmlLabel);
			hide(this.#htmlLabel);
			this.#processChilds();
			this.#doOnce = false;
		}
	}

	#processChilds() {
		for (let child of this.children) {
			this.#initButton(child);
		}
	}

	#initButton(htmlButton) {
		this.#buttons.set(htmlButton.value, htmlButton);
		if (!this.#buttons2.has(htmlButton)) {
			htmlButton.addEventListener('click', () => this.select(htmlButton.value, !this.#multiple || !htmlButton.hasAttribute('selected')));
			this.#buttons2.add(htmlButton);
		}

		if (this.#selected.has(htmlButton.value) || htmlButton.hasAttribute('selected')) {
			this.select(htmlButton.value, true);
		}
	}

	select(value, select) {
		this.#selected[select ? 'add' : 'delete'](value);

		let htmlButton = this.#buttons.get(value);
		if (htmlButton) {
			if (select && !this.#multiple) {
				for (let child of this.children) {
					if (child.hasAttribute('selected')) {
						child.removeAttribute('selected');
						this.dispatchEvent(new CustomEvent('change', {detail:{value:child.value, state:false}}));
						child.dispatchEvent(new CustomEvent('change', {detail:{value:child.value, state:false}}));
					}
				}
			}
			select ? htmlButton.setAttribute('selected', '') : htmlButton.removeAttribute('selected', '');
			this.dispatchEvent(new CustomEvent('change', {detail:{value:htmlButton.value, state:select}}));
			htmlButton.dispatchEvent(new CustomEvent('change', {detail:{value:htmlButton.value, state:select}}));
		}
	}

	isSelected(value) {
		let htmlButton = this.#buttons.get(value);
		return htmlButton?.value ?? false;
	}

	set disabled(disabled) {
		this.#disabled = disabled ? true : false;
		this.classList[this.#disabled ? 'add' : 'remove']('disabled');
	}

	get disabled() {
		return this.#disabled;
	}

	#initObserver() {
		let config = {childList:true, subtree: true};
		const mutationCallback = (mutationsList, observer) => {
			for (const mutation of mutationsList) {
				let addedNodes = mutation.addedNodes;
				for (let addedNode of addedNodes) {
					if (addedNode.parentNode == this) {
						this.#initButton(addedNode);
					}
				}
			}
		};

		let observer = new MutationObserver(mutationCallback);
		observer.observe(this, config);
	}

	attributeChangedCallback(name, oldValue, newValue) {
		switch (name) {
			case 'data-label':
				this.#htmlLabel.innerHTML = newValue;
				this.#htmlLabel.classList.remove('i18n');
				show(this.#htmlLabel);
				break;
			case 'data-i18n':
				this.#htmlLabel.setAttribute('data-i18n', newValue);
				this.#htmlLabel.innerHTML = newValue;
				this.#htmlLabel.classList.add('i18n');
				show(this.#htmlLabel);
				break;
			case 'disabled':
				this.disabled = newValue;
				break;
			case 'multiple':
				this.#multiple = true;
				break;
		}
	}

	static get observedAttributes() {
		return ['data-label', 'data-i18n', 'disabled', 'multiple'];
	}
}

const resizeCallback = (entries, observer) => {
	entries.forEach(entry => {
		entry.target.onResized(entry);
	});
};

const DEFAULT_AUTO_PLAY_DELAY = 3000;
const DEFAULT_SCROLL_TRANSITION_TIME = 0.5;

class HTMLHarmonySlideshowElement extends HTMLElement {
	#activeImage;
	#currentImage;
	#doOnce;
	#doOnceOptions;
	#dynamic;
	#htmlControls;
	#htmlImages;
	#htmlImagesOuter;
	#htmlImagesInner;
	#htmlNextImage;
	#htmlPauseButton;
	#htmlPlayButton;
	#htmlPreviousImage;
	#htmlThumbnails;
	#htmlZoomContainer;
	#images;
	#imgSet;
	#htmlZoomImage;
	#resizeObserver = new ResizeObserver(resizeCallback);

	constructor(options) {
		super();
		this.#images = [];
		this.#dynamic = true;
		this.#imgSet = new Set();
		this.#currentImage = 0;
		this.#activeImage = null;
		this.#doOnce = true;
		this.#doOnceOptions = options;
		this.#initObserver();
	}

	#initHtml() {
		if (this.#dynamic) {
			this.classList.add('harmony-slideshow-dynamic');
		}
		this.#htmlImages = createElement('div', {class:'harmony-slideshow-images'});
		this.#htmlImagesOuter = createElement('div', {class:'harmony-slideshow-images-outer'});
		this.#htmlImagesInner = createElement('div', {class:'harmony-slideshow-images-inner'});
		this.#htmlImagesInner.addEventListener('mouseover', (event) => this.#zoomImage(event));
		this.#htmlImagesInner.addEventListener('mousemove', (event) => this.#zoomImage(event));
		this.#htmlImagesInner.addEventListener('mouseout', (event) => this.#zoomImage(event));
		this.#htmlControls = createElement('div', {class:'harmony-slideshow-controls'});
		this.#htmlControls.addEventListener('mouseenter', (event) => this.#htmlControls.style.opacity = 'unset');
		this.#htmlControls.addEventListener('mouseleave', (event) => this.#htmlControls.style.opacity = '0');

		this.#htmlZoomImage = createElement('img');
		this.#htmlZoomContainer = createElement('div', {class:'harmony-slideshow-zoom', childs:[this.#htmlZoomImage]});
		document.body.append(this.#htmlZoomContainer);

		this.#htmlThumbnails = createElement('div', {class:'harmony-slideshow-thumbnails'});
		display(this.#htmlThumbnails, !this.#dynamic);
		display(this.#htmlControls, this.#dynamic);

		this.#htmlPreviousImage = createElement('div', {class:'harmony-slideshow-previous-image'});
		this.#htmlNextImage = createElement('div', {class:'harmony-slideshow-next-image'});

		this.#htmlPreviousImage.addEventListener('click', (event) => {this.previousImage();this.setAutoPlay(false);});
		this.#htmlNextImage.addEventListener('click', (event) => {this.nextImage();this.setAutoPlay(false);});

		this.#htmlPlayButton = createElement('div', {class:'harmony-slideshow-play'});
		this.#htmlPauseButton = createElement('div', {class:'harmony-slideshow-pause'});

		this.#htmlPlayButton.addEventListener('click', (event) => this.play(true));
		this.#htmlPauseButton.addEventListener('click', (event) => this.play(false));

		this.#htmlControls.append(this.#htmlPreviousImage, this.#htmlNextImage, this.#htmlPlayButton, this.#htmlPauseButton);
		this.#htmlImages.append(this.#htmlImagesOuter);
		this.#htmlImagesOuter.append(this.#htmlImagesInner);
		this.append(this.#htmlImages, this.#htmlControls, this.#htmlThumbnails);
	}

	previousImage() {
		if (this.#currentImage == 0) {
			this.setImage(this.#images.length - 1);
		} else {
			this.setImage(this.#currentImage - 1);
		}
	}

	nextImage() {
		if (this.#currentImage >= this.#images.length - 1) {
			this.setImage(0);
		} else {
			this.setImage(this.#currentImage + 1);
		}
	}

	setImage(imageId) {
		this.#currentImage = imageId;
		this.active = this.#images[imageId];
	}

	connectedCallback() {
		if (this.#doOnce) {
			this.#initHtml();
			this.processOptions(this.#doOnceOptions);
			this.#processChilds();
			this.#doOnce = false;
		}
		this.#resizeObserver.observe(this);
		this.checkImagesSize();
		document.body.append(this.#htmlZoomContainer);
	}

	disconnectedCallback() {
		if (this.#htmlZoomContainer) {
			this.#htmlZoomContainer.remove();
			hide(this.#htmlZoomContainer);
		}
	}

	addImage(htmlImage) {
		if (htmlImage.constructor.name == 'HTMLImageElement') {
			if (!this.#imgSet.has(htmlImage)) {
				this.#images.push(htmlImage);
				this.#imgSet.add(htmlImage);
				this.#htmlImagesInner.append(htmlImage);
				if (!this.#activeImage) {
					this.active = htmlImage;
				}
				htmlImage.classList.add('harmony-slideshow-image');
				htmlImage.decode().then(() => {
					this.refresh();
				});

				//this.checkImageSize(htmlImage);
				htmlImage.onload = () => this.checkImageSize(htmlImage);

				let htmlThumbnailImage = htmlImage.cloneNode();
				this.#htmlThumbnails.append(htmlThumbnailImage);
				htmlThumbnailImage.addEventListener('click', () => this.active = htmlImage);
			}
		}
	}

	removeAllImages() {
		this.#images = [];
		this.#imgSet = new Set();
		this.#htmlImagesInner.innerHTML = '';
		this.#htmlThumbnails.innerHTML = '';
		this.#activeImage = null;

		// Remove pending images
		let list = [];
		for (let child of this.children) {
			if (child.constructor.name == 'HTMLImageElement') {
				list.push(child);
			}
		}
		list.forEach(element => element.remove());
	}

	refresh() {
		for (let image of this.#images) {
			//image.style.display = (image ==  this.#activeImage) ? '' : 'none';
			image.style.display = '';
		}
	}

	processOptions(options = {}) {
		this.setAutoPlay(options.autoPlay ?? true);
		this.autoPlayDelay = options.autoPlayDelay ?? DEFAULT_AUTO_PLAY_DELAY;
		this.smoothScroll = options.smoothScroll ?? true;
		this.smoothScrollTransitionTime = options.smoothScrollTransitionTime ?? DEFAULT_SCROLL_TRANSITION_TIME;

		if (options.images) {
			for (let image of options.images) {
				let htmlImage = createElement('img');
				htmlImage.src = image;
				this.addImage(htmlImage);
			}
		}
		if (options.class) {
			this.className = options.class;
		}
		if (options.id) {
			this.id = options.id;
		}
	}

	#processChilds() {
		//This is a 2 steps process cause we may change DOM
		let list = [];
		for (let child of this.children) {
			list.push(child);
		}
		list.forEach(element => this.addImage(element));
	}

	set active(htmlImage) {
		if (htmlImage) {
			this.#activeImage = htmlImage;
			this.refresh();
			this.checkImageSize(htmlImage);
			this.#htmlImagesInner.style.left = `-${htmlImage.offsetLeft}px`;
			this.play();
		}
	}

	set dynamic(dynamic) {
		this.#dynamic = dynamic;
		display(this.#htmlThumbnails, !dynamic);
		display(this.#htmlControls, dynamic);
		if (!dynamic) {
			this.setAutoPlay(false);
			this.setImage(0);
		}
		if (dynamic) {
			this.classList.add('harmony-slideshow-dynamic');
		} else {
			this.classList.remove('harmony-slideshow-dynamic');
		}
	}

	setAutoPlay(autoPlay) {
		this.autoPlay = autoPlay && this.#dynamic;
		if (autoPlay) {
			hide(this.#htmlPlayButton);
			show(this.#htmlPauseButton);
		} else {
			show(this.#htmlPlayButton);
			hide(this.#htmlPauseButton);
		}
	}

	play(autoPlay) {
		if (autoPlay !== undefined) {
			this.setAutoPlay(autoPlay);
		}

		clearTimeout(this.autoplayTimeout);
		if (this.autoPlay) {
			this.autoplayTimeout = setTimeout(() => this.nextImage(), this.autoPlayDelay);
		}
	}

	onResized(resizeObserverEntry) {
		this.checkImagesSize();
	}

	checkImagesSize() {
		let rect = this.#htmlImages.getBoundingClientRect();
		for (let image of this.#images) {
			this.checkImageSize(image, rect);
		}
	}

	checkImageSize(htmlImage, rect = this.#htmlImages.getBoundingClientRect()) {
		if (this.#activeImage != htmlImage) {
			return;
		}
		let widthRatio = 1.0;
		let heightRatio = 1.0;

		let naturalWidth = htmlImage.naturalWidth;
		let naturalHeight = htmlImage.naturalHeight;

		if (naturalWidth > rect.width) {
			widthRatio = rect.width / naturalWidth;
		}
		if (naturalHeight > rect.height) {
			heightRatio = rect.height / naturalHeight;
		}

		let ratio = Math.min(widthRatio, heightRatio);

		let imageWidth = naturalWidth * ratio + 'px';
		let imageHeight = naturalHeight * ratio + 'px';
		this.#htmlImagesOuter.style.width = imageWidth;
		this.#htmlImagesOuter.style.height = imageHeight;
		//this.#htmlImagesInner.style.transform = `scale(${1})`;

		//this.#htmlControls.style.width = imageWidth;
		//this.#htmlControls.style.height = imageHeight;
	}

	#zoomImage(event) {
		let activeImage = this.#activeImage;
		//console.log(event);
		//console.log(event.offsetX, event.offsetY);
		switch (event.type) {
			case 'mouseover':
				if (activeImage) {
					this.#htmlZoomImage.src = activeImage.src;
					show(this.#htmlZoomContainer);
				}
				break;
			case 'mousemove':
				if (activeImage) {

					let deltaWidth = this.#htmlZoomContainer.clientWidth - this.#htmlZoomImage.clientWidth;
					let deltaHeight = this.#htmlZoomContainer.clientHeight - this.#htmlZoomImage.clientHeight;

					let mouseX = event.offsetX / activeImage.offsetWidth - 0.5;
					let mouseY = event.offsetY / activeImage.offsetHeight - 0.5;

					/*if (deltaWidth >= 0) {
						this.#htmlZoomImage.style.left = `${-mouseX * deltaWidth}px`;
					} else {

					}
					if (deltaHeight >= 0) {
						this.#htmlZoomImage.style.top = `${-mouseY * deltaHeight}px`;
					}*/
					//console.log(deltaWidth, deltaHeight);
					//console.log(mouseX, mouseY);
					this.#htmlZoomImage.style.left = `${Math.sign(deltaWidth) * mouseX * deltaWidth}px`;
					this.#htmlZoomImage.style.top = `${Math.sign(deltaHeight) * mouseY * deltaHeight}px`;



					this.#htmlZoomImage.style.left = `${deltaWidth * 0.5 - Math.sign(deltaWidth) * mouseX * deltaWidth}px`;
					this.#htmlZoomImage.style.top = `${deltaHeight * 0.5 - Math.sign(deltaHeight) * mouseY * deltaHeight}px`;

				}
				break;
			case 'mouseout':
				hide(this.#htmlZoomContainer);
				break;

		}
	}

	#initObserver() {
		let config = {childList:true, subtree: true};
		const mutationCallback = (mutationsList, observer) => {
			for (const mutation of mutationsList) {
				for (let addedNode of mutation.addedNodes) {
					if (addedNode.parentNode == this) {
						this.addImage(addedNode);
					}
				}
			}
		};

		let observer = new MutationObserver(mutationCallback);
		observer.observe(this, config);

	}

	attributeChangedCallback(name, oldValue, newValue) {
		switch (name) {
			case 'dynamic':
				this.dynamic = newValue == true;
				break;
		}
	}

	static get observedAttributes() {
		return ['dynamic'];
	}
}

class HTMLHarmonySelectElement extends HTMLElement {
	#htmlSelect;
	constructor() {
		super();
		this.#htmlSelect = createElement('select');
	}

	connectedCallback() {
		this.append(this.#htmlSelect);
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if (name == 'multiple') {
			this.#htmlSelect.setAttribute('multiple', newValue);
		}
	}

	addEventListener(type, listener) {
		this.#htmlSelect.addEventListener(type, listener);
	}

	onChange(event) {
		let newEvent = new event.constructor(event.type, event);
		this.dispatchEvent(newEvent);
	}

	addOption(value, text) {
		text = text || value;
		let option = document.createElement('option');
		option.value = value;
		option.innerHTML = text;
		this.#htmlSelect.append(option);
	}

	addOptions(values) {
		if (values && values.entries) {
			for (let [value, text] of values.entries()) {
				this.addOption(value, text);
			}
		}
	}

	setOptions(values) {
		this.removeAllOptions();
		this.addOptions(values);
	}

	removeOption(value) {
		let list = this.#htmlSelect.children;
		for (let i = 0; i < list.length; i++) {
			if (list[i].value === value) {
				list[i].remove();
			}
		}
	}

	removeAllOptions() {
		let list = this.#htmlSelect.children;
		while (list[0]) {
			list[0].remove();
		}
	}

	select(value) {
		let list = this.#htmlSelect.children;
		for (let i = 0; i < list.length; i++) {
			if (list[i].value === value) {
				list[i].selected = true;
			}
		}
	}

	selectFirst() {
		if (this.#htmlSelect.children[0]) {
			this.#htmlSelect.children[0].selected = true;
			this.#htmlSelect.dispatchEvent(new Event('input'));
		}
	}

	unselect(value) {
		let list = this.#htmlSelect.children;
		for (let i = 0; i < list.length; i++) {
			if (list[i].value === value) {
				list[i].selected = false;
			}
		}
	}
	unselectAll() {
		let list = this.#htmlSelect.children;
		for (let i = 0; i < list.length; i++) {
			list[i].selected = false;
		}
	}

	static get observedAttributes() {
		return ['multiple'];
	}
}

class HTMLHarmonySwitchElement extends HTMLElement {
	#doOnce;
	#disabled;
	#htmlLabel;
	#htmlSwitchOuter;
	#htmlSwitchInner;
	#state = false;
	#ternary = false;
	constructor() {
		super();
		this.#doOnce = true;
		this.#htmlLabel = createElement('div', { class: 'harmony-switch-label' });
		this.#htmlSwitchOuter = createElement('span', { class: 'harmony-switch-outer' });
		this.#htmlSwitchInner = createElement('span', { class: 'harmony-switch-inner' });
		this.addEventListener('click', () => this.toggle());
	}

	connectedCallback() {
		if (this.#doOnce) {
			this.append(this.#htmlLabel);
			this.append(this.#htmlSwitchOuter);
			this.#htmlSwitchOuter.append(this.#htmlSwitchInner);
			this.#refresh();
			this.#doOnce = false;
		}
	}

	set disabled(disabled) {
		this.#disabled = disabled ? true : false;
		this.classList[this.#disabled?'add':'remove']('disabled');
	}

	get disabled() {
		return this.#disabled;
	}

	set state(state) {
		if (this.#state != state) {
			this.#state = state;
			this.dispatchEvent(new CustomEvent('change', { detail: { state: state, value: state } }));
		} else {
			this.#state = state;
		}
		this.#refresh();
	}

	get state() {
		return this.#state;
	}

	set checked(checked) {
		this.state = checked;
	}

	get checked() {
		return this.#state;
	}

	set ternary(ternary) {
		this.#ternary = ternary;
		this.#refresh();
	}

	get ternary() {
		return this.#ternary;
	}

	toggle() {
		if (this.#ternary) {
			if (this.#state === false) {
				this.state = undefined;
			} else if (this.#state === undefined) {
				this.state = true;
			} else {
				this.state = false;
			}
		} else {
			this.state = !this.#state;
		}
		this.#refresh();
	}

	#refresh() {
		this.classList.remove('on');
		this.classList.remove('off');
		this.classList[this.#ternary ? 'add' : 'remove']('ternary');
		if (this.#state === undefined) {
			return;
		}
		this.classList.add(this.#state ? 'on' : 'off');
	}

	attributeChangedCallback(name, oldValue, newValue) {
		switch (name) {
			case 'data-label':
				this.#htmlLabel.innerHTML = newValue;
				this.#htmlLabel.classList.remove('i18n');
				break;
			case 'data-i18n':
				this.#htmlLabel.setAttribute('data-i18n', newValue);
				this.#htmlLabel.innerHTML = newValue;
				this.#htmlLabel.classList.add('i18n');
				break;
			case 'disabled':
				this.disabled = newValue;
				break;
			case 'ternary':
				this.ternary = true;
				break;
		}
	}

	static get observedAttributes() {
		return ['data-label', 'data-i18n', 'disabled', 'ternary'];
	}
}

class HTMLHarmonyTabElement extends HTMLElement {
	#disabled = false;
	#active = false;
	#header;
	#group;
	constructor() {
		super();
		this.#header = createElement('div', {
			class: 'harmony-tab-label',
			i18n: this.getAttribute('data-i18n'),
			events: {
				click: event => this.#click(event)
			}
		});
	}

	get htmlHeader() {
		return this.#header;
	}

	connectedCallback() {
		let parentElement = this.parentElement;
		if (parentElement && parentElement.tagName == 'HARMONY-TAB-GROUP') {
			parentElement.addTab(this);
			this.#group = parentElement;
		}
	}

	attributeChangedCallback(name, oldValue, newValue) {
		switch (name) {
			case 'data-i18n':
				this.#header.setAttribute('data-i18n', newValue);
				break;
			case 'disabled':
				this.disabled = newValue;
				break;
		}
	}

	set disabled(disabled) {
		this.#disabled = disabled ? true : false;
		this.#header.classList[this.#disabled?'add':'remove']('disabled');
	}

	get disabled() {
		return this.#disabled;
	}

	activate() {
		this.active = true;
	}

	set active(active) {
		if (this.#active != active) {
			this.#active = active;
			if (active) {
				this.dispatchEvent(new CustomEvent('activated'));
			} else {
				this.dispatchEvent(new CustomEvent('deactivated'));
			}
		}
		display(this, active);
		if (active) {
			this.#header.classList.add('activated');
		} else {
			this.#header.classList.remove('activated');
		}

		if (active && this.#group) {
			this.#group.active = this;
		}
	}

	get active() {
		return this.#active;
	}

	#click() {
		if (!this.#disabled) {
			this.activate();
		}
	}

	static get observedAttributes() {
		return ['data-i18n', 'disabled'];
	}
}

class HTMLHarmonyTabGroupElement extends HTMLElement {
	#tabs = new Set();
	#header;
	#content;
	#activeTab;
	constructor() {
		super();
		this.#header = createElement('div', {class: 'harmony-tab-group-header'});
		this.#content = createElement('div', {class: 'harmony-tab-group-content'});
	}

	connectedCallback() {
		this.append(this.#header, this.#content);
	}

	addTab(tab) {
		this.#tabs.add(tab);
		if (!this.#activeTab) {
			this.#activeTab = tab;
		}
		this.#refresh();
	}

	#refresh() {
		for (let tab of this.#tabs) {
			this.#header.append(tab.htmlHeader);
			this.#content.append(tab);
			if (tab != this.#activeTab) {
				tab.active = false;
			}
		}

		this.#activeTab.active = true;
	}

	set active(tab) {
		if (this.#activeTab != tab) {
			this.#activeTab = tab;
			this.#refresh();
		}
	}

	clear() {
		this.#tabs.clear();
		this.#activeTab = undefined;
		this.#header.innerHTML = '';
		this.#content.innerHTML = '';
	}
}

class HTMLHarmonyToggleButtonElement extends HTMLElement {
	constructor() {
		super();
		this._state = false;

		this._buttonOn = createElement('span');
		this._buttonOn.className = 'i18n-title toggle-button-on';
		this._buttonOff = createElement('span');
		this._buttonOff.className = 'i18n-title toggle-button-off';

		hide(this._buttonOn);

		this.addEventListener('click', event=>{this._click(event);});
	}

	connectedCallback() {
		this.className = 'toggle-button';
		this.appendChild(this._buttonOff);
		this.appendChild(this._buttonOn);
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if (name == 'data-i18n-on') {
			this._buttonOn.setAttribute('data-i18n-title', newValue);
			//I18n.updateElement(this._buttonOn);
		}
		if (name == 'data-i18n-off') {
			this._buttonOff.setAttribute('data-i18n-title', newValue);
			//I18n.updateElement(this._buttonOff);
		}
		if (name == 'state') {
			this.state = newValue;
		}
		if (name == 'src-on') {
			this._buttonOn.style.backgroundImage = `url(${newValue})`;
		}
		if (name == 'src-off') {
			this._buttonOff.style.backgroundImage = `url(${newValue})`;
		}
	}

	get state() {
		return this._state;
	}

	set state(state) {
		state = state ? true : false;
		if (this._state != state) {
			this._state = state;
			this.dispatchEvent(new CustomEvent('change', {detail:{oldState:this._state, newState:state}}));

			if (state) {
				show(this._buttonOn);
				hide(this._buttonOff);
			} else {
				hide(this._buttonOn);
				show(this._buttonOff);
			}
		}
	}

	_click() {
		this.state = !this._state;
	}

	static get observedAttributes() {
		return ['data-i18n-on', 'data-i18n-off', 'state', 'src-on', 'src-off'];
	}
}

export { HTMLHarmonyAccordionElement, HTMLHarmonyContextMenuElement, HTMLHarmonyCopyElement, HTMLHarmonyLabelPropertyElement, HTMLHarmonyPaletteElement, HTMLHarmonyPanelElement, HTMLHarmonyRadioElement, HTMLHarmonySelectElement, HTMLHarmonySlideshowElement, HTMLHarmonySwitchElement, HTMLHarmonyTabElement, HTMLHarmonyTabGroupElement, HTMLHarmonyToggleButtonElement, createElement, createElementNS, display, hide, show, styleInject, toggle, updateElement, visible };
