import {HTMLHarmonyLabelPropertyElement, styleInject} from '../../harmony-ui.browser.js';
import {InjectUiStyle} from './.inject-ui-style.js';
if (window.customElements) {
	styleInject(`:root{--harmony-label-property-gap:0.5rem}harmony-label-property{display:flex;gap:var(--harmony-label-property-gap)}`);
	customElements.define('harmony-label-property', HTMLHarmonyLabelPropertyElement);
}