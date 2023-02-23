import {styleInject} from '../harmony-ui.js';
export const InjectUiStyle = (function () {
	styleInject(`@media (prefers-color-scheme:light){:root{--mindalka-ui-background-primary:#ccc;--mindalka-ui-background-secondary:#f9f9fb;--mindalka-ui-background-tertiary:#fff;--mindalka-ui-input-background-primary:#aaa;--mindalka-ui-input-background-secondary:#ccc;--mindalka-ui-input-background-tertiary:#4e4e4e;--mindalka-ui-border-primary:#222;--mindalka-ui-border-secondary:#222;--mindalka-ui-input-border-primary:#222;--mindalka-ui-input-border-secondary:#222;--mindalka-ui-text-primary:#222;--mindalka-ui-text-secondary:#222;--mindalka-ui-text-inactive:#9e9e9ea6;--mindalka-ui-text-link:#0069c2;--mindalka-ui-text-invert:#fff;--mindalka-ui-accent-primary:#1072eb;--mindalka-ui-accent-secondary:#1040c1;--mindalka-ui-scrollbar-bg:transparent;--mindalka-ui-scrollbar-color:rgba(0,0,0,.25)}}@media (prefers-color-scheme:dark){:root{--mindalka-ui-background-primary:#1b1b1b;--mindalka-ui-background-secondary:#464747;--mindalka-ui-background-tertiary:#4e4e4e;--mindalka-ui-input-background-primary:#555;--mindalka-ui-input-background-secondary:#333;--mindalka-ui-input-background-tertiary:#fff;--mindalka-ui-border-primary:#858585;--mindalka-ui-border-secondary:#696969;--mindalka-ui-input-border-primary:#aaa;--mindalka-ui-input-border-secondary:#696969;--mindalka-ui-text-primary:#fff;--mindalka-ui-text-secondary:#cdcdcd;--mindalka-ui-text-inactive:#cdcdcda6;--mindalka-ui-text-link:#8cb4ff;--mindalka-ui-text-invert:#1b1b1b;--mindalka-ui-accent-primary:#1072eb;--mindalka-ui-accent-secondary:#1040c1;--mindalka-ui-scrollbar-bg:transparent;--mindalka-ui-scrollbar-color:hsla(0,0%,100%,.25)}}`);
}());