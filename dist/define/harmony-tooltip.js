import {HTMLHarmonyTooltipElement, styleInject} from '../index.js';
import {InjectUiStyle} from './.inject-ui-style.js';
if (window.customElements) {

	customElements.define('harmony-tooltip', HTMLHarmonyTooltipElement);
}