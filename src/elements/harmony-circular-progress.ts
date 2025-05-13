import { shadowRootStyle } from '../harmony-css';
import { createElement, createElementNS } from '../harmony-html';
import { I18n } from '../harmony-i18n';
import circularProgressCSS from '../css/harmony-circular-progress.css';
import { injectGlobalCss } from '../utils/globalcss';
import { HTMLHarmonyElement } from './harmony-element';

export class HTMLHarmonyCircularProgressElement extends HTMLHarmonyElement {
	#shadowRoot?: ShadowRoot;
	#disabled = false;
	#htmlLabel?: HTMLElement;
	#htmlSVG?: HTMLElement;
	#htmlTrack?: HTMLElement;
	#htmlProgress?: HTMLElement;
	#start: number = 0;
	#end: number = Math.PI * 2;
	#progress: number = 0.5;

	protected createElement() {
		this.#shadowRoot = this.attachShadow({ mode: 'closed' });
		shadowRootStyle(this.#shadowRoot, circularProgressCSS);
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
				}),
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
				}),
			],
		});

		this.#refresh();
	}

	setProgress(progress: number) {
		this.#progress = progress;
		if (this.#htmlSVG) {
			this.#htmlSVG.style.cssText = `--progress: ${progress}`;
		}
	}

	#refresh() {
		if (this.#htmlSVG) {
			this.#htmlSVG.style.cssText = `--progress: ${this.#progress}`;
		}
	}

	protected onAttributeChanged(name: string, oldValue: string, newValue: string) {
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

	static get observedAttributes() {
		return ['data-label', 'data-i18n'];
	}
}

let definedCircularProgress = false;
export function defineHarmonyCircularProgress() {
	if (window.customElements && !definedCircularProgress) {
		customElements.define('harmony-circular-progress', class extends HTMLHarmonyCircularProgressElement { });
		customElements.define('h-cp', class extends HTMLHarmonyCircularProgressElement { });
		definedCircularProgress = true;
		injectGlobalCss();
	}
}
