import copyCSS from '../css/harmony-copy.css';
import { documentStyle } from '../harmony-css';
import { createElement, hide, show } from '../harmony-html';
import { injectGlobalCss } from '../utils/globalcss';

export class HTMLHarmonyCopyElement extends HTMLElement {
	#doOnce = true;
	#htmlCopied: HTMLElement;

	constructor() {
		super();
		this.#htmlCopied = createElement('div', { class: 'harmony-copy-copied' });
		this.addEventListener('click', () => { void this.#copy() });
	}

	connectedCallback(): void {
		if (this.#doOnce) {
			this.#doOnce = false;
			this.append(this.#htmlCopied);
			hide(this.#htmlCopied);
		}
	}

	async #copy(): Promise<void> {
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
export function defineHarmonyCopy(): void {
	if (window.customElements && !definedCopy) {
		customElements.define('harmony-copy', HTMLHarmonyCopyElement);
		void documentStyle(copyCSS);
		definedCopy = true;
		injectGlobalCss();
	}
}
