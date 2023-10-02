import {HTMLHarmonyTabGroupElement, styleInject} from '../harmony-ui.js';
import {InjectUiStyle} from './.inject-ui-style.js';
if (window.customElements) {
	styleInject(`harmony-tab-group{display:flex;flex-direction:column;height:100%;overflow:hidden;position:relative;width:100%}.harmony-tab-group-header{background-color:var(--main-bg-color-bright);display:flex;flex-wrap:wrap;overflow:hidden}.harmony-tab-group-content{background-color:var(--main-bg-color-dark);flex:1;overflow:auto}`);
	customElements.define('harmony-tab-group', HTMLHarmonyTabGroupElement);
}