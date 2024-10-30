export async function documentStyle(cssText) {
	return await shadowRootStyle(document, cssText);
}

export function documentStyleSync(cssText) {
	return shadowRootStyleSync(document, cssText);
}

export async function shadowRootStyle(shadowRoot, cssText) {
	const sheet = new CSSStyleSheet;
	await sheet.replace(cssText);
	shadowRoot.adoptedStyleSheets.push(sheet);
}

export function shadowRootStyleSync(shadowRoot, cssText) {
	const sheet = new CSSStyleSheet;
	sheet.replaceSync(cssText);
	shadowRoot.adoptedStyleSheets.push(sheet);
}
