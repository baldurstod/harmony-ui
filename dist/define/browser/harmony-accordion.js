import {HTMLHarmonyAccordionElement, styleInject} from '../../harmony-ui.browser.js';
import {InjectUiStyle} from './.inject-ui-style.js';
if (window.customElements) {
	styleInject(`harmony-accordion{display:flex;flex-direction:column;justify-content:center;overflow:hidden;position:relative}harmony-accordion .item .header{cursor:pointer;display:block;padding:5px;user-select:none}harmony-accordion .item .content{display:block;height:0;overflow:hidden}harmony-accordion .item .content.selected{height:unset;padding:10px}@media (prefers-color-scheme:light){harmony-accordion{--accordion-text-color:#000;--accordion-background-color:#eee;background:#eee;color:#000}}@media (prefers-color-scheme:dark){harmony-accordion{--accordion-text-color:#eee;--accordion-background-color:#000;background:#000;color:#eee}}`);
	customElements.define('harmony-accordion', HTMLHarmonyAccordionElement);
}