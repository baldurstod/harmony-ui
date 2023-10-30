import {HTMLHarmonyPanelElement, styleInject} from '../../harmony-ui.browser.js';
import {InjectUiStyle} from './.inject-ui-style.js';
if (window.customElements) {
	styleInject(`harmony-panel{box-sizing:border-box;display:flex;flex:1;flex:0 0 auto;flex-direction:column;overflow:hidden;pointer-events:all;position:relative}.harmony-panel-row{flex-direction:row}.harmony-panel-row>harmony-panel{height:100%}.harmony-panel-column{flex-direction:column}.harmony-panel-column>harmony-panel{width:100%}.harmony-panel-splitter{background-color:red;display:none;flex:0 0 10px}harmony-panel>.title{cursor:pointer;font-size:1.5em;overflow:hidden;padding:4px;text-align:center}harmony-panel>.content{box-sizing:border-box;width:100%}harmony-panel[collapsible="1"]>.title:after{content:"-";position:absolute;right:5px}harmony-panel[collapsed="1"]>.title:after{content:"+"}`);
	customElements.define('harmony-panel', HTMLHarmonyPanelElement);
}