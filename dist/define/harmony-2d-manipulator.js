import {HTMLHarmony2dManipulatorElement, styleInject} from '../harmony-ui.js';
import {InjectUiStyle} from './.inject-ui-style.js';
if (window.customElements) {
	styleInject(`:host{--harmony-2d-manipulator-shadow-radius:var(--harmony-2d-manipulator-radius,0.5rem);--harmony-2d-manipulator-shadow-bg-color:var(--harmony-2d-manipulator-bg-color,red);--harmony-2d-manipulator-shadow-handle-bg-color:var(--harmony-2d-manipulator-handle-bg-color,#7fff00);display:block;height:10rem;pointer-events:all;user-select:none;width:10rem}.manipulator{background-color:var(--harmony-2d-manipulator-shadow-bg-color);position:absolute}.corner{background-color:var(--harmony-2d-manipulator-shadow-handle-bg-color);border-radius:calc(var(--harmony-2d-manipulator-shadow-radius)*.5);height:var(--harmony-2d-manipulator-shadow-radius);position:absolute;transform:translate(-50%,-50%);width:var(--harmony-2d-manipulator-shadow-radius)}`);
	customElements.define('harmony-2d-manipulator', HTMLHarmony2dManipulatorElement);
}