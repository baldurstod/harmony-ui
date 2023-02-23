import {MindalkaRadio, styleInject} from '../harmony-ui.js';
import {InjectUiStyle} from './.inject-ui-style.js';
if (window.customElements) {
	styleInject(`:root{--mindalka-radio-button-border-radius:0.5rem;--mindalka-radio-button-padding:0.5rem;--mindalka-radio-button-font-size:1rem}mindalka-radio{display:inline-flex;overflow:hidden;user-select:none}.mindalka-radio-label{font-weight:700;margin:auto .25rem auto 0}mindalka-radio>button{appearance:none;background-color:var(--mindalka-ui-input-background-primary);border-color:var(--mindalka-ui-border-primary);border-style:solid none solid solid;border-width:.0625rem;color:var(--mindalka-ui-text-primary);cursor:pointer;font-size:var(--mindalka-radio-button-font-size);overflow:hidden;padding:var(--mindalka-radio-button-padding);transition:background-color .2s linear}mindalka-radio>button:hover{background-color:var(--mindalka-ui-input-background-secondary)}mindalka-radio>button[selected]{background-color:var(--mindalka-ui-accent-primary)}mindalka-radio>button[selected]:hover{background-color:var(--mindalka-ui-accent-secondary)}mindalka-radio>button:first-of-type{border-radius:var(--mindalka-radio-button-border-radius) 0 0 var(--mindalka-radio-button-border-radius)}mindalka-radio>button:last-child{border-radius:0 var(--mindalka-radio-button-border-radius) var(--mindalka-radio-button-border-radius) 0;border-right-style:solid}`);
	customElements.define('harmony-radio', MindalkaRadio);
}