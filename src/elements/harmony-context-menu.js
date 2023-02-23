export class HarmonyContextMenu extends HTMLElement {
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
