
import {HTMLHarmony2dManipulatorElement, styleInject} from '../index.js';
let definedharmony2dmanipulator = false;
export function defineharmony2dmanipulator() {
	if (window.customElements && !definedharmony2dmanipulator) {
			styleInject(`:host{--harmony-2d-manipulator-shadow-radius:var(--harmony-2d-manipulator-radius,0.5rem);--harmony-2d-manipulator-shadow-bg-color:var(--harmony-2d-manipulator-bg-color,red);--harmony-2d-manipulator-shadow-border:var(--harmony-2d-manipulator-border,none);--harmony-2d-manipulator-shadow-handle-bg-color:var(--harmony-2d-manipulator-handle-bg-color,#7fff00);display:block;height:10rem;pointer-events:all;user-select:none;width:10rem}:host-context(.grabbing){cursor:grabbing}.manipulator{background-color:var(--harmony-2d-manipulator-shadow-bg-color);border:var(--harmony-2d-manipulator-shadow-border);cursor:move;pointer-events:all;position:absolute}.corner,.rotator,.side{background-color:var(--harmony-2d-manipulator-shadow-handle-bg-color);border-radius:calc(var(--harmony-2d-manipulator-shadow-radius)*.5);cursor:grab;height:var(--harmony-2d-manipulator-shadow-radius);position:absolute;transform:translate(-50%,-50%);width:var(--harmony-2d-manipulator-shadow-radius)}.corner.grabbing{cursor:grabbing}`);
		customElements.define('harmony-2d-manipulator', HTMLHarmony2dManipulatorElement);
		definedharmony2dmanipulator = true;
	}
}

import {HTMLHarmonyAccordionElement, styleInject} from '../index.js';
let definedharmonyaccordion = false;
export function defineharmonyaccordion() {
	if (window.customElements && !definedharmonyaccordion) {
			styleInject(`harmony-accordion{display:flex;flex-direction:column;justify-content:center;overflow:hidden;position:relative}harmony-accordion .item .header{cursor:pointer;display:block;padding:5px;user-select:none}harmony-accordion .item .content{display:block;height:0;overflow:hidden}harmony-accordion .item .content.selected{height:unset;padding:10px}@media (prefers-color-scheme:light){harmony-accordion{--accordion-text-color:#000;--accordion-background-color:#eee;background:#eee;color:#000}}@media (prefers-color-scheme:dark){harmony-accordion{--accordion-text-color:#eee;--accordion-background-color:#000;background:#000;color:#eee}}`);
		customElements.define('harmony-accordion', HTMLHarmonyAccordionElement);
		definedharmonyaccordion = true;
	}
}

import {HTMLHarmonyColorPickerElement, styleInject} from '../index.js';
let definedharmonycolorpicker = false;
export function defineharmonycolorpicker() {
	if (window.customElements && !definedharmonycolorpicker) {
		
		customElements.define('harmony-color-picker', HTMLHarmonyColorPickerElement);
		definedharmonycolorpicker = true;
	}
}

import {HTMLHarmonyContextMenuElement, styleInject} from '../index.js';
let definedharmonycontextmenu = false;
export function defineharmonycontextmenu() {
	if (window.customElements && !definedharmonycontextmenu) {
		
		customElements.define('harmony-context-menu', HTMLHarmonyContextMenuElement);
		definedharmonycontextmenu = true;
	}
}

import {HTMLHarmonyCopyElement, styleInject} from '../index.js';
let definedharmonycopy = false;
export function defineharmonycopy() {
	if (window.customElements && !definedharmonycopy) {
			styleInject(`harmony-copy{cursor:pointer;position:relative}.harmony-copy-copied{position:absolute;top:0;transition:top 1s}.harmony-copy-copied-end{top:-100%}`);
		customElements.define('harmony-copy', HTMLHarmonyCopyElement);
		definedharmonycopy = true;
	}
}

import {HTMLHarmonyLabelPropertyElement, styleInject} from '../index.js';
let definedharmonylabelproperty = false;
export function defineharmonylabelproperty() {
	if (window.customElements && !definedharmonylabelproperty) {
			styleInject(`:root{--harmony-label-property-gap:0.5rem}harmony-label-property{display:flex;gap:var(--harmony-label-property-gap)}`);
		customElements.define('harmony-label-property', HTMLHarmonyLabelPropertyElement);
		definedharmonylabelproperty = true;
	}
}

import {HTMLHarmonyPaletteElement, styleInject} from '../index.js';
let definedharmonypalette = false;
export function defineharmonypalette() {
	if (window.customElements && !definedharmonypalette) {
			styleInject(`html{--harmony-palette-color-size:2rem;--harmony-palette-gap:0.5rem;--harmony-palette-border-color:grey;--harmony-palette-selected-border-color:orange}:host{display:flex;flex-direction:row;flex-wrap:wrap;gap:var(--harmony-palette-gap)}.color{border:calc(var(--harmony-palette-color-size)*.1) solid var(--harmony-palette-border-color);border-radius:calc(var(--harmony-palette-color-size)*.1);cursor:pointer;height:var(--harmony-palette-color-size);padding:calc(var(--harmony-palette-color-size)*.1);width:var(--harmony-palette-color-size)}.color.selected{border-color:var(--harmony-palette-selected-border-color);border-width:calc(var(--harmony-palette-color-size)*.2);color:#000;padding:0}.color>svg{height:100%;width:100%}`);
		customElements.define('harmony-palette', HTMLHarmonyPaletteElement);
		definedharmonypalette = true;
	}
}

import {HTMLHarmonyPanelElement, styleInject} from '../index.js';
let definedharmonypanel = false;
export function defineharmonypanel() {
	if (window.customElements && !definedharmonypanel) {
			styleInject(`harmony-panel{box-sizing:border-box;display:flex;flex:1;flex:0 0 auto;flex-direction:column;overflow:hidden;pointer-events:all;position:relative}.harmony-panel-row{flex-direction:row}.harmony-panel-row>harmony-panel{height:100%}.harmony-panel-column{flex-direction:column}.harmony-panel-column>harmony-panel{width:100%}.harmony-panel-splitter{background-color:red;display:none;flex:0 0 10px}harmony-panel>.title{cursor:pointer;font-size:1.5em;overflow:hidden;padding:4px;text-align:center}harmony-panel>.content{box-sizing:border-box;width:100%}harmony-panel[collapsible="1"]>.title:after{content:"-";position:absolute;right:5px}harmony-panel[collapsed="1"]>.title:after{content:"+"}`);
		customElements.define('harmony-panel', HTMLHarmonyPanelElement);
		definedharmonypanel = true;
	}
}

import {HTMLHarmonyRadioElement, styleInject} from '../index.js';
let definedharmonyradio = false;
export function defineharmonyradio() {
	if (window.customElements && !definedharmonyradio) {
		
		customElements.define('harmony-radio', HTMLHarmonyRadioElement);
		definedharmonyradio = true;
	}
}

import {HTMLHarmonySelectElement, styleInject} from '../index.js';
let definedharmonyselect = false;
export function defineharmonyselect() {
	if (window.customElements && !definedharmonyselect) {
			styleInject(``);
		customElements.define('harmony-select', HTMLHarmonySelectElement);
		definedharmonyselect = true;
	}
}

import {HTMLHarmonySlideshowElement, styleInject} from '../index.js';
let definedharmonyslideshow = false;
export function defineharmonyslideshow() {
	if (window.customElements && !definedharmonyslideshow) {
			styleInject(`:host{align-items:center;display:flex;flex-direction:column;justify-content:center;overflow:hidden;position:relative}.image{flex-shrink:0;position:relative}.images{flex:1;overflow:hidden;width:100%}.images-outer{margin:auto;overflow:hidden}.images-inner{display:flex;height:100%;position:relative;width:100%}:host(.dynamic) .images-inner{transition:all .5s ease 0s}.controls{display:none;height:100%;opacity:0;position:absolute;width:100%;z-index:1000}:host(.dynamic) .controls{display:unset}.controls>div{background-position:50%;background-repeat:no-repeat;background-size:100%;cursor:pointer;pointer-events:all;position:absolute}.next-image,.previous-image{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath style='fill:%23fff;stroke:%23000;stroke-width:10' d='m360 100-60-70L30 256l270 226 60-70-185-156Z'/%3E%3C/svg%3E");height:48px;top:calc(50% - 24px);width:48px}.previous-image{left:10px}.next-image{right:10px;transform:scaleX(-1)}.pause,.play{bottom:10px;height:25px;left:10px;width:25px}.play{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath style='fill:%23fff;stroke:%23000;stroke-width:40' d='m20 20 450 236L20 492Z'/%3E%3C/svg%3E")}.pause{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cg style='fill:%23fff;stroke:%23000;stroke-width:30'%3E%3Cpath d='M30 30h140v452H30zM342 30h140v452H342z'/%3E%3C/g%3E%3C/svg%3E");right:0}.thumbnails{display:flex;flex:0;justify-content:center;width:100%}:host(.dynamic) .thumbnails{display:none}.thumbnails>img{cursor:pointer;height:80px;margin:3px;object-fit:contain}.zoom{height:100%;pointer-events:none;position:fixed;width:100%}.zoom>img{position:relative;width:100%;width:1500px}`);
		customElements.define('harmony-slideshow', HTMLHarmonySlideshowElement);
		definedharmonyslideshow = true;
	}
}

import {HTMLHarmonySplitterElement, styleInject} from '../index.js';
let definedharmonysplitter = false;
export function defineharmonysplitter() {
	if (window.customElements && !definedharmonysplitter) {
		
		customElements.define('harmony-splitter', HTMLHarmonySplitterElement);
		definedharmonysplitter = true;
	}
}

import {HTMLHarmonySwitchElement, styleInject} from '../index.js';
let definedharmonyswitch = false;
export function defineharmonyswitch() {
	if (window.customElements && !definedharmonyswitch) {
		
		customElements.define('harmony-switch', HTMLHarmonySwitchElement);
		definedharmonyswitch = true;
	}
}

import {HTMLHarmonyTabElement, styleInject} from '../index.js';
let definedharmonytab = false;
export function defineharmonytab() {
	if (window.customElements && !definedharmonytab) {
		
		customElements.define('harmony-tab', HTMLHarmonyTabElement);
		definedharmonytab = true;
	}
}

import {HTMLHarmonyTabGroupElement, styleInject} from '../index.js';
let definedharmonytabgroup = false;
export function defineharmonytabgroup() {
	if (window.customElements && !definedharmonytabgroup) {
		
		customElements.define('harmony-tab-group', HTMLHarmonyTabGroupElement);
		definedharmonytabgroup = true;
	}
}

import {HTMLHarmonyToggleButtonElement, styleInject} from '../index.js';
let definedharmonytogglebutton = false;
export function defineharmonytogglebutton() {
	if (window.customElements && !definedharmonytogglebutton) {
		
		customElements.define('harmony-toggle-button', HTMLHarmonyToggleButtonElement);
		definedharmonytogglebutton = true;
	}
}
