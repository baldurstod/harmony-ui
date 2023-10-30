import {HTMLHarmonyCopyElement, styleInject} from '../../harmony-ui.browser.js';
import {InjectUiStyle} from './.inject-ui-style.js';
if (window.customElements) {
	styleInject(`harmony-copy{cursor:pointer;position:relative}.harmony-copy-copied{position:absolute;top:0;transition:top 1s}.harmony-copy-copied-end{top:-100%}`);
	customElements.define('harmony-copy', HTMLHarmonyCopyElement);
}