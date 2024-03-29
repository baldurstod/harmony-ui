import {createElement, hide, show, display} from '../harmony-html.js';

export class HTMLHarmonyCopyElement extends HTMLElement {
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
