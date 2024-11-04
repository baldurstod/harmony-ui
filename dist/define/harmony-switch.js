import {HTMLHarmonySwitchElement, styleInject} from '../index.js';
import {InjectUiStyle} from './.inject-ui-style.js';
if (window.customElements) {

	customElements.define('harmony-switch', HTMLHarmonySwitchElement);
}