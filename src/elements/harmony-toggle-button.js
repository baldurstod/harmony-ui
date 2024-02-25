import { shadowRootStyle } from '../harmony-css.js';
import { createElement, hide, show} from '../harmony-html.js';
import { I18n } from '../harmony-i18n.js';

import toggleButtonCSS from '../css/harmony-toggle-button.css';

export class HTMLHarmonyToggleButtonElement extends HTMLElement {
	#buttonOn;
	#buttonOff;
	#state = false;
	#shadowRoot;

	constructor() {
		super();
		this.#shadowRoot = this.attachShadow({ mode: 'closed' });
		I18n.observeElement(this.#shadowRoot);
		shadowRootStyle(this.#shadowRoot, toggleButtonCSS);

		this.addEventListener('click', event => this.#click(event));
		this.#initObserver();
	}

	connectedCallback() {
		if (this.#buttonOn) {
			this.#shadowRoot.append(this.#buttonOn);
		}
		if (this.#buttonOff) {
			this.#shadowRoot.append(this.#buttonOff);
		}
		this.#processChilds();
	}

	#processChilds() {
		for (let child of this.children) {
			this.#processChild(child);
		}
		this.#refresh();
	}

	#processChild(htmlChildElement) {
		switch (htmlChildElement.tagName) {
			case 'ON':
				this.#buttonOn = htmlChildElement;
				this.#shadowRoot.append(this.#buttonOn);
				break;
			case 'OFF':
				this.#buttonOff = htmlChildElement;
				this.#shadowRoot.append(this.#buttonOff);
				break;
		}
		this.#refresh();
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if (name == 'data-i18n-on') {
			this.#buttonOn.setAttribute('data-i18n-title', newValue);
		}
		if (name == 'data-i18n-off') {
			this.#buttonOff.setAttribute('data-i18n-title', newValue);
		}
		if (name == 'state') {
			this.state = newValue;
		}
		if (name == 'src-on') {
			this.#buttonOn = this.#buttonOn ?? createElement('span', {
				class: 'i18n-title toggle-button-on',
				hidden: true,
			});
			this.#buttonOn.style.backgroundImage = `url(${newValue})`;
		}
		if (name == 'src-off') {
			this.#buttonOff = this.#buttonOff ?? createElement('span', {
				class: 'i18n-title toggle-button-off',
			});
			this.#buttonOff.style.backgroundImage = `url(${newValue})`;
		}
	}

	get state() {
		return this.#state;
	}

	set state(state) {
		state = state ? true : false;
		if (this.#state != state) {
			this.#state = state;
			this.dispatchEvent(new CustomEvent('change', { detail:{ oldState: this.#state, newState: state } }));
			this.#refresh();
		}
	}

	#refresh() {
		if (this.#state) {
			show(this.#buttonOn);
			hide(this.#buttonOff);
		} else {
			hide(this.#buttonOn);
			show(this.#buttonOff);
		}
	}

	#click() {
		this.state = !this.#state;
	}

	#initObserver() {
		let config = {childList:true, subtree: true};
		const mutationCallback = (mutationsList, observer) => {
			for (const mutation of mutationsList) {
				for (let addedNode of mutation.addedNodes) {
					if (addedNode.parentNode == this) {
						this.#processChild(addedNode);
					}
				}
			}
		};

		let observer = new MutationObserver(mutationCallback);
		observer.observe(this, config);
	}

	adoptStyleSheet(styleSheet) {
		this.#shadowRoot.adoptedStyleSheets.push(styleSheet);
	}

	static get observedAttributes() {
		return ['data-i18n-on', 'data-i18n-off', 'state', 'src-on', 'src-off'];
	}
}
