export async function documentStyle(cssText: string) {
	return await shadowRootStyle(document, cssText);
}

export function documentStyleSync(cssText: string) {
	return shadowRootStyleSync(document, cssText);
}

export async function shadowRootStyle(shadowRoot: Document | ShadowRoot, cssText: string) {
	const sheet = new CSSStyleSheet;
	await sheet.replace(cssText);
	shadowRoot.adoptedStyleSheets.push(sheet);
}

export function shadowRootStyleSync(shadowRoot: Document | ShadowRoot, cssText: string) {
	const sheet = new CSSStyleSheet;
	sheet.replaceSync(cssText);
	shadowRoot.adoptedStyleSheets.push(sheet);
}
