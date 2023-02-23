import {HarmonySelect, styleInject} from '../harmony-ui.js';
import {InjectUiStyle} from './.inject-ui-style.js';
if (window.customElements) {
	styleInject(``);
	customElements.define('harmony-select', HarmonySelect);
}