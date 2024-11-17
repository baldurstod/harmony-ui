import { documentStyle } from '../harmony-css';
import uiCSS from '../css/harmony-ui.css';

let injected = false;
export function injectGlobalCss() {
	if (injected) {
		return;
	}
	documentStyle(uiCSS);
	injected = true;
}
