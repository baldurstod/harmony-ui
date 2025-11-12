export class HarmonyElement extends HTMLElement {
	#doOnce = true;
	constructor() {
		super();
	}

	connectedCallback(): void {
		if (this.#doOnce) {
			this.#doOnce = false;
		}
	}
}
