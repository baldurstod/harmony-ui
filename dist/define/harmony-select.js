import {HTMLHarmonySelectElement, styleInject} from '../index.js';
import {InjectUiStyle} from './.inject-ui-style.js';
if (window.customElements) {
	styleInject(``);
	customElements.define('harmony-select', HTMLHarmonySelectElement);
}