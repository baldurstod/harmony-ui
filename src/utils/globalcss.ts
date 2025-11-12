import { documentStyle } from '../harmony-css';
import uiCSS from '../css/harmony-ui.css';

let injected = false;
export function injectGlobalCss(): void {
	if (injected) {
		return;
	}
	void documentStyle(uiCSS);
	injected = true;
}
