import { createElement, hide } from '../harmony-html.js';
import splitterCSS from '../css/harmony-splitter.css';
import { shadowRootStyleSync } from '../harmony-css.js';

export class HTMLHarmonySplitterElement extends HTMLElement {
	#shadowRoot;
	#htmlPanel1;
	#htmlPanel2;
	#htmlGutter;
	#doOnce = true;
	#orientation;
	#split = 0.5;
	#startOffsetLeft;
	#startOffsetTop;
	#startPageX;
	#startPageY;
	#startOffsetX;
	#startOffsetY;
	#dragging = false;

	constructor(options) {
		super();
		this.#initHtml();
		//this.#doOnceOptions = options;
	}

	#initHtml() {
		this.#shadowRoot = this.attachShadow({ mode: 'closed' });
		shadowRootStyleSync(this.#shadowRoot, splitterCSS);// sync version is used to ensure style is loaded before computation occurs

		this.#htmlPanel1 = createElement('slot', {
			class: 'panel',
			name: '1',
			parent: this.#shadowRoot,
		});
		this.#htmlGutter = createElement('div', {
			class: 'gutter',
			parent: this.#shadowRoot,
			/*events: {
				mousedown: event => this.#handleMouseDown(event),
			},*/
		});
		this.#htmlPanel2 = createElement('slot', {
			class: 'panel',
			name: '2',
			parent: this.#shadowRoot,
		});

		this.#htmlGutter.addEventListener('mousedown', event => this.#handleMouseDown(event));
		document.body.addEventListener('mousemove', event => this.#handleMouseMove(event), {capture: true});
		document.body.addEventListener('mouseup', () => this.#dragging = false);
	}

	connectedCallback() {
		if (this.#doOnce) {
			this.setOrientation(this.getAttribute('orientation') ?? 'v');
			this.#update();
			this.#doOnce = false;
		}
	}

	#update() {
		this.#htmlPanel1.style.flexBasis = this.#split * 100 + '%';
		this.#htmlPanel2.style.flexBasis = (1 - this.#split) * 100 + '%';
	}

	setOrientation(orientation) {
		this.classList.remove('vertical', 'horizontal');
		switch (orientation) {
			case 'v':
				case 'vertical':
				this.#orientation = 'v';
				this.classList.add('vertical');
				break;
			case 'h':
			case 'horizontal':
				this.#orientation = 'h';
				this.classList.add('horizontal');
				break;
		}
	}

	#handleMouseDown(event) {
		this.#startOffsetLeft = this.#htmlGutter.offsetLeft;
		this.#startOffsetTop = this.#htmlGutter.offsetTop;
		this.#startOffsetX = event.offsetX;
		this.#startOffsetY = event.offsetY;
		this.#startPageX = event.pageX;
		this.#startPageY = event.pageY;
		this.#dragging = true;
		event.stopPropagation();
	}

	#handleMouseMove(event) {
		if (!this.#dragging) {
			return;
		}

		let elemRect = this.getBoundingClientRect();
		const clientX = event.clientX;
		const clientY = event.clientY;
		if (this.#orientation == 'v') {
			this.#split = (clientX - elemRect.x) / elemRect.width;
		} else {
			this.#split = (clientY - elemRect.y) / elemRect.height;
		}

		this.#split = Math.max(Math.min(this.#split, 0.99), 0.01);

		this.dispatchEvent(new CustomEvent('change', { detail: { value: this.#split } }));

		this.#update();
	}

	attributeChangedCallback(name, oldValue, newValue) {
		switch (name) {
			case 'orientation':
				this.setOrientation(newValue);
				break;
		}
	}

	static get observedAttributes() {
		return ['orientation'];
	}
}
