import {HTMLHarmonyTooltipElement, styleInject} from '../../harmony-ui.browser.js';
import {InjectUiStyle} from './.inject-ui-style.js';
if (window.customElements) {

	customElements.define('harmony-tooltip', HTMLHarmonyTooltipElement);
}