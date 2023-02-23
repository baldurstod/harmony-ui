import {MindalkaToggleButton, styleInject} from '../harmony-ui.js';
import {InjectUiStyle} from './.inject-ui-style.js';
if (window.customElements) {
	styleInject(`mindalka-toggle-button{cursor:pointer;display:inline-block;height:50px;position:relative;width:50px}mindalka-toggle-button>span{background-size:100% auto;box-sizing:border-box;height:100%;left:0;position:absolute;top:0;width:100%}`);
	customElements.define('harmony-toggle-button', MindalkaToggleButton);
}