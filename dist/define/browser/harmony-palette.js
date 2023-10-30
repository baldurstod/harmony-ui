import {HTMLHarmonyPaletteElement, styleInject} from '../../harmony-ui.browser.js';
import {InjectUiStyle} from './.inject-ui-style.js';
if (window.customElements) {
	styleInject(`html{--harmony-palette-color-size:2rem;--harmony-palette-gap:0.5rem;--harmony-palette-border-color:grey;--harmony-palette-selected-border-color:orange}harmony-palette{display:flex;flex-direction:row;flex-wrap:wrap;gap:var(--harmony-palette-gap)}.harmony-palette-color{border:calc(var(--harmony-palette-color-size)*.1) solid var(--harmony-palette-border-color);border-radius:calc(var(--harmony-palette-color-size)*.1);cursor:pointer;height:var(--harmony-palette-color-size);padding:calc(var(--harmony-palette-color-size)*.1);width:var(--harmony-palette-color-size)}.harmony-palette-color.selected{border-color:var(--harmony-palette-selected-border-color);border-width:calc(var(--harmony-palette-color-size)*.2);color:#000;padding:0}`);
	customElements.define('harmony-palette', HTMLHarmonyPaletteElement);
}