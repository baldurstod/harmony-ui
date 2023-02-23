import {MindalkaPanel, styleInject} from '../harmony-ui.js';
import {InjectUiStyle} from './.inject-ui-style.js';
if (window.customElements) {
	styleInject(`mindalka-panel{box-sizing:border-box;display:flex;flex:1;flex:0 0 auto;flex-direction:column;overflow:hidden;pointer-events:all;position:relative}.mindalka-panel-row{flex-direction:row}.mindalka-panel-row>mindalka-panel{height:100%}.mindalka-panel-column{flex-direction:column}.mindalka-panel-column>mindalka-panel{width:100%}.mindalka-panel-splitter{background-color:red;display:none;flex:0 0 10px}mindalka-panel>.title{cursor:pointer;font-size:1.5em;overflow:hidden;padding:4px;text-align:center}mindalka-panel>.content{box-sizing:border-box;width:100%}mindalka-panel[collapsible="1"]>.title:after{content:"-";position:absolute;right:5px}mindalka-panel[collapsed="1"]>.title:after{content:"+"}`);
	customElements.define('harmony-panel', MindalkaPanel);
}