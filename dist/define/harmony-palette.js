import {HarmonyPalette, styleInject} from '../harmony-ui.js';
import {InjectUiStyle} from './.inject-ui-style.js';
if (window.customElements) {
	styleInject(`html{--harmony-palette-color-height:2rem;--harmony-palette-gap:0.5rem}harmony-palette{display:flex;flex-direction:row;gap:var(--harmony-palette-gap)}.harmony-palette-color{border:.2rem solid grey;border-radius:.2rem;cursor:pointer;height:var(--harmony-palette-color-height);width:var(--harmony-palette-color-height)}`);
	customElements.define('harmony-palette', HarmonyPalette);
}