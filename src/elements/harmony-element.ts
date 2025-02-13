export class HTMLHarmonyElement extends HTMLElement {
	protected initialized = false;

	protected initElement() {
		if (this.initialized) {
			return;
		}
		this.initialized = true;

		this.createElement();
	}

	protected createElement() {

	}

	connectedCallback() {
		this.initElement();
	}

	attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
		this.initElement();
		this.onAttributeChanged(name, oldValue, newValue);
	}

	protected onAttributeChanged(name: string, oldValue: string | null, newValue: string | null) {

	}

	static get observedAttributes() {
		return ['label'];
	}
}
