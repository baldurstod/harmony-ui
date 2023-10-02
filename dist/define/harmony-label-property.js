import {HTMLHarmonyLabelPropertyElement, styleInject} from '../harmony-ui.js';
import {InjectUiStyle} from './.inject-ui-style.js';
if (window.customElements) {
	styleInject(``);
	customElements.define('harmony-label-property', HTMLHarmonyLabelPropertyElement);
}