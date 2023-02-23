import {MindalkaAccordion, styleInject} from '../harmony-ui.js';
import {InjectUiStyle} from './.inject-ui-style.js';
if (window.customElements) {
	styleInject(`mindalka-accordion{display:flex;flex-direction:column;justify-content:center;overflow:hidden;position:relative}mindalka-accordion .item .header{cursor:pointer;display:block;padding:5px;user-select:none}mindalka-accordion .item .content{display:block;height:0;overflow:hidden}mindalka-accordion .item .content.selected{height:unset;padding:10px}@media (prefers-color-scheme:light){mindalka-accordion{--accordion-text-color:#000;--accordion-background-color:#eee;background:#eee;color:#000}}@media (prefers-color-scheme:dark){mindalka-accordion{--accordion-text-color:#eee;--accordion-background-color:#000;background:#000;color:#eee}}`);
	customElements.define('harmony-accordion', MindalkaAccordion);
}