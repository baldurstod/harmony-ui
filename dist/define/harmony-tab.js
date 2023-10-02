import {HTMLHarmonyTabElement, styleInject} from '../harmony-ui.js';
import {InjectUiStyle} from './.inject-ui-style.js';
if (window.customElements) {
	styleInject(`harmony-tab{display:block;height:100%;overflow:auto}harmony-tab:first-letter{text-transform:uppercase}.harmony-tab-label{background-color:var(--main-bg-color-bright);border:1px solid #000;border-top:0;color:var(--main-text-color-dark2);cursor:pointer;display:inline-block;flex:0 0;padding:10px;pointer-events:all;position:relative;text-align:center;user-select:none;white-space:nowrap}.harmony-tab-label.activated{background-color:var(--main-bg-color-dark);border-bottom:1px solid var(--main-bg-color-dark);border-left:1px solid #fff;z-index:2}`);
	customElements.define('harmony-tab', HTMLHarmonyTabElement);
}