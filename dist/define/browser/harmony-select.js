import {HTMLHarmonySelectElement, styleInject} from '../../harmony-ui.browser.js';
import {InjectUiStyle} from './.inject-ui-style.js';
if (window.customElements) {
	styleInject(``);
	customElements.define('harmony-select', HTMLHarmonySelectElement);
}