import { documentStyle } from '../harmony-css';
import { createElement, hide, show } from '../harmony-html';
import copyCSS from '../css/harmony-copy.css';
import { injectGlobalCss } from '../utils/globalcss';

export class HTMLHarmonyCopyElement extends HTMLElement {
	#doOnce = true;
	#htmlCopied: HTMLElement;
	constructor() {
		super();
		this.#htmlCopied = createElement('div', { class: 'harmony-copy-copied' }) as HTMLElement;
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
			const text = this.innerText
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

let definedCopy = false;
export function defineHarmonyCopy() {
	if (window.customElements && !definedCopy) {
		customElements.define('harmony-copy', HTMLHarmonyCopyElement);
		documentStyle(copyCSS);
		definedCopy = true;
		injectGlobalCss();
	}
}
