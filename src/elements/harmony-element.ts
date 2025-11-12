export class HTMLHarmonyElement extends HTMLElement {
	protected initialized = false;

	protected initElement(): void {
		if (this.initialized) {
			return;
		}
		this.initialized = true;

		this.createElement();
	}

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	protected createElement(): void {

	}

	connectedCallback(): void {
		this.initElement();
	}

	attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
		this.initElement();
		this.onAttributeChanged(name, oldValue, newValue);
	}

	// eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
	protected onAttributeChanged(name: string, oldValue: string | null, newValue: string | null): void {

	}

	static get observedAttributes(): string[] {
		return ['label'];
	}
}
