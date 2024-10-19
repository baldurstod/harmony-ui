import {HTMLHarmony2dManipulatorElement, styleInject} from '../harmony-ui.js';
import {InjectUiStyle} from './.inject-ui-style.js';
if (window.customElements) {
	styleInject(`:host{--harmony-2d-manipulator-shadow-radius:var(--harmony-2d-manipulator-radius,0.25rem);display:block;height:10rem;user-select:none;width:10rem}.manipulator{background-color:red}.corner,.manipulator{position:absolute;transform:translate(-50%,-50%)}.corner{background-color:#7fff00;border-radius:var(--harmony-2d-manipulator-shadow-radius);height:.5rem;width:.5rem}`);
	customElements.define('harmony-2d-manipulator', HTMLHarmony2dManipulatorElement);
}