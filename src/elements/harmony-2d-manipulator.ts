import { shadowRootStyle } from '../harmony-css';
import { createElement, hide, show, display } from '../harmony-html.js';
import manipulator2dCSS from '../css/harmony-2d-manipulator.css';
import { toBool } from '../utils/attributes';

interface ResizeMatrix {
	a: 0 | 1;
	b: 0 | 1;
	c: 0 | 1;
	d: 0 | 1;
}

export enum ManipulatorDirection {
	All = 'all',
	X = 'x',
	Y = 'y',
	None = 'none',
}

function getDirection(s: string): ManipulatorDirection {
	switch (s) {
		case 'x':
			return ManipulatorDirection.X;
		case 'y':
			return ManipulatorDirection.Y;
		case 'none':
			return ManipulatorDirection.None;
		case 'all':
		default:
			return ManipulatorDirection.All
	}
}

const CORNERS = [[0, 0], [0, 1], [1, 1], [1, 0]];

export class HTMLHarmony2dManipulatorElement extends HTMLElement {
	#shadowRoot: ShadowRoot;
	#htmlQuad: HTMLElement;
	#doOnce = true;
	#translate: ManipulatorDirection = ManipulatorDirection.All;
	#rotate = true;
	#scale: ManipulatorDirection = ManipulatorDirection.All;
	#skew: ManipulatorDirection = ManipulatorDirection.All;
	#htmlScaleCorners = [];
	#top: number = 50;
	#left: number = 50;
	#width: number = 50;
	#height: number = 50;
	#rotation: number = 0;
	#dragCorner: number = -1;
	#startPageX: number = 0;
	#startPageY: number = 0;
	#minWidth = 0;
	#minHeight = 0;


	#qp0_x: number;
	#qp0_y: number;
	#pp_x: number;
	#pp_y: number;

	dragBottom = false;
	dragTop = false;
	dragStart = false;
	dragEnd = false;

	constructor() {
		super();
		this.#shadowRoot = this.attachShadow({ mode: 'open' });
		shadowRootStyle(this.#shadowRoot, manipulator2dCSS);

		this.#htmlQuad = createElement('div', {
			parent: this.#shadowRoot,
			class: 'manipulator',
			//style: "width:100px;height:100px;display:block;background-color:red;",
			child: [
				/*this.#htmlHueSelector = createElement('div', {
					id: 'hue-selector',
					class: 'selector',
					events: {
						mousedown: event => this.#handleMouseDown(event),
					},
				})*/
			],
			events: {
				mousedown: event => {
					//this.#updateHue(event.offsetX / this.#htmlHuePicker.offsetWidth);
					//this.#handleMouseDown(event, this.#htmlHueSelector);
				},
			},
		});

		for (let i = 0; i < 4; i++) {
			const htmlCorner = createElement('div', {
				class: 'corner',
				parent: this.#htmlQuad,
				events: {
					mousedown: (event: MouseEvent) => this.#startDragCorner(event, i),
				}

			});

			this.#htmlScaleCorners.push(htmlCorner);
		}

		document.addEventListener('mousemove', (event: MouseEvent) => this.#onMouseMove(event));
		document.addEventListener('mouseup', (event: MouseEvent) => this.#stopDrag(event));

	}

	#onMouseMove(event: MouseEvent) {
		this.#resize(event);
	}

	#stopDrag(event: MouseEvent) {
		this.#stopDragCorner(event);
	}

	#stopDragCorner(event: MouseEvent) {
		if (this.#dragCorner >= 0) {

		}
		this.#dragCorner = -1;
	}

	#startDragCorner(event: MouseEvent, i: number) {
		this.#dragCorner = i;
		this.#startPageX = event.pageX;
		this.#startPageY = event.pageY;
		this.#initStartPositions(event);
	}

	#resize(event: MouseEvent) {
		if (this.#dragCorner >= 0) {
			this.#deltaResize(event);
			this.#refresh();
		}
	}

	connectedCallback() {
		this.#refresh();
	}

	#refresh() {
		this.style.setProperty('--translate', this.#translate);
		this.style.setProperty('--rotate', this.#rotate ? '1' : '0');
		this.style.setProperty('--scale', this.#scale);
		this.style.setProperty('--skew', this.#skew);

		this.#htmlQuad.style.left = `${this.#left}px`;
		this.#htmlQuad.style.top = `${this.#top}px`;
		this.#htmlQuad.style.width = `${this.#width}px`;
		this.#htmlQuad.style.height = `${this.#height}px`;


		for (let i = 0; i < 4; i++) {
			const c = CORNERS[i];
			const htmlCorner = this.#htmlScaleCorners[i];
			htmlCorner.style.left = `${c[0] * this.#width}px`;
			htmlCorner.style.top = `${c[1] * this.#height}px`;
		}
	}

	attributeChangedCallback(name: string, oldValue: string, newValue: string) {
		switch (name) {
			case 'translate':
				this.#translate = getDirection(newValue);
				break;
			case 'rotate':
				this.#rotate = toBool(newValue);
				break;
			case 'scale':
				this.#scale = getDirection(newValue);
				break;
			case 'skew':
				this.#skew = getDirection(newValue);
				break;
		}
		this.#refresh();
	}

	static get observedAttributes() {
		return ['translate', 'rotate', 'scale', 'skew'];
	}

	#deltaResize(event: MouseEvent) {
		const delta: { x: number; y: number } = this.#getDelta(event);

		const qp_x: number = this.#qp0_x + delta.x;
		const qp_y: number = this.#qp0_y + delta.y;

		const cp_x: number = (qp_x + this.#pp_x) / 2.0;
		const cp_y: number = (qp_y + this.#pp_y) / 2.0;

		const mtheta: number = -this.#rotation;
		const cos_mt: number = Math.cos(mtheta);
		const sin_mt: number = Math.sin(mtheta);

		let q_x: number = qp_x * cos_mt - qp_y * sin_mt - cos_mt * cp_x + sin_mt * cp_y + cp_x;
		let q_y: number = qp_x * sin_mt + qp_y * cos_mt - sin_mt * cp_x - cos_mt * cp_y + cp_y;

		let p_x: number = this.#pp_x * cos_mt - this.#pp_y * sin_mt - cos_mt * cp_x + sin_mt * cp_y + cp_x;
		let p_y: number = this.#pp_x * sin_mt + this.#pp_y * cos_mt - sin_mt * cp_x - cos_mt * cp_y + cp_y;

		const matrix: ResizeMatrix = this.#resizeMatrix();

		const wtmp: number = matrix.a * (q_x - p_x) + matrix.c * (p_x - q_x);
		const htmp: number = matrix.b * (q_y - p_y) + matrix.d * (p_y - q_y);

		let w: number;
		let h: number;

		if (wtmp < this.#minWidth || htmp < this.#minHeight) {
			w = Math.max(this.#minWidth, wtmp);
			h = Math.max(this.#minHeight, htmp);

			const theta: number = -1 * mtheta;
			const cos_t: number = Math.cos(theta);
			const sin_t: number = Math.sin(theta);

			const dh_x: number = -sin_t * h;
			const dh_y: number = cos_t * h;

			const dw_x: number = cos_t * w;
			const dw_y: number = sin_t * w;

			const qp_x_min: number = this.#pp_x + (matrix.a - matrix.c) * dw_x + (matrix.b - matrix.d) * dh_x;
			const qp_y_min: number = this.#pp_y + (matrix.a - matrix.c) * dw_y + (matrix.b - matrix.d) * dh_y;

			const cp_x_min: number = (qp_x_min + this.#pp_x) / 2.0;
			const cp_y_min: number = (qp_y_min + this.#pp_y) / 2.0;

			q_x = qp_x_min * cos_mt - qp_y_min * sin_mt - cos_mt * cp_x_min + sin_mt * cp_y_min + cp_x_min;
			q_y = qp_x_min * sin_mt + qp_y_min * cos_mt - sin_mt * cp_x_min - cos_mt * cp_y_min + cp_y_min;

			p_x = this.#pp_x * cos_mt - this.#pp_y * sin_mt - cos_mt * cp_x_min + sin_mt * cp_y_min + cp_x_min;
			p_y = this.#pp_x * sin_mt + this.#pp_y * cos_mt - sin_mt * cp_x_min - cos_mt * cp_y_min + cp_y_min;
		} else {
			w = wtmp;
			h = htmp;
		}

		const l: number = matrix.c * q_x + matrix.a * p_x;
		const t: number = matrix.d * q_y + matrix.b * p_y;

		this.#left = this.convertToUnit(l, 'width');
		this.#width = this.convertToUnit(w, 'width');

		this.#top = this.convertToUnit(t, 'height');
		this.#height = this.convertToUnit(h, 'height');
	}

	#getDelta(event: MouseEvent): { x: number; y: number } {
		const currentX: number = (event).clientX;
		const currentY: number = (event).clientY;

		return {
			x: this.dragBottom || this.dragTop ? 0 : currentX - this.#startPageX,
			y: this.dragStart || this.dragEnd ? 0 : currentY - this.#startPageY
		};
	}

	#resizeMatrix(): ResizeMatrix {
		const a: 0 | 1 = (this.#dragCorner == 2) || (this.#dragCorner == 3) || this.dragEnd ? 1 : 0;
		const b: 0 | 1 = (this.#dragCorner == 2) || (this.#dragCorner == 1) || this.dragStart || this.dragBottom ? 1 : 0;
		const c: 0 | 1 = a === 1 ? 0 : 1;
		const d: 0 | 1 = b === 1 ? 0 : 1;

		return {
			a,
			b,
			c,
			d
		};
	}

	private convertToUnit(value: number, ratio: 'width' | 'height'): number {
		return value;
		/*
		if (this.unit === 'px') {
		}

		if (this.unit === 'viewport') {
			const windowSize: number = ratio === 'width' ? window.innerWidth || screen.width : window.innerHeight || screen.height;
			return (value * 100) / windowSize;
		}

		const parentSize: number = ratio === 'width' ? this.parentWidth : this.parentHeight;
		return (value * 100) / parentSize;
		*/
	}


	#initStartPositions(event: MouseEvent) {
		this.#startPageX = event.pageX;
		this.#startPageY = event.pageY;

		//await this.initParentSize();

		//this.initStartPositionsMove();
		//this.initStartPositionsRotation();
		this.#initStartPositionsResize();
	  }

	#initStartPositionsResize() {
		const theta: number = this.#rotation;
		const cos_t: number = Math.cos(theta);
		const sin_t: number = Math.sin(theta);

		//const css: CSSStyleDeclaration = window.getComputedStyle(this.el);

		const l: number = this.#left;//parseFloat(css.left);
		const t: number = this.#top;//parseFloat(css.top);
		const w: number = this.#width;//parseFloat(css.width);
		const h: number = this.#height;//parseFloat(css.height);

		const matrix: ResizeMatrix = this.#resizeMatrix();

		const c0_x = l + w / 2.0;
		const c0_y = t + h / 2.0;

		const q0_x: number = l + matrix.a * w;
		const q0_y: number = t + matrix.b * h;

		const p0_x: number = l + matrix.c * w;
		const p0_y: number = t + matrix.d * h;

		this.#qp0_x = q0_x * cos_t - q0_y * sin_t - c0_x * cos_t + c0_y * sin_t + c0_x;
		this.#qp0_y = q0_x * sin_t + q0_y * cos_t - c0_x * sin_t - c0_y * cos_t + c0_y;

		this.#pp_x = p0_x * cos_t - p0_y * sin_t - c0_x * cos_t + c0_y * sin_t + c0_x;
		this.#pp_y = p0_x * sin_t + p0_y * cos_t - c0_x * sin_t - c0_y * cos_t + c0_y;
	  }
}
