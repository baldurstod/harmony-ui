import { createElement } from '../harmony-html';
import manipulator2dCSS from '../css/harmony-2d-manipulator.css';
import { toBool } from '../utils/attributes';
import { shadowRootStyle } from '../harmony-css';
import { injectGlobalCss } from '../utils/globalcss';

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
			return ManipulatorDirection.All;
	}
}

function getResizeOrigin(s: string): ManipulatorResizeOrigin {
	switch (s) {
		case 'center':
			return ManipulatorResizeOrigin.Center;
		default:
			return ManipulatorResizeOrigin.OppositeCorner;
	}
}

function hasX(d: ManipulatorDirection): boolean {
	return d == ManipulatorDirection.All || d == ManipulatorDirection.X;
}

function hasY(d: ManipulatorDirection): boolean {
	return d == ManipulatorDirection.All || d == ManipulatorDirection.Y;
}

export enum ManipulatorUpdatedEventType {
	Position = 'position',
	Size = 'size',
	Rotation = 'rotation',
}

export type ManipulatorUpdatedEventData = {
	type: ManipulatorUpdatedEventType;
	position: v2,
	width: number,
	height: number,
	rotation: number,
	topLeft: v2,
	topRight: v2,
	bottomLeft: v2,
	bottomRight: v2,
};

const CORNERS = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
const SCALE_CORNERS = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
const SIDES = [[0.5, 0], [0.5, 1], [0, 0.5], [1, 0.5]];
const SCALE_SIDES = [[0, 1], [0, 1], [1, 0], [1, 0]];
const SNAP_POSITION = 20;// Pixels
const SNAP_ROTATION = 15;// Degrees

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

export enum ManipulatorCorner {
	None = -1,
	TopLeft = 0,
	TopRight = 1,
	BottomLeft = 2,
	BottomRight = 3,
}

export enum ManipulatorSide {
	None = -1,
	Top = 0,
	Bottom = 1,
	Left = 2,
	Right = 3,
}

export enum ManipulatorResizeOrigin {
	OppositeCorner = 0,
	Center = 1,
}

type v2 = { x: number, y: number };

export class HTMLHarmony2dManipulatorElement extends HTMLElement {
	#shadowRoot: ShadowRoot;
	#htmlQuad: HTMLElement;
	#translationMode: ManipulatorDirection = ManipulatorDirection.All;
	#canRotate = true;
	#resizeMode: ManipulatorDirection = ManipulatorDirection.All;
	#scale: ManipulatorDirection = ManipulatorDirection.All;
	#skew: ManipulatorDirection = ManipulatorDirection.All;
	#htmlScaleCorners: Array<HTMLElement> = [];
	#htmlResizeSides: Array<HTMLElement> = [];
	#htmlRotator?: HTMLElement;
	#center: v2 = { x: 25, y: 25 };
	#width: number = 50;
	#height: number = 50;
	#previousCenter: v2 = { x: -1, y: -1 };
	#previousWidth: number = -1;
	#previousHeight: number = -1;
	#rotation: number = 0;
	#previousRotation: number = 0;
	#dragCorner: ManipulatorCorner = ManipulatorCorner.None;
	#dragSide: ManipulatorSide = ManipulatorSide.None;
	#dragThis = false;
	#dragRotator = false;
	#startPageX: number = 0;
	#startPageY: number = 0;
	#minWidth = 0;
	#minHeight = 0;
	#startWidth: number = 0;
	#startHeight: number = 0;
	#startTop: number = 0;
	#startLeft: number = 0;
	#startCenter: v2 = { x: 0, y: 0 };
	#startCorners: Array<v2> = [];
	#c0_x: number = 0;
	#c0_y: number = 0;
	#qp0_x: number = 0;
	#qp0_y: number = 0;
	#pp_x: number = 0;
	#pp_y: number = 0;
	#dragging = false;
	#transformScale = 1;
	#resizeOrigin = ManipulatorResizeOrigin.OppositeCorner;

	constructor() {
		super();
		this.#shadowRoot = this.attachShadow({ mode: 'closed' });
		shadowRootStyle(this.#shadowRoot, manipulator2dCSS);

		this.#htmlQuad = createElement('div', {
			parent: this.#shadowRoot,
			class: 'manipulator',
			child: this.#htmlRotator = createElement('div', {
				class: 'rotator',
				events: {
					mousedown: (event: MouseEvent) => {
						switch (event.button) {
							case 0:
								event.stopPropagation();
								this.#startDragRotator(event);
								break;
							case 2:
								event.stopPropagation();
								this.#rotateInput(event);
								break;
						}
					},
				}
			}) as HTMLElement,
			events: {
				mousedown: (event: MouseEvent) => {
					switch (event.button) {
						case 0:
							this.#startTranslate(event);
							break;
						case 2:
							this.#translateInput(event);
							break;
					}
				},
			}
		}) as HTMLElement;

		for (let i = 0; i < 4; i++) {
			const htmlCorner = createElement('div', {
				class: 'corner',
				parent: this.#htmlQuad,
				events: {
					mousedown: (event: MouseEvent) => {
						if (event.button == 0) {
							this.#startDragCorner(event, i);
						}
					},
				}
			}) as HTMLElement;
			this.#htmlScaleCorners.push(htmlCorner);
		}

		for (let i = 0; i < 4; i++) {
			const htmlCorner = createElement('div', {
				class: `side ${i < 2 ? 'y' : 'x'}`,
				parent: this.#htmlQuad,
				events: {
					mousedown: (event: MouseEvent) => {
						if (event.button == 0) {
							this.#startDragSide(event, i);
						}
					},
				}
			}) as HTMLElement;
			this.#htmlResizeSides.push(htmlCorner);
		}

		document.addEventListener('mousemove', (event: MouseEvent) => this.#onMouseMove(event));
		document.addEventListener('mouseup', (event: MouseEvent) => this.#stopDrag(event));
	}

	setTopLeft(x: number, y: number) {

	}

	#onMouseMove(event: MouseEvent) {
		this.#translate(event);
		this.#resize(event);
		this.#rotate(event);
	}

	#stopDrag(event: MouseEvent) {
		if (this.#dragging) {
			let type: ManipulatorUpdatedEventType = ManipulatorUpdatedEventType.Position;
			switch (true) {
				case this.#dragThis:
					type = ManipulatorUpdatedEventType.Position;
					break;
				case this.#dragRotator:
					type = ManipulatorUpdatedEventType.Rotation;
				case this.#dragCorner >= 0:
				case this.#dragSide >= 0:
					type = ManipulatorUpdatedEventType.Size;
					break;
			}

			this.#dragging = false;
			this.#dispatchEvent('updateend', type);
		}
		this.#stopTranslate(event);
		this.#stopDragRotator(event);
		this.#stopDragCorner(event);
		this.#stopDragSide(event);
	}

	#stopTranslate(event: MouseEvent) {
		this.#dragThis = false;
	}

	#stopDragRotator(event: MouseEvent) {
		this.#dragRotator = false;
	}

	#stopDragCorner(event: MouseEvent) {
		if (this.#dragCorner < 0) {
			return;
		}

		this.#htmlScaleCorners[this.#dragCorner].classList.remove('grabbing');
		this.classList.remove('grabbing');
		this.#dragCorner = ManipulatorCorner.None;
	}

	#stopDragSide(event: MouseEvent) {
		if (this.#dragSide < 0) {
			return;
		}

		this.#htmlResizeSides[this.#dragSide].classList.remove('grabbing');
		this.classList.remove('grabbing');
		this.#dragSide = ManipulatorSide.None;
	}

	#startTranslate(event: MouseEvent) {
		if (this.#dragging) {
			return;
		}
		this.#dragging = true;
		this.#dragThis = true;
		this.#initStartPositions(event);
	}

	#startDragRotator(event: MouseEvent) {
		if (this.#dragging) {
			return;
		}
		this.#dragging = true;
		this.#dragRotator = true;
		this.#htmlRotator?.classList.add('grabbing');
		this.classList.add('grabbing');
		this.#initStartPositions(event);
	}

	#startDragCorner(event: MouseEvent, i: ManipulatorCorner) {
		if (this.#dragging) {
			return;
		}
		this.#htmlScaleCorners[i].classList.add('grabbing');
		this.classList.add('grabbing');

		this.#dragging = true;
		this.#dragCorner = i;
		this.#initStartPositions(event);
	}

	#startDragSide(event: MouseEvent, i: ManipulatorSide) {
		if (this.#dragging) {
			return;
		}
		this.#htmlResizeSides[i].classList.add('grabbing');
		this.classList.add('grabbing');

		this.#dragging = true;
		this.#dragSide = i;
		this.#initStartPositions(event);
	}

	#translate(event: MouseEvent) {
		if (!this.#dragThis) {
			return;
		}

		this.#deltaMove(event, true, true);
		this.#refresh();

		/*
		if (this.drag === 'x-axis') {
			this.deltaMove($event, false, true);
		  } else if (this.drag === 'y-axis') {
			this.deltaMove($event, true, false);
		  } else {
			this.deltaMove($event, true, true);
		  }
			*/
	}

	#resize(event: MouseEvent) {
		if (this.#dragCorner > ManipulatorCorner.None || this.#dragSide > ManipulatorSide.None) {
			this.#deltaResize(event);
			this.#refresh();
		}
	}

	#rotate(event: MouseEvent) {
		if (this.#dragRotator) {
			const currentX: number = event.clientX;
			const currentY: number = event.clientY;

			this.#rotation = -Math.atan2(currentX - this.#startCenter.x, currentY - this.#startCenter.y) + Math.PI;
			if (event.ctrlKey) {
				this.#snapRotation();
			}
			this.#update(ManipulatorUpdatedEventType.Rotation);
			this.#refresh();
		}
	}

	#snapPosition(a: number): number {
		return Math.round(a / SNAP_POSITION) * SNAP_POSITION;
	}

	#snapRotation() {
		this.#rotation = Math.round(this.#rotation * RAD_TO_DEG / SNAP_ROTATION) * SNAP_ROTATION * DEG_TO_RAD;
	}

	#update(type: ManipulatorUpdatedEventType) {
		if (this.#previousHeight == this.#height && this.#previousCenter.x == this.#center.x && this.#previousCenter.y == this.#center.y && this.#previousWidth == this.#width && this.#previousRotation == this.#rotation) {
			return;
		}

		this.#previousHeight = this.#height;
		this.#previousWidth = this.#width;
		this.#previousCenter.x = this.#center.x;
		this.#previousCenter.y = this.#center.y;
		this.#previousRotation = this.#rotation;
		this.#dispatchEvent('change', type);
	}

	#dispatchEvent(name: string, type: ManipulatorUpdatedEventType) {
		this.dispatchEvent(new CustomEvent<ManipulatorUpdatedEventData>(name, {
			detail: {
				type: type,
				position: { x: this.#center.x, y: this.#center.y },
				width: this.#width,
				height: this.#height,
				rotation: this.#rotation,
				topLeft: this.getTopLeft(),
				topRight: this.getTopRight(),
				bottomLeft: this.getBottomLeft(),
				bottomRight: this.getBottomRight(),
			}
		}));
	}

	getTopLeft() {
		return this.getCorner(ManipulatorCorner.TopLeft);
	}

	getTopRight() {
		return this.getCorner(ManipulatorCorner.TopRight);
	}

	getBottomLeft() {
		return this.getCorner(ManipulatorCorner.BottomLeft);
	}

	getBottomRight() {
		return this.getCorner(ManipulatorCorner.BottomRight);
	}

	getCorner(i: ManipulatorCorner): v2 {
		if (i < 0 || i >= 4) {
			return { x: 0, y: 0 };
		}
		const c = CORNERS[i];
		const x = c[0] * this.#width * 0.5;
		const y = c[1] * this.#height * 0.5;

		return {
			x: x * Math.cos(this.#rotation) - y * Math.sin(this.#rotation) + this.#center.x,
			y: x * Math.sin(this.#rotation) + y * Math.cos(this.#rotation) + this.#center.y,
		};
	}

	set(values: { rotation?: number, left?: number, top?: number, width?: number, height?: number }): void {
		if (values.rotation !== undefined) {
			this.#rotation = values.rotation;
		}
		if (values.left !== undefined) {
			this.#center.x = values.left;
		}
		if (values.top !== undefined) {
			this.#center.y = values.top;
		}
		if (values.width !== undefined) {
			this.#width = values.width;
		}
		if (values.height !== undefined) {
			this.#height = values.height;
		}
		this.#refresh();
	}

	setResizeMode(m: ManipulatorDirection) {
		this.#resizeMode = m;
		this.#refresh();
	}

	setResizeOrigin(o: ManipulatorResizeOrigin) {
		this.#resizeOrigin = o;
		this.#refresh();
	}

	connectedCallback() {
		this.#refresh();
	}

	#refresh() {
		this.style.setProperty('--translate', this.#translationMode);
		this.style.setProperty('--rotate', this.#canRotate ? '1' : '0');
		this.style.setProperty('--resize-x', hasX(this.#resizeMode) ? '1' : '0');
		this.style.setProperty('--resize-y', hasY(this.#resizeMode) ? '1' : '0');
		this.style.setProperty('--scale', this.#scale);
		this.style.setProperty('--skew', this.#skew);

		this.#htmlQuad.style.rotate = `${this.#rotation}rad`;

		this.#htmlQuad.style.left = `${this.#center.x - this.#width * 0.5}px`;
		this.#htmlQuad.style.top = `${this.#center.y - this.#height * 0.5}px`;
		this.#htmlQuad.style.width = `${this.#width}px`;
		this.#htmlQuad.style.height = `${this.#height}px`;


		for (let i = 0; i < 4; i++) {
			const c = CORNERS[i];
			const htmlCorner = this.#htmlScaleCorners[i];
			htmlCorner.style.left = `${(c[0] == -1 ? 0 : 1) * this.#width}px`;
			htmlCorner.style.top = `${(c[1] == -1 ? 0 : 1) * this.#height}px`;
		}

		for (let i = 0; i < 4; i++) {
			const s = SIDES[i];
			const htmlSide = this.#htmlResizeSides[i];
			htmlSide.style.left = `${s[0] * this.#width}px`;
			htmlSide.style.top = `${s[1] * this.#height}px`;
		}

		if (this.#htmlRotator) {
			this.#htmlRotator.style.left = `${0.5 * this.#width}px`;
			this.#htmlRotator.style.top = `${-0.2 * this.#height}px`;
		}
	}

	attributeChangedCallback(name: string, oldValue: string, newValue: string) {
		switch (name) {
			case 'translate':
				this.#translationMode = getDirection(newValue);
				break;
			case 'rotate':
				this.#canRotate = toBool(newValue);
				break;
			case 'resize':
				this.#resizeMode = getDirection(newValue);
				break;
			case 'resize-origin':
				this.#resizeOrigin = getResizeOrigin(newValue);
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
		return ['translate', 'rotate', 'resize', 'scale', 'resize-origin', 'skew'];
	}

	#deltaMove(event: MouseEvent, top: boolean, left: boolean) {
		const delta: { x: number; y: number } = this.#getDelta(event);

		const deltaX: number = this.convertToUnit(delta.x, 'width') * this.#transformScale;
		const deltaY: number = this.convertToUnit(delta.y, 'height') * this.#transformScale;

		if (top) {
			this.#center.y = this.#startTop + deltaY;
		}

		if (left) {
			this.#center.x = this.#startLeft + deltaX;
		}
		this.#update(ManipulatorUpdatedEventType.Position);
	}

	#deltaResize(event: MouseEvent) {
		function dot(a: v2, b: v2) {
			return a.x * b.x + a.y * b.y;
		}

		const delta: { x: number, y: number } = this.#getDelta(event);

		if (!event.shiftKey && this.#dragCorner > ManipulatorCorner.None) {
			const tl = this.#startCorners[ManipulatorCorner.TopLeft];
			const br = this.#startCorners[ManipulatorCorner.BottomRight];
			const startCenter: v2 = { x: (tl.x + br.x) * 0.5, y: (tl.y + br.y) * 0.5 };

			const v: v2 = { x: this.#startCorners[this.#dragCorner].x - startCenter.x, y: this.#startCorners[this.#dragCorner].y - startCenter.y };
			const norm = Math.sqrt(v.x * v.x + v.y * v.y);
			v.x /= norm;
			v.y /= norm;

			const d = dot(delta, v);
			delta.x = v.x * d;
			delta.y = v.y * d;
		}

		if (this.#dragSide > ManipulatorSide.None) {
			const c = SCALE_SIDES[this.#dragSide];
			const v = { x: c[0] * Math.cos(this.#rotation) - c[1] * Math.sin(this.#rotation), y: c[0] * Math.sin(this.#rotation) + c[1] * Math.cos(this.#rotation) }
			const d = dot(delta, v);
			delta.x = v.x * d;
			delta.y = v.y * d;
		}

		delta.x *= this.#transformScale;
		delta.y *= this.#transformScale;

		const qp_x: number = this.#qp0_x + delta.x;
		const qp_y: number = this.#qp0_y + delta.y;

		let resizeOrigin = this.#resizeOrigin;
		if (event.altKey) {
			if (resizeOrigin == ManipulatorResizeOrigin.Center) {
				resizeOrigin = ManipulatorResizeOrigin.OppositeCorner;
			} else {
				resizeOrigin = ManipulatorResizeOrigin.Center;
			}
		}

		const cp_x: number = resizeOrigin == ManipulatorResizeOrigin.Center ? this.#c0_x : (qp_x + this.#pp_x) * 0.5;
		const cp_y: number = resizeOrigin == ManipulatorResizeOrigin.Center ? this.#c0_y : (qp_y + this.#pp_y) * 0.5;

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

			const theta: number = -mtheta;
			const cos_t: number = Math.cos(theta);
			const sin_t: number = Math.sin(theta);

			const dh_x: number = -sin_t * h;
			const dh_y: number = cos_t * h;

			const dw_x: number = cos_t * w;
			const dw_y: number = sin_t * w;

			const qp_x_min: number = this.#pp_x + (matrix.a - matrix.c) * dw_x + (matrix.b - matrix.d) * dh_x;
			const qp_y_min: number = this.#pp_y + (matrix.a - matrix.c) * dw_y + (matrix.b - matrix.d) * dh_y;

			const cp_x_min: number = (qp_x_min + this.#pp_x) * 0.5;
			const cp_y_min: number = (qp_y_min + this.#pp_y) * 0.5;

			q_x = qp_x_min * cos_mt - qp_y_min * sin_mt - cos_mt * cp_x_min + sin_mt * cp_y_min + cp_x_min;
			q_y = qp_x_min * sin_mt + qp_y_min * cos_mt - sin_mt * cp_x_min - cos_mt * cp_y_min + cp_y_min;

			p_x = this.#pp_x * cos_mt - this.#pp_y * sin_mt - cos_mt * cp_x_min + sin_mt * cp_y_min + cp_x_min;
			p_y = this.#pp_x * sin_mt + this.#pp_y * cos_mt - sin_mt * cp_x_min - cos_mt * cp_y_min + cp_y_min;
		} else {
			w = wtmp;
			h = htmp;
		}

		let deltaCenterX = 0;
		let deltaCenterY = 0;
		let deltaWidth = w - this.#startWidth;
		let deltaHeight = h - this.#startHeight;

		const dx = (deltaWidth * Math.cos(this.#rotation) + deltaHeight * Math.sin(this.#rotation)) * 0.5;
		const dy = (deltaHeight * Math.cos(this.#rotation) + deltaWidth * Math.sin(this.#rotation)) * 0.5;

		if (resizeOrigin != ManipulatorResizeOrigin.Center) {
			switch (this.#dragSide) {
				case ManipulatorSide.Left:
					deltaCenterX = -dx;
					deltaCenterY = -dy;
					break;
				case ManipulatorSide.Right:
					deltaCenterX = dx;
					deltaCenterY = dy;
					break;
				case ManipulatorSide.Top:
					deltaCenterX = dx;
					deltaCenterY = -dy;
					break;
				case ManipulatorSide.Bottom:
					deltaCenterX = -dx;
					deltaCenterY = dy;
					break;
			}
			this.#center.x = this.#startCenter.x + deltaCenterX;
			this.#center.y = this.#startCenter.y + deltaCenterY;

			let oppositeCorner: ManipulatorCorner = ManipulatorCorner.None;
			switch (this.#dragCorner) {
				case ManipulatorCorner.TopLeft:
					oppositeCorner = ManipulatorCorner.BottomRight;
					break;
				case ManipulatorCorner.TopRight:
					oppositeCorner = ManipulatorCorner.BottomLeft;
					break;
				case ManipulatorCorner.BottomLeft:
					oppositeCorner = ManipulatorCorner.TopRight;
					break;
				case ManipulatorCorner.BottomRight:
					oppositeCorner = ManipulatorCorner.TopLeft;
					break;
			}

			if (oppositeCorner != ManipulatorCorner.None) {
				const startCorner = this.#startCorners[oppositeCorner];

				const c = CORNERS[this.#dragCorner];
				const x = c[0] * (this.#startWidth + deltaWidth) * 0.5;
				const y = c[1] * (this.#startHeight + deltaHeight) * 0.5;

				this.#center.x = startCorner.x + x * Math.cos(this.#rotation) - y * Math.sin(this.#rotation);
				this.#center.y = startCorner.y + x * Math.sin(this.#rotation) + y * Math.cos(this.#rotation);
			}
		} else {
			deltaWidth = 2 * deltaWidth;
			deltaHeight = 2 * deltaHeight;
		}

		this.#width = this.#startWidth + deltaWidth;
		this.#height = this.#startHeight + deltaHeight;
		//console.error(this.#height);

		this.#update(ManipulatorUpdatedEventType.Size);
	}

	#getDelta(event: MouseEvent): { x: number; y: number } {
		let currentX: number = event.pageX;
		let currentY: number = event.pageY;

		if (event.ctrlKey) {
			currentX = this.#snapPosition(currentX);
			currentY = this.#snapPosition(currentY);
		}

		return {
			x: currentX - this.#startPageX,
			y: currentY - this.#startPageY,
		};
	}

	#resizeMatrix(): ResizeMatrix {
		const a: 0 | 1 = (this.#dragCorner == ManipulatorCorner.BottomRight) || (this.#dragCorner == ManipulatorCorner.TopRight) || this.#dragSide == ManipulatorSide.Right ? 1 : 0;
		const b: 0 | 1 = (this.#dragCorner == ManipulatorCorner.BottomRight) || (this.#dragCorner == ManipulatorCorner.BottomLeft) || this.#dragSide == ManipulatorSide.Left || this.#dragSide == ManipulatorSide.Bottom ? 1 : 0;
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

		const rect = this.#htmlQuad.getBoundingClientRect();
		const width = Math.abs(this.#htmlQuad.offsetWidth * Math.cos(this.#rotation)) + Math.abs(this.#htmlQuad.offsetHeight * Math.sin(this.#rotation));

		if (rect.width != 0) {
			this.#transformScale = width / rect.width;
		} else {
			this.#transformScale = 1;
		}

		this.#initStartPositionsMove();
		this.#initStartPositionsRotation();
		this.#initStartPositionsResize();
		this.#initStartCorners();
	}

	#initStartPositionsMove() {
		this.#startWidth = this.#width;
		this.#startHeight = this.#height;
		this.#startLeft = this.#center.x;
		this.#startTop = this.#center.y;
	}

	#initStartPositionsRotation() {
		const rect: DOMRect = this.#htmlQuad.getBoundingClientRect();
		this.#startCenter.x = rect.left + rect.width * 0.5;
		this.#startCenter.y = rect.top + rect.height * 0.5;
	}

	#initStartPositionsResize() {
		const theta: number = this.#rotation;
		const cos_t: number = Math.cos(theta);
		const sin_t: number = Math.sin(theta);

		const l: number = this.#center.x// - this.#width * 0.5;
		const t: number = this.#center.y//- this.#height * 0.5;
		const w: number = this.#width;
		const h: number = this.#height;

		const matrix: ResizeMatrix = this.#resizeMatrix();

		this.#c0_x = this.#center.x;
		this.#c0_y = this.#center.y;

		const q0_x: number = l + matrix.a * w;
		const q0_y: number = t + matrix.b * h;

		const p0_x: number = l + matrix.c * w;
		const p0_y: number = t + matrix.d * h;

		this.#qp0_x = q0_x * cos_t - q0_y * sin_t - this.#c0_x * cos_t + this.#c0_y * sin_t + this.#c0_x;
		this.#qp0_y = q0_x * sin_t + q0_y * cos_t - this.#c0_x * sin_t - this.#c0_y * cos_t + this.#c0_y;

		this.#pp_x = p0_x * cos_t - p0_y * sin_t - this.#c0_x * cos_t + this.#c0_y * sin_t + this.#c0_x;
		this.#pp_y = p0_x * sin_t + p0_y * cos_t - this.#c0_x * sin_t - this.#c0_y * cos_t + this.#c0_y;
		console.error(this.#pp_x, this.#pp_y, this.#qp0_x, this.#qp0_y)
	}

	#initStartCorners() {
		for (let i = 0; i < 4; i++) {
			this.#startCorners[i] = this.getCorner(i);
		}
	}

	#rotateInput(event: MouseEvent) {
		const result = prompt('rotation', String(this.#rotation * RAD_TO_DEG));
		if (result) {
			this.#rotation = Number(result) * DEG_TO_RAD;
			this.#update(ManipulatorUpdatedEventType.Rotation);
			this.#refresh();
			this.#dispatchEvent('updateend', ManipulatorUpdatedEventType.Rotation);
		}
	}

	#translateInput(event: MouseEvent) {
		const result = prompt('center', `${this.#center.x} ${this.#center.y}`);
		if (result) {
			const a = result.split(' ');
			if (a.length >= 2) {
				this.#center.x = Number(a[0]);
				this.#center.y = Number(a[1]);
				this.#update(ManipulatorUpdatedEventType.Position);
				this.#refresh();
				this.#dispatchEvent('updateend', ManipulatorUpdatedEventType.Position);
			}
		}
	}
}

let defined2dManipulator = false;
export function defineHarmony2dManipulator() {
	if (window.customElements && !defined2dManipulator) {
		customElements.define('harmony-2d-manipulator', HTMLHarmony2dManipulatorElement);
		defined2dManipulator = true;
		injectGlobalCss();
	}
}
