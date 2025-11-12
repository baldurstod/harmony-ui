import circularProgressCSS from '../css/harmony-circular-progress.css';
import { shadowRootStyle } from '../harmony-css';
import { createElement, createElementNS } from '../harmony-html';
import { I18n } from '../harmony-i18n';
import { injectGlobalCss } from '../utils/globalcss';
import { HTMLHarmonyElement } from './harmony-element';

export class HTMLHarmonyCircularProgressElement extends HTMLHarmonyElement {
	#shadowRoot?: ShadowRoot;
	#disabled = false;
	#htmlLabel?: HTMLElement;
	#htmlSVG?: SVGElement;
	#htmlTrack?: SVGElement;
	#htmlProgress?: SVGElement;
	#start = 0;
	#end: number = Math.PI * 2;
	#progress = 0.5;

	protected createElement(): void {
		this.#shadowRoot = this.attachShadow({ mode: 'closed' });
		void shadowRootStyle(this.#shadowRoot, circularProgressCSS);
		I18n.observeElement(this.#shadowRoot);

		this.#htmlLabel = createElement('div', {
			parent: this.#shadowRoot,
			class: 'label',
		});

		this.#htmlSVG = createElementNS('http://www.w3.org/2000/svg', 'svg', {
			style: `--progress:${this.#progress};`,
			parent: this.#shadowRoot,
			childs: [
				this.#htmlTrack = createElementNS('http://www.w3.org/2000/svg', 'circle', {
					class: 'track',
					attributes: {
						cx: '50%',
						cy: '50%',
						r: '40%',
						fill: 'none',
						'stroke-width': '10%',
						'shape-rendering': 'geometricPrecision',
						stroke: 'currentColor',
					}
				}) as SVGElement,
				this.#htmlProgress = createElementNS('http://www.w3.org/2000/svg', 'circle', {
					class: 'progress',
					attributes: {
						cx: '50%',
						cy: '50%',
						r: '40%',
						fill: 'none',
						'stroke-width': '10%',
						'shape-rendering': 'geometricPrecision',
						stroke: 'currentColor',
					}
				}) as SVGElement,
			],
		}) as SVGElement;

		this.#refresh();
	}

	setProgress(progress: number): void {
		this.#progress = progress;
		if (this.#htmlSVG) {
			this.#htmlSVG.style.cssText = `--progress: ${progress}`;
		}
	}

	#refresh(): void {
		if (this.#htmlSVG) {
			this.#htmlSVG.style.cssText = `--progress: ${this.#progress}`;
		}
	}

	protected onAttributeChanged(name: string, oldValue: string, newValue: string): void {
		switch (name) {
			case 'data-label':
				if (this.#htmlLabel) {
					this.#htmlLabel.innerHTML = newValue;
				}
				this.#htmlLabel?.classList.remove('i18n');
				break;
			case 'data-i18n':
				this.#htmlLabel?.setAttribute('data-i18n', newValue);
				if (this.#htmlLabel) {
					this.#htmlLabel.innerHTML = newValue;
				}
				this.#htmlLabel?.classList.add('i18n');
				break;
		}
	}

	static get observedAttributes(): string[] {
		return ['data-label', 'data-i18n'];
	}
}

let definedCircularProgress = false;
export function defineHarmonyCircularProgress(): void {
	if (window.customElements && !definedCircularProgress) {
		customElements.define('harmony-circular-progress', class extends HTMLHarmonyCircularProgressElement { });
		customElements.define('h-cp', class extends HTMLHarmonyCircularProgressElement { });
		definedCircularProgress = true;
		injectGlobalCss();
	}
}
