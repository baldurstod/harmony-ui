import { createElement, hide } from '../harmony-html';
import splitterCSS from '../css/harmony-splitter.css';
import { shadowRootStyleSync } from '../harmony-css';

export class HTMLHarmonySplitterElement extends HTMLElement {
	#shadowRoot;
	#htmlPanel1: HTMLSlotElement;
	#htmlPanel2: HTMLSlotElement;
	#htmlGutter: HTMLElement;
	#doOnce = true;
	#orientation: string = 'v';
	#split = 0.5;
	#startOffsetLeft = 0;
	#startOffsetTop = 0;
	#startPageX = 0;
	#startPageY = 0;
	#startOffsetX = 0;
	#startOffsetY = 0;
	#dragging = false;

	constructor() {
		super();
		this.#shadowRoot = this.attachShadow({ mode: 'closed' });
		shadowRootStyleSync(this.#shadowRoot, splitterCSS);// sync version is used to ensure style is loaded before computation occurs

		this.#htmlPanel1 = createElement('slot', {
			class: 'panel',
			name: '1',
			parent: this.#shadowRoot,
		}) as HTMLSlotElement;
		this.#htmlGutter = createElement('div', {
			class: 'gutter',
			parent: this.#shadowRoot,
			/*events: {
				mousedown: event => this.#handleMouseDown(event),
			},*/
		}) as HTMLElement;
		this.#htmlPanel2 = createElement('slot', {
			class: 'panel',
			name: '2',
			parent: this.#shadowRoot,
		}) as HTMLSlotElement;

		this.#htmlGutter.addEventListener('mousedown', event => this.#handleMouseDown(event));
		document.body.addEventListener('mousemove', event => this.#handleMouseMove(event), { capture: true });
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

	setOrientation(orientation: string) {
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

	#handleMouseDown(event: MouseEvent) {
		this.#startOffsetLeft = this.#htmlGutter.offsetLeft;
		this.#startOffsetTop = this.#htmlGutter.offsetTop;
		this.#startOffsetX = event.offsetX;
		this.#startOffsetY = event.offsetY;
		this.#startPageX = event.pageX;
		this.#startPageY = event.pageY;
		this.#dragging = true;
		event.stopPropagation();
	}

	#handleMouseMove(event: MouseEvent) {
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

	attributeChangedCallback(name: string, oldValue: string, newValue: string) {
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
