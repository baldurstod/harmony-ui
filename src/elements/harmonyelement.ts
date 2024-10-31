export class HarmonyElement extends HTMLElement {
	#doOnce = true;
	constructor() {
		super();
	}

	connectedCallback() {
		if (this.#doOnce) {
			this.#doOnce = false;
		}
	}
}
