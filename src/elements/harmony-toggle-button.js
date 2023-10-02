import {createElement, hide, show} from '../harmony-html.js';

export class HTMLHarmonyToggleButtonElement extends HTMLElement {
	constructor() {
		super();
		this._state = false;

		this._buttonOn = createElement('span');
		this._buttonOn.className = 'i18n-title toggle-button-on';
		this._buttonOff = createElement('span');
		this._buttonOff.className = 'i18n-title toggle-button-off';

		hide(this._buttonOn);

		this.addEventListener('click', event=>{this._click(event);});
	}

	connectedCallback() {
		this.className = 'toggle-button';
		this.appendChild(this._buttonOff);
		this.appendChild(this._buttonOn);
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if (name == 'data-i18n-on') {
			this._buttonOn.setAttribute('data-i18n-title', newValue);
			//I18n.updateElement(this._buttonOn);
		}
		if (name == 'data-i18n-off') {
			this._buttonOff.setAttribute('data-i18n-title', newValue);
			//I18n.updateElement(this._buttonOff);
		}
		if (name == 'state') {
			this.state = newValue;
		}
		if (name == 'src-on') {
			this._buttonOn.style.backgroundImage = `url(${newValue})`;
		}
		if (name == 'src-off') {
			this._buttonOff.style.backgroundImage = `url(${newValue})`;
		}
	}

	get state() {
		return this._state;
	}

	set state(state) {
		state = state ? true : false;
		if (this._state != state) {
			this._state = state;
			this.dispatchEvent(new CustomEvent('change', {detail:{oldState:this._state, newState:state}}));

			if (state) {
				show(this._buttonOn);
				hide(this._buttonOff);
			} else {
				hide(this._buttonOn);
				show(this._buttonOff);
			}
		}
	}

	_click() {
		this.state = !this._state;
	}

	static get observedAttributes() {
		return ['data-i18n-on', 'data-i18n-off', 'state', 'src-on', 'src-off'];
	}
}
