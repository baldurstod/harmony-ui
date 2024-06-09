import {HTMLHarmonySplitterElement, styleInject} from '../harmony-ui.js';
import {InjectUiStyle} from './.inject-ui-style.js';
if (window.customElements) {

	customElements.define('harmony-splitter', HTMLHarmonySplitterElement);
}