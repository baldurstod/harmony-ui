import {HTMLHarmonyToggleButtonElement, styleInject} from '../../harmony-ui.browser.js';
import {InjectUiStyle} from './.inject-ui-style.js';
if (window.customElements) {
	styleInject(`harmony-toggle-button{cursor:pointer;display:inline-block;height:50px;position:relative;width:50px}harmony-toggle-button>span{background-size:100% auto;box-sizing:border-box;height:100%;left:0;position:absolute;top:0;width:100%}`);
	customElements.define('harmony-toggle-button', HTMLHarmonyToggleButtonElement);
}