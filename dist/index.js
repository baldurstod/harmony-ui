import { Color } from 'harmony-utils';
import { folderOpenSVG, infoSVG, checkOutlineSVG, closeSVG } from 'harmony-svg';

function cloneEvent(event) {
    return new event.constructor(event.type, event);
}

async function documentStyle(cssText) {
    return await shadowRootStyle(document, cssText);
}
function documentStyleSync(cssText) {
    return shadowRootStyleSync(document, cssText);
}
async function shadowRootStyle(shadowRoot, cssText) {
    const sheet = new CSSStyleSheet;
    await sheet.replace(cssText);
    shadowRoot.adoptedStyleSheets.push(sheet);
}
function shadowRootStyleSync(shadowRoot, cssText) {
    const sheet = new CSSStyleSheet;
    sheet.replaceSync(cssText);
    shadowRoot.adoptedStyleSheets.push(sheet);
}

const ET = new EventTarget();

const I18N_DELAY_BEFORE_REFRESH = 100;
var I18nEvents;
(function (I18nEvents) {
    I18nEvents["LangChanged"] = "langchanged";
    I18nEvents["TranslationsUpdated"] = "translationsupdated";
    I18nEvents["Any"] = "*";
})(I18nEvents || (I18nEvents = {}));
const targets = ['innerHTML', 'innerText', 'placeholder', 'title', 'label'];
const I18nElements = new Map();
function AddI18nElement(element, descriptor) {
    if (typeof descriptor == 'string') {
        descriptor = { innerText: descriptor };
    }
    const existing = I18nElements.get(element);
    if (existing) {
        if (descriptor === null) {
            I18nElements.delete(element);
            return;
        }
        for (const target of targets) {
            const desc = descriptor[target];
            if (desc === null) {
                delete existing[target];
            }
            else if (desc !== undefined) {
                existing[target] = desc;
            }
        }
        if (descriptor.values) {
            if (!existing.values) {
                existing.values = {};
            }
            for (const name in descriptor.values) {
                existing.values[name] = descriptor.values[name];
            }
        }
    }
    else {
        if (descriptor) {
            I18nElements.set(element, descriptor);
        }
    }
}
class I18n {
    static #started = false;
    static #lang = 'english';
    static #defaultLang = 'english';
    static #translations = new Map();
    static #executing = false;
    static #refreshTimeout;
    static #observerConfig = { childList: true, subtree: true, attributeFilter: ['i18n', 'data-i18n-json', 'data-i18n-values'] };
    static #observer;
    static #observed = new Set();
    static #eventTarget = new EventTarget();
    static start() {
        if (this.#started) {
            return;
        }
        this.#started = true;
        this.observeElement(document.body);
        ET.addEventListener('created', (event) => this.#processElement2(event.detail));
        ET.addEventListener('updated', (event) => this.#processElement2(event.detail));
    }
    static setOptions(options) {
        if (options.translations) {
            for (const translation of options.translations) {
                this.#addTranslation(translation);
            }
            this.#eventTarget.dispatchEvent(new CustomEvent(I18nEvents.TranslationsUpdated));
            this.#eventTarget.dispatchEvent(new CustomEvent(I18nEvents.Any));
        }
        this.i18n();
    }
    static addTranslation(translation) {
        this.#addTranslation(translation);
        if (translation.lang == this.#lang) {
            this.i18n();
        }
    }
    static #addTranslation(translation) {
        this.#translations.set(translation.lang, translation);
    }
    static #initObserver() {
        if (this.#observer) {
            return;
        }
        const callback = async (mutationsList) => {
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList') {
                    for (const node of mutation.addedNodes) {
                        if (node instanceof HTMLElement) {
                            this.updateElement(node);
                        }
                    }
                }
                else if (mutation.type === 'attributes') {
                    this.updateElement(mutation.target);
                }
            }
        };
        this.#observer = new MutationObserver(callback);
    }
    static observeElement(element) {
        this.#observed.add(element);
        this.#initObserver();
        this.#observer?.observe(element, this.#observerConfig);
        this.updateElement(element);
    }
    static #processList(parentNode, className, attribute, subElement) {
        const elements = parentNode.querySelectorAll('.' + className);
        if (parentNode.classList?.contains(className)) {
            this.#processElement(parentNode, attribute, subElement);
        }
        for (const element of elements) {
            this.#processElement(element, attribute, subElement);
        }
    }
    static #processJSON(parentNode) {
        const className = 'i18n';
        const elements = parentNode.querySelectorAll('.' + className);
        if (parentNode.classList?.contains(className)) {
            this.#processElementJSON(parentNode);
        }
        for (const element of elements) {
            this.#processElementJSON(element);
        }
    }
    static #processElement(htmlElement, attribute, subElement) {
        const dataLabel = htmlElement.getAttribute(attribute);
        if (dataLabel) {
            htmlElement[subElement] = this.getString(dataLabel);
        }
    }
    // TODO: merge with function above
    static #processElement2(htmlElement) {
        const descriptor = I18nElements.get(htmlElement);
        if (descriptor) {
            const values = descriptor.values ?? {};
            for (const target of targets) {
                const desc = descriptor[target];
                if (desc && (htmlElement[target] !== undefined)) {
                    htmlElement[target] = this.formatString(desc, values);
                }
            }
        }
    }
    static #processElementJSON(htmlElement) {
        const str = htmlElement.getAttribute('data-i18n-json');
        if (!str) {
            return;
        }
        const dataJSON = JSON.parse(str);
        if (!dataJSON) {
            return;
        }
        let valuesJSON;
        const values = htmlElement.getAttribute('data-i18n-values');
        if (values) {
            valuesJSON = JSON.parse(values);
        }
        else {
            valuesJSON = dataJSON.values;
        }
        const innerHTML = dataJSON.innerHTML;
        if (innerHTML) {
            htmlElement.innerHTML = this.formatString(innerHTML, valuesJSON);
        }
        const innerText = dataJSON.innerText;
        if (innerText && (htmlElement.innerText !== undefined)) {
            htmlElement.innerText = this.formatString(innerText, valuesJSON);
        }
    }
    static i18n() {
        if (!this.#refreshTimeout) {
            this.#refreshTimeout = setTimeout(() => this.#i18n(), I18N_DELAY_BEFORE_REFRESH);
        }
    }
    static #i18n() {
        this.#refreshTimeout = null;
        if (this.#executing) {
            return;
        }
        this.#executing = true;
        for (const element of this.#observed) {
            this.#processList(element, 'i18n', 'data-i18n', 'innerHTML');
            this.#processJSON(element);
        }
        for (const [element] of I18nElements) {
            this.#processElement2(element);
        }
        this.#executing = false;
        return;
    }
    static updateElement(htmlElement) {
        this.#processList(htmlElement, 'i18n', 'data-i18n', 'innerHTML');
        this.#processJSON(htmlElement);
    }
    /**
     * @deprecated use setLang() instead
     */
    static set lang(lang) {
        throw 'Deprecated, use setLang() instead';
    }
    static setLang(lang) {
        if (this.#lang != lang) {
            const oldLang = this.#lang;
            this.#lang = lang;
            this.#eventTarget.dispatchEvent(new CustomEvent(I18nEvents.LangChanged, { detail: { oldLang: oldLang, newLang: lang } }));
            this.#eventTarget.dispatchEvent(new CustomEvent(I18nEvents.Any));
            this.i18n();
        }
    }
    static setDefaultLang(defaultLang) {
        this.#defaultLang = defaultLang;
    }
    static addEventListener(type, callback, options) {
        this.#eventTarget.addEventListener(type, callback, options);
    }
    static getString(s) {
        const s2 = this.#translations.get(this.#lang)?.strings?.[s] ?? this.#translations.get(this.#defaultLang)?.strings?.[s];
        if (typeof s2 == 'string') {
            return s2;
        }
        else {
            console.warn('Missing translation for key ' + s);
            return s;
        }
    }
    static formatString(s, values) {
        let str = this.getString(s);
        for (const key in values) {
            str = str.replace(new RegExp("\\${" + key + "\\}", "gi"), String(values[key]));
        }
        return str;
    }
    /**
     * @deprecated use getAuthors() instead
     */
    static get authors() {
        throw 'Deprecated, use getAuthors() instead';
    }
    static getAuthors() {
        return this.#translations.get(this.#lang)?.authors ?? [];
    }
    static setValue(element, name, value) {
        if (!element) {
            return;
        }
        const i18n = {};
        i18n[name] = value;
        AddI18nElement(element, { values: i18n });
        this.#processElement2(element);
    }
}

function createElement(tagName, options) {
    const element = document.createElement(tagName);
    createElementOptions(element, options);
    ET.dispatchEvent(new CustomEvent('created', { detail: element }));
    return element;
}
function createElementNS(namespaceURI, tagName, options) {
    const element = document.createElementNS(namespaceURI, tagName);
    createElementOptions(element, options);
    return element;
}
function createShadowRoot(tagName, options, mode = 'closed') {
    const element = document.createElement(tagName);
    const shadowRoot = element.attachShadow({ mode: mode });
    createElementOptions(element, options, shadowRoot);
    return shadowRoot;
}
function updateElement(element, options) {
    if (!element) {
        return;
    }
    createElementOptions(element, options);
    ET.dispatchEvent(new CustomEvent('updated', { detail: element }));
    return element;
}
function append(element, child) {
    if (child === null || child === undefined) {
        return;
    }
    if (child instanceof ShadowRoot) {
        element.append(child.host);
    }
    else {
        element.append(child);
    }
}
function createElementOptions(element, options, shadowRoot) {
    if (options) {
        for (const optionName in options) {
            const optionValue = options[optionName];
            if (optionName.startsWith('$')) {
                const eventType = optionName.substring(1);
                if (typeof optionValue === 'function') {
                    element.addEventListener(eventType, optionValue);
                }
                else {
                    element.addEventListener(eventType, optionValue.listener, optionValue.options);
                }
                continue;
            }
            switch (optionName) {
                case 'id':
                    element.id = optionValue;
                    break;
                case 'class':
                    element.classList.add(...optionValue.split(' ').filter((n) => n));
                    break;
                case 'i18n':
                    AddI18nElement(element, optionValue);
                    break;
                case 'parent':
                    optionValue.append(element);
                    break;
                case 'child':
                    append(shadowRoot ?? element, optionValue);
                    break;
                case 'childs':
                    optionValue.forEach((entry) => append(shadowRoot ?? element, entry));
                    break;
                case 'events':
                    for (const eventType in optionValue) {
                        const eventParams = optionValue[eventType];
                        if (typeof eventParams === 'function') {
                            element.addEventListener(eventType, eventParams);
                        }
                        else {
                            element.addEventListener(eventType, eventParams.listener, eventParams.options);
                        }
                    }
                    break;
                case 'properties':
                    for (const name in optionValue) {
                        element[name] = optionValue[name];
                    }
                    break;
                case 'hidden':
                    if (optionValue) {
                        hide(element);
                    }
                    break;
                case 'innerHTML':
                    element.innerHTML = optionValue ?? '';
                    break;
                case 'innerText':
                    element.innerText = optionValue ?? '';
                    break;
                case 'attributes':
                    for (const attributeName in optionValue) {
                        element.setAttribute(attributeName, optionValue[attributeName]);
                    }
                    break;
                case 'slot':
                    element.slot = optionValue;
                    break;
                case 'htmlFor':
                    element.htmlFor = optionValue;
                    break;
                case 'adoptStyle':
                    adoptStyleSheet(shadowRoot ?? element, optionValue);
                    break;
                case 'adoptStyles':
                    optionValue.forEach((entry) => {
                        adoptStyleSheet(shadowRoot ?? element, entry);
                    });
                    break;
                case 'style':
                    element.style.cssText = optionValue;
                    break;
                case 'checked':
                    element.checked = optionValue;
                    break;
                case 'elementCreated':
                    break;
                default:
                    element.setAttribute(optionName, optionValue);
                    break;
            }
        }
        options.elementCreated?.(element, shadowRoot);
    }
}
async function adoptStyleSheet(element, cssText) {
    const sheet = new CSSStyleSheet;
    await sheet.replace(cssText);
    if (element.adoptStyleSheet) {
        element.adoptStyleSheet(sheet);
    }
    else {
        if (element.adoptedStyleSheets) {
            element.adoptedStyleSheets.push(sheet);
        }
    }
}
function display(htmlElement, visible) {
    if (Array.isArray(htmlElement)) {
        for (const e of htmlElement) {
            disp(e, visible);
        }
    }
    else {
        disp(htmlElement, visible);
    }
}
function disp(htmlElement, visible) {
    if (!htmlElement) {
        return;
    }
    if (htmlElement instanceof ShadowRoot) {
        htmlElement = htmlElement.host;
    }
    if (visible) {
        htmlElement.style.display = '';
    }
    else {
        htmlElement.style.display = 'none';
    }
}
function show(htmlElement) {
    display(htmlElement, true);
}
function hide(htmlElement) {
    display(htmlElement, false);
}
function toggle(htmlElement) {
    if (!htmlElement) {
        return;
    }
    if (htmlElement instanceof ShadowRoot) {
        htmlElement = htmlElement.host;
    }
    if (htmlElement.style.display == 'none') {
        htmlElement.style.display = '';
    }
    else {
        htmlElement.style.display = 'none';
    }
}
function isVisible(htmlElement) {
    return htmlElement.style.display == '';
}
const visible = isVisible;
function styleInject(css) {
    document.head.append(createElement('style', { textContent: css }));
}

var manipulator2dCSS = ":host {\n\t--handle-radius: var(--harmony-2d-manipulator-radius, 0.5rem);\n\t--harmony-2d-manipulator-shadow-bg-color: var(--harmony-2d-manipulator-bg-color, red);\n\t--harmony-2d-manipulator-shadow-border: var(--harmony-2d-manipulator-border, none);\n\t--handle-bg-color: var(--harmony-2d-manipulator-handle-bg-color, chartreuse);\n\t--corner-bg-color: var(--harmony-2d-manipulator-corner-bg-color, var(--handle-bg-color));\n\t--side-bg-color: var(--harmony-2d-manipulator-side-bg-color, var(--handle-bg-color));\n\t--rotate-bg-color: var(--harmony-2d-manipulator-rotate-bg-color, var(--handle-bg-color));\n\n\twidth: 1rem;\n\theight: 1rem;\n\tdisplay: block;\n\tuser-select: none;\n\tpointer-events: all;\n}\n\n:host-context(.grabbing) {\n\tcursor: grabbing;\n}\n\n.manipulator {\n\tposition: absolute;\n\tbackground-color: var(--harmony-2d-manipulator-shadow-bg-color);\n\tborder: var(--harmony-2d-manipulator-shadow-border);\n\tcursor: move;\n\tpointer-events: all;\n}\n\n.rotator {\n\tscale: var(--rotate);\n\tposition: absolute;\n\twidth: var(--handle-radius);\n\theight: var(--handle-radius);\n\tbackground-color: var(--rotate-bg-color);\n\tborder-radius: calc(var(--handle-radius) * 0.5);\n\ttransform: translate(-50%, -50%);\n\tcursor: grab;\n}\n\n.corner {\n\tscale: var(--scale);\n\tposition: absolute;\n\twidth: var(--handle-radius);\n\theight: var(--handle-radius);\n\tbackground-color: var(--corner-bg-color);\n\tborder-radius: calc(var(--handle-radius) * 0.5);\n\ttransform: translate(-50%, -50%);\n\tcursor: grab;\n}\n\n.side {\n\tposition: absolute;\n\twidth: var(--handle-radius);\n\theight: var(--handle-radius);\n\tbackground-color: var(--side-bg-color);\n\tborder-radius: calc(var(--handle-radius) * 0.5);\n\ttransform: translate(-50%, -50%);\n\tcursor: grab;\n}\n\n.side.x {\n\tscale: var(--resize-x);\n}\n\n.side.y {\n\tscale: var(--resize-y);\n}\n\n.corner.grabbing {\n\tcursor: grabbing;\n}\n";

function toBool(s) {
    return s === '1' || s === 'true';
}

var uiCSS = "@media (prefers-color-scheme: light) {\n\t:root:not(.light):not(.dark) {\n\t\t--harmony-ui-background-primary: #ccc;\n\t\t--harmony-ui-background-secondary: #f9f9fb;\n\t\t--harmony-ui-background-tertiary: #fff;\n\n\t\t--harmony-ui-input-background-primary: #aaa;\n\t\t--harmony-ui-input-background-secondary: #ccc;\n\t\t--harmony-ui-input-background-tertiary: #4e4e4e;\n\n\t\t--harmony-ui-border-primary: #222;\n\t\t--harmony-ui-border-secondary: #222;\n\n\t\t--harmony-ui-input-border-primary: #222;\n\t\t--harmony-ui-input-border-secondary: #222;\n\n\t\t--harmony-ui-text-primary: #222;\n\t\t--harmony-ui-text-secondary: #222;\n\t\t--harmony-ui-text-inactive: #9e9e9ea6;\n\t\t--harmony-ui-text-link: #0069c2;\n\t\t--harmony-ui-text-invert: #fff;\n\n\t\t--harmony-ui-accent-primary: #1072eb;\n\t\t--harmony-ui-accent-secondary: #1040c1;\n\n\t\t--harmony-ui-scrollbar-bg: transparent;\n\t\t--harmony-ui-scrollbar-color: rgba(0, 0, 0, 0.25);\n\n\t\t--harmony-ui-menu-bg-color: #ccc;\n\t\t--harmony-ui-menu-item-bg-color: #ccc;\n\t\t--harmony-ui-menu-item-selected-bg-color: #ccc;\n\t\t--harmony-ui-menu-submenu-bg-color: #ccc;\n\t\t--harmony-ui-menu-submenu-fg-color: #777;\n\t\t--harmony-ui-menu-item-hover-bg-color: #fff;\n\t}\n}\n\n@media (prefers-color-scheme: dark) {\n\t:root:not(.light):not(.dark) {\n\t\t--harmony-ui-background-primary: #1b1b1b;\n\t\t--harmony-ui-background-secondary: #464747;\n\t\t--harmony-ui-background-tertiary: #4e4e4e;\n\n\t\t--harmony-ui-input-background-primary: #555;\n\t\t--harmony-ui-input-background-secondary: #333;\n\t\t--harmony-ui-input-background-tertiary: #fff;\n\n\t\t--harmony-ui-border-primary: #858585;\n\t\t--harmony-ui-border-secondary: #696969;\n\n\t\t--harmony-ui-input-border-primary: #aaa;\n\t\t--harmony-ui-input-border-secondary: #696969;\n\n\t\t--harmony-ui-text-primary: #fff;\n\t\t--harmony-ui-text-secondary: #cdcdcd;\n\t\t--harmony-ui-text-inactive: #cdcdcda6;\n\t\t--harmony-ui-text-link: #8cb4ff;\n\t\t--harmony-ui-text-invert: #1b1b1b;\n\n\t\t--harmony-ui-accent-primary: #1072eb;\n\t\t--harmony-ui-accent-secondary: #1040c1;\n\n\t\t--harmony-ui-scrollbar-bg: transparent;\n\t\t--harmony-ui-scrollbar-color: rgba(255, 255, 255, 0.25);\n\n\t\t--harmony-ui-menu-bg-color: #333333;\n\t\t--harmony-ui-menu-item-bg-color: #333333;\n\t\t--harmony-ui-menu-item-selected-bg-color: #333333;\n\t\t--harmony-ui-menu-submenu-bg-color: #333333;\n\t\t--harmony-ui-menu-submenu-fg-color: #888888;\n\t\t--harmony-ui-menu-item-hover-bg-color: #000000;\n\t}\n}\n\n:root.light {\n\t--harmony-ui-background-primary: #ccc;\n\t--harmony-ui-background-secondary: #f9f9fb;\n\t--harmony-ui-background-tertiary: #fff;\n\n\t--harmony-ui-input-background-primary: #aaa;\n\t--harmony-ui-input-background-secondary: #ccc;\n\t--harmony-ui-input-background-tertiary: #4e4e4e;\n\n\t--harmony-ui-border-primary: #222;\n\t--harmony-ui-border-secondary: #222;\n\n\t--harmony-ui-input-border-primary: #222;\n\t--harmony-ui-input-border-secondary: #222;\n\n\t--harmony-ui-text-primary: #222;\n\t--harmony-ui-text-secondary: #222;\n\t--harmony-ui-text-inactive: #9e9e9ea6;\n\t--harmony-ui-text-link: #0069c2;\n\t--harmony-ui-text-invert: #fff;\n\n\t--harmony-ui-accent-primary: #1072eb;\n\t--harmony-ui-accent-secondary: #1040c1;\n\n\t--harmony-ui-scrollbar-bg: transparent;\n\t--harmony-ui-scrollbar-color: rgba(0, 0, 0, 0.25);\n}\n\n:root.dark {\n\t--harmony-ui-background-primary: #1b1b1b;\n\t--harmony-ui-background-secondary: #464747;\n\t--harmony-ui-background-tertiary: #4e4e4e;\n\n\t--harmony-ui-input-background-primary: #555;\n\t--harmony-ui-input-background-secondary: #333;\n\t--harmony-ui-input-background-tertiary: #fff;\n\n\t--harmony-ui-border-primary: #858585;\n\t--harmony-ui-border-secondary: #696969;\n\n\t--harmony-ui-input-border-primary: #aaa;\n\t--harmony-ui-input-border-secondary: #696969;\n\n\t--harmony-ui-text-primary: #fff;\n\t--harmony-ui-text-secondary: #cdcdcd;\n\t--harmony-ui-text-inactive: #cdcdcda6;\n\t--harmony-ui-text-link: #8cb4ff;\n\t--harmony-ui-text-invert: #1b1b1b;\n\n\t--harmony-ui-accent-primary: #1072eb;\n\t--harmony-ui-accent-secondary: #1040c1;\n\n\t--harmony-ui-scrollbar-bg: transparent;\n\t--harmony-ui-scrollbar-color: rgba(255, 255, 255, 0.25);\n}\n";

let injected = false;
function injectGlobalCss() {
    if (injected) {
        return;
    }
    documentStyle(uiCSS);
    injected = true;
}

var ManipulatorDirection;
(function (ManipulatorDirection) {
    ManipulatorDirection["All"] = "all";
    ManipulatorDirection["X"] = "x";
    ManipulatorDirection["Y"] = "y";
    ManipulatorDirection["None"] = "none";
})(ManipulatorDirection || (ManipulatorDirection = {}));
function getDirection(s) {
    switch (s) {
        case 'x':
            return ManipulatorDirection.X;
        case 'y':
            return ManipulatorDirection.Y;
        case 'none':
            return ManipulatorDirection.None;
        case 'all':
        default:
            return ManipulatorDirection.All;
    }
}
function getResizeOrigin(s) {
    switch (s) {
        case 'center':
            return ManipulatorResizeOrigin.Center;
        default:
            return ManipulatorResizeOrigin.OppositeCorner;
    }
}
function hasX(d) {
    return d == ManipulatorDirection.All || d == ManipulatorDirection.X;
}
function hasY(d) {
    return d == ManipulatorDirection.All || d == ManipulatorDirection.Y;
}
var ManipulatorUpdatedEventType;
(function (ManipulatorUpdatedEventType) {
    ManipulatorUpdatedEventType["Position"] = "position";
    ManipulatorUpdatedEventType["Size"] = "size";
    ManipulatorUpdatedEventType["Rotation"] = "rotation";
})(ManipulatorUpdatedEventType || (ManipulatorUpdatedEventType = {}));
const CORNERS = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
const SIDES = [[0.5, 0], [0.5, 1], [0, 0.5], [1, 0.5]];
const SCALE_SIDES = [[0, 1], [0, 1], [1, 0], [1, 0]];
const SNAP_POSITION = 20; // Pixels
const SNAP_ROTATION = 15; // Degrees
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
var ManipulatorCorner;
(function (ManipulatorCorner) {
    ManipulatorCorner[ManipulatorCorner["None"] = -1] = "None";
    ManipulatorCorner[ManipulatorCorner["TopLeft"] = 0] = "TopLeft";
    ManipulatorCorner[ManipulatorCorner["TopRight"] = 1] = "TopRight";
    ManipulatorCorner[ManipulatorCorner["BottomLeft"] = 2] = "BottomLeft";
    ManipulatorCorner[ManipulatorCorner["BottomRight"] = 3] = "BottomRight";
})(ManipulatorCorner || (ManipulatorCorner = {}));
var ManipulatorSide;
(function (ManipulatorSide) {
    ManipulatorSide[ManipulatorSide["None"] = -1] = "None";
    ManipulatorSide[ManipulatorSide["Top"] = 0] = "Top";
    ManipulatorSide[ManipulatorSide["Bottom"] = 1] = "Bottom";
    ManipulatorSide[ManipulatorSide["Left"] = 2] = "Left";
    ManipulatorSide[ManipulatorSide["Right"] = 3] = "Right";
})(ManipulatorSide || (ManipulatorSide = {}));
var ManipulatorResizeOrigin;
(function (ManipulatorResizeOrigin) {
    ManipulatorResizeOrigin[ManipulatorResizeOrigin["OppositeCorner"] = 0] = "OppositeCorner";
    ManipulatorResizeOrigin[ManipulatorResizeOrigin["Center"] = 1] = "Center";
})(ManipulatorResizeOrigin || (ManipulatorResizeOrigin = {}));
class HTMLHarmony2dManipulatorElement extends HTMLElement {
    #shadowRoot;
    #htmlQuad;
    #translationMode = ManipulatorDirection.All;
    #canRotate = true;
    #resizeMode = ManipulatorDirection.All;
    #scale = ManipulatorDirection.All;
    #skew = ManipulatorDirection.All;
    #htmlScaleCorners = [];
    #htmlResizeSides = [];
    #htmlRotator;
    #center = { x: 25, y: 25 };
    #width = 50;
    #height = 50;
    #previousCenter = { x: -1, y: -1 };
    #previousWidth = -1;
    #previousHeight = -1;
    #rotation = 0;
    #previousRotation = 0;
    #dragCorner = ManipulatorCorner.None;
    #dragSide = ManipulatorSide.None;
    #dragThis = false;
    #dragRotator = false;
    #startPageX = 0;
    #startPageY = 0;
    #minWidth = 0;
    #minHeight = 0;
    #startWidth = 0;
    #startHeight = 0;
    #startTop = 0;
    #startLeft = 0;
    #startCenter = { x: 0, y: 0 };
    #startRotationCenter = { x: 0, y: 0 };
    #startCorners = [];
    #c0_x = 0;
    #c0_y = 0;
    #qp0_x = 0;
    #qp0_y = 0;
    #pp_x = 0;
    #pp_y = 0;
    #dragging = false;
    #transformScale = 1;
    #resizeOrigin = ManipulatorResizeOrigin.OppositeCorner;
    constructor() {
        super();
        this.#shadowRoot = this.attachShadow({ mode: 'closed' });
        shadowRootStyle(this.#shadowRoot, manipulator2dCSS);
        this.#htmlQuad = createElement('div', {
            parent: this.#shadowRoot,
            class: 'manipulator',
            child: this.#htmlRotator = createElement('div', {
                class: 'rotator',
                events: {
                    mousedown: (event) => {
                        switch (event.button) {
                            case 0:
                                event.stopPropagation();
                                this.#startDragRotator(event);
                                break;
                            case 2:
                                event.stopPropagation();
                                this.#rotateInput(event);
                                break;
                        }
                    },
                }
            }),
            events: {
                mousedown: (event) => {
                    switch (event.button) {
                        case 0:
                            this.#startTranslate(event);
                            break;
                        case 2:
                            this.#translateInput(event);
                            break;
                    }
                },
            }
        });
        for (let i = 0; i < 4; i++) {
            const htmlCorner = createElement('div', {
                class: 'corner',
                parent: this.#htmlQuad,
                events: {
                    mousedown: (event) => {
                        if (event.button == 0) {
                            this.#startDragCorner(event, i);
                        }
                    },
                }
            });
            this.#htmlScaleCorners.push(htmlCorner);
        }
        for (let i = 0; i < 4; i++) {
            const htmlCorner = createElement('div', {
                class: `side ${i < 2 ? 'y' : 'x'}`,
                parent: this.#htmlQuad,
                events: {
                    mousedown: (event) => {
                        if (event.button == 0) {
                            this.#startDragSide(event, i);
                        }
                    },
                }
            });
            this.#htmlResizeSides.push(htmlCorner);
        }
        document.addEventListener('mousemove', (event) => this.#onMouseMove(event));
        document.addEventListener('mouseup', (event) => this.#stopDrag(event));
    }
    setTopLeft(x, y) {
    }
    #onMouseMove(event) {
        this.#translate(event);
        this.#resize(event);
        this.#rotate(event);
    }
    #stopDrag(event) {
        if (this.#dragging) {
            let type = ManipulatorUpdatedEventType.Position;
            switch (true) {
                case this.#dragThis:
                    type = ManipulatorUpdatedEventType.Position;
                    break;
                case this.#dragRotator:
                    type = ManipulatorUpdatedEventType.Rotation;
                    break;
                case this.#dragCorner >= 0:
                case this.#dragSide >= 0:
                    type = ManipulatorUpdatedEventType.Size;
                    break;
            }
            this.#dragging = false;
            this.#dispatchEvent('updateend', type);
        }
        this.#stopTranslate(event);
        this.#stopDragRotator(event);
        this.#stopDragCorner(event);
        this.#stopDragSide(event);
    }
    #stopTranslate(event) {
        this.#dragThis = false;
    }
    #stopDragRotator(event) {
        this.#dragRotator = false;
    }
    #stopDragCorner(event) {
        if (this.#dragCorner < 0) {
            return;
        }
        this.#htmlScaleCorners[this.#dragCorner].classList.remove('grabbing');
        this.classList.remove('grabbing');
        this.#dragCorner = ManipulatorCorner.None;
    }
    #stopDragSide(event) {
        if (this.#dragSide < 0) {
            return;
        }
        this.#htmlResizeSides[this.#dragSide].classList.remove('grabbing');
        this.classList.remove('grabbing');
        this.#dragSide = ManipulatorSide.None;
    }
    #startTranslate(event) {
        if (this.#dragging) {
            return;
        }
        this.#dragging = true;
        this.#dragThis = true;
        this.#initStartPositions(event);
    }
    #startDragRotator(event) {
        if (this.#dragging) {
            return;
        }
        this.#dragging = true;
        this.#dragRotator = true;
        this.#htmlRotator?.classList.add('grabbing');
        this.classList.add('grabbing');
        this.#initStartPositions(event);
    }
    #startDragCorner(event, i) {
        if (this.#dragging) {
            return;
        }
        this.#htmlScaleCorners[i].classList.add('grabbing');
        this.classList.add('grabbing');
        this.#dragging = true;
        this.#dragCorner = i;
        this.#initStartPositions(event);
    }
    #startDragSide(event, i) {
        if (this.#dragging) {
            return;
        }
        this.#htmlResizeSides[i].classList.add('grabbing');
        this.classList.add('grabbing');
        this.#dragging = true;
        this.#dragSide = i;
        this.#initStartPositions(event);
    }
    #translate(event) {
        if (!this.#dragThis) {
            return;
        }
        this.#deltaMove(event);
        this.#refresh();
        /*
        if (this.drag === 'x-axis') {
            this.deltaMove($event, false, true);
          } else if (this.drag === 'y-axis') {
            this.deltaMove($event, true, false);
          } else {
            this.deltaMove($event, true, true);
          }
            */
    }
    #resize(event) {
        if (this.#dragCorner > ManipulatorCorner.None || this.#dragSide > ManipulatorSide.None) {
            this.#deltaResize(event);
            this.#refresh();
        }
    }
    #rotate(event) {
        if (this.#dragRotator && this.#canRotate) {
            const currentX = event.clientX;
            const currentY = event.clientY;
            this.#rotation = -Math.atan2(currentX - this.#startRotationCenter.x, currentY - this.#startRotationCenter.y) + Math.PI;
            if (event.ctrlKey) {
                this.#snapRotation();
            }
            this.#update(ManipulatorUpdatedEventType.Rotation);
            this.#refresh();
        }
    }
    #snapPosition(a) {
        return Math.round(a / SNAP_POSITION) * SNAP_POSITION;
    }
    #snapRotation() {
        this.#rotation = Math.round(this.#rotation * RAD_TO_DEG / SNAP_ROTATION) * SNAP_ROTATION * DEG_TO_RAD;
    }
    #update(type) {
        if (this.#previousHeight == this.#height && this.#previousCenter.x == this.#center.x && this.#previousCenter.y == this.#center.y && this.#previousWidth == this.#width && this.#previousRotation == this.#rotation) {
            return;
        }
        this.#previousHeight = this.#height;
        this.#previousWidth = this.#width;
        this.#previousCenter.x = this.#center.x;
        this.#previousCenter.y = this.#center.y;
        this.#previousRotation = this.#rotation;
        this.#dispatchEvent('change', type);
    }
    #dispatchEvent(name, type) {
        this.dispatchEvent(new CustomEvent(name, {
            detail: {
                type: type,
                position: { x: this.#center.x, y: this.#center.y },
                width: this.#width,
                height: this.#height,
                rotation: this.#rotation,
                topLeft: this.getTopLeft(),
                topRight: this.getTopRight(),
                bottomLeft: this.getBottomLeft(),
                bottomRight: this.getBottomRight(),
            }
        }));
    }
    getTopLeft() {
        return this.getCorner(ManipulatorCorner.TopLeft);
    }
    getTopRight() {
        return this.getCorner(ManipulatorCorner.TopRight);
    }
    getBottomLeft() {
        return this.getCorner(ManipulatorCorner.BottomLeft);
    }
    getBottomRight() {
        return this.getCorner(ManipulatorCorner.BottomRight);
    }
    getCorner(i) {
        if (i < 0 || i >= 4) {
            return { x: 0, y: 0 };
        }
        const c = CORNERS[i];
        const x = c[0] * this.#width * 0.5;
        const y = c[1] * this.#height * 0.5;
        return {
            x: x * Math.cos(this.#rotation) - y * Math.sin(this.#rotation) + this.#center.x,
            y: x * Math.sin(this.#rotation) + y * Math.cos(this.#rotation) + this.#center.y,
        };
    }
    set(values) {
        if (values.rotation !== undefined) {
            this.#rotation = values.rotation;
        }
        if (values.left !== undefined) {
            this.#center.x = values.left;
        }
        if (values.top !== undefined) {
            this.#center.y = values.top;
        }
        if (values.width !== undefined) {
            this.#width = values.width;
        }
        if (values.height !== undefined) {
            this.#height = values.height;
        }
        this.#refresh();
    }
    setMode(values) {
        if (values.rotation !== undefined) {
            this.#canRotate = values.rotation;
        }
        if (values.translation !== undefined) {
            this.#translationMode = values.translation;
        }
        if (values.resize !== undefined) {
            this.#resizeMode = values.resize;
        }
        if (values.resizeOrigin !== undefined) {
            this.#resizeOrigin = values.resizeOrigin;
        }
        if (values.scale !== undefined) {
            this.#scale = values.scale;
        }
        this.#refresh();
    }
    setMinWidth(minWidth) {
        this.#minWidth = minWidth;
    }
    setMinHeight(minHeight) {
        this.#minHeight = minHeight;
    }
    connectedCallback() {
        this.#refresh();
    }
    #refresh() {
        this.style.setProperty('--translate', this.#translationMode);
        this.style.setProperty('--rotate', this.#canRotate ? '1' : '0');
        this.style.setProperty('--resize-x', hasX(this.#resizeMode) ? '1' : '0');
        this.style.setProperty('--resize-y', hasY(this.#resizeMode) ? '1' : '0');
        this.style.setProperty('--scale', this.#scale == ManipulatorDirection.All ? '1' : '0');
        this.style.setProperty('--skew', this.#skew);
        this.#htmlQuad.style.rotate = `${this.#rotation}rad`;
        const width = Math.abs(this.#width);
        const height = Math.abs(this.#height);
        this.#htmlQuad.style.left = `${this.#center.x - width * 0.5}px`;
        this.#htmlQuad.style.top = `${this.#center.y - height * 0.5}px`;
        this.#htmlQuad.style.width = `${width}px`;
        this.#htmlQuad.style.height = `${height}px`;
        for (let i = 0; i < 4; i++) {
            const c = CORNERS[i];
            const htmlCorner = this.#htmlScaleCorners[i];
            htmlCorner.style.left = `${(c[0] == -1 ? 0 : 1) * width}px`;
            htmlCorner.style.top = `${(c[1] == -1 ? 0 : 1) * height}px`;
        }
        for (let i = 0; i < 4; i++) {
            const s = SIDES[i];
            const htmlSide = this.#htmlResizeSides[i];
            htmlSide.style.left = `${s[0] * width}px`;
            htmlSide.style.top = `${s[1] * height}px`;
        }
        if (this.#htmlRotator) {
            this.#htmlRotator.style.left = `${0.5 * width}px`;
            this.#htmlRotator.style.top = `${-0.2 * height}px`;
        }
    }
    attributeChangedCallback(name, oldValue, newValue) {
        switch (name) {
            case 'translate':
                this.#translationMode = getDirection(newValue);
                break;
            case 'rotate':
                this.#canRotate = toBool(newValue);
                break;
            case 'resize':
                this.#resizeMode = getDirection(newValue);
                break;
            case 'resize-origin':
                this.#resizeOrigin = getResizeOrigin(newValue);
                break;
            case 'scale':
                this.#scale = getDirection(newValue);
                break;
            case 'skew':
                this.#skew = getDirection(newValue);
                break;
            case 'width':
                this.#width = Number(newValue);
                break;
            case 'height':
                this.#height = Number(newValue);
                break;
            case 'min-width':
                this.#minWidth = Number(newValue);
                break;
            case 'min-height':
                this.#minHeight = Number(newValue);
                break;
        }
        this.#refresh();
    }
    static get observedAttributes() {
        return ['translate', 'rotate', 'resize', 'scale', 'resize-origin', 'skew', 'width', 'height', 'min-width', 'min-height'];
    }
    #deltaMove(event) {
        const left = this.#translationMode == ManipulatorDirection.All || this.#translationMode == ManipulatorDirection.X;
        const top = this.#translationMode == ManipulatorDirection.All || this.#translationMode == ManipulatorDirection.Y;
        const delta = this.#getDelta(event);
        const deltaX = this.convertToUnit(delta.x, 'width') * this.#transformScale;
        const deltaY = this.convertToUnit(delta.y, 'height') * this.#transformScale;
        if (top) {
            this.#center.y = this.#startTop + deltaY;
        }
        if (left) {
            this.#center.x = this.#startLeft + deltaX;
        }
        this.#update(ManipulatorUpdatedEventType.Position);
    }
    #deltaResize(event) {
        function dot(a, b) {
            return a.x * b.x + a.y * b.y;
        }
        if (!((this.#dragCorner > ManipulatorCorner.None && this.#scale == ManipulatorDirection.All) ||
            (this.#dragSide > ManipulatorSide.None && this.#resizeMode == ManipulatorDirection.All) ||
            ((this.#dragSide == ManipulatorSide.Left || this.#dragSide == ManipulatorSide.Right) && this.#resizeMode == ManipulatorDirection.X) ||
            ((this.#dragSide == ManipulatorSide.Top || this.#dragSide == ManipulatorSide.Bottom) && this.#resizeMode == ManipulatorDirection.Y))) {
            return;
        }
        const delta = this.#getDelta(event);
        if (!event.shiftKey && this.#dragCorner > ManipulatorCorner.None) {
            const tl = this.#startCorners[ManipulatorCorner.TopLeft];
            const br = this.#startCorners[ManipulatorCorner.BottomRight];
            const startCenter = { x: (tl.x + br.x) * 0.5, y: (tl.y + br.y) * 0.5 };
            const v = { x: this.#startCorners[this.#dragCorner].x - startCenter.x, y: this.#startCorners[this.#dragCorner].y - startCenter.y };
            const norm = Math.sqrt(v.x * v.x + v.y * v.y);
            v.x = v.x / norm * (this.#startWidth < 0 ? -1 : 1);
            v.y = v.y / norm * (this.#startHeight < 0 ? -1 : 1);
            const d = dot(delta, v);
            delta.x = v.x * d;
            delta.y = v.y * d;
        }
        if (this.#dragSide > ManipulatorSide.None) {
            const c = SCALE_SIDES[this.#dragSide];
            const v = { x: c[0] * Math.cos(this.#rotation) - c[1] * Math.sin(this.#rotation), y: c[0] * Math.sin(this.#rotation) + c[1] * Math.cos(this.#rotation) };
            const d = dot(delta, v);
            delta.x = v.x * d;
            delta.y = v.y * d;
        }
        delta.x *= this.#transformScale;
        delta.y *= this.#transformScale;
        const qp_x = this.#qp0_x + delta.x;
        const qp_y = this.#qp0_y + delta.y;
        let resizeOrigin = this.#resizeOrigin;
        if (event.altKey) {
            if (resizeOrigin == ManipulatorResizeOrigin.Center) {
                resizeOrigin = ManipulatorResizeOrigin.OppositeCorner;
            }
            else {
                resizeOrigin = ManipulatorResizeOrigin.Center;
            }
        }
        const cp_x = resizeOrigin == ManipulatorResizeOrigin.Center ? this.#c0_x : (qp_x + this.#pp_x) * 0.5;
        const cp_y = resizeOrigin == ManipulatorResizeOrigin.Center ? this.#c0_y : (qp_y + this.#pp_y) * 0.5;
        const mtheta = -this.#rotation;
        const cos_mt = Math.cos(mtheta);
        const sin_mt = Math.sin(mtheta);
        let q_x = qp_x * cos_mt - qp_y * sin_mt - cos_mt * cp_x + sin_mt * cp_y + cp_x;
        let q_y = qp_x * sin_mt + qp_y * cos_mt - sin_mt * cp_x - cos_mt * cp_y + cp_y;
        let p_x = this.#pp_x * cos_mt - this.#pp_y * sin_mt - cos_mt * cp_x + sin_mt * cp_y + cp_x;
        let p_y = this.#pp_x * sin_mt + this.#pp_y * cos_mt - sin_mt * cp_x - cos_mt * cp_y + cp_y;
        const matrix = this.#resizeMatrix();
        const wtmp = matrix.a * (q_x - p_x) + matrix.c * (p_x - q_x);
        const htmp = matrix.b * (q_y - p_y) + matrix.d * (p_y - q_y);
        let w;
        let h;
        if (wtmp < this.#minWidth || htmp < this.#minHeight) {
            w = Math.max(this.#minWidth, wtmp);
            h = Math.max(this.#minHeight, htmp);
            const theta = -mtheta;
            const cos_t = Math.cos(theta);
            const sin_t = Math.sin(theta);
            const dh_x = -sin_t * h;
            const dh_y = cos_t * h;
            const dw_x = cos_t * w;
            const dw_y = sin_t * w;
            const qp_x_min = this.#pp_x + (matrix.a - matrix.c) * dw_x + (matrix.b - matrix.d) * dh_x;
            const qp_y_min = this.#pp_y + (matrix.a - matrix.c) * dw_y + (matrix.b - matrix.d) * dh_y;
            const cp_x_min = (qp_x_min + this.#pp_x) * 0.5;
            const cp_y_min = (qp_y_min + this.#pp_y) * 0.5;
            q_x = qp_x_min * cos_mt - qp_y_min * sin_mt - cos_mt * cp_x_min + sin_mt * cp_y_min + cp_x_min;
            q_y = qp_x_min * sin_mt + qp_y_min * cos_mt - sin_mt * cp_x_min - cos_mt * cp_y_min + cp_y_min;
            p_x = this.#pp_x * cos_mt - this.#pp_y * sin_mt - cos_mt * cp_x_min + sin_mt * cp_y_min + cp_x_min;
            p_y = this.#pp_x * sin_mt + this.#pp_y * cos_mt - sin_mt * cp_x_min - cos_mt * cp_y_min + cp_y_min;
        }
        else {
            w = wtmp;
            h = htmp;
        }
        let deltaCenterX = 0;
        let deltaCenterY = 0;
        let deltaWidth = (w - this.#startWidth);
        let deltaHeight = h - this.#startHeight;
        const dx = (deltaWidth * Math.cos(this.#rotation) + deltaHeight * Math.sin(this.#rotation)) * 0.5;
        const dy = (deltaHeight * Math.cos(this.#rotation) + deltaWidth * Math.sin(this.#rotation)) * 0.5;
        if (resizeOrigin != ManipulatorResizeOrigin.Center) {
            switch (this.#dragSide) {
                case ManipulatorSide.Left:
                    deltaCenterX = -dx;
                    deltaCenterY = -dy;
                    break;
                case ManipulatorSide.Right:
                    deltaCenterX = dx;
                    deltaCenterY = dy;
                    break;
                case ManipulatorSide.Top:
                    deltaCenterX = dx;
                    deltaCenterY = -dy;
                    break;
                case ManipulatorSide.Bottom:
                    deltaCenterX = -dx;
                    deltaCenterY = dy;
                    break;
            }
            this.#center.x = this.#startCenter.x + deltaCenterX;
            this.#center.y = this.#startCenter.y + deltaCenterY;
            let oppositeCorner = ManipulatorCorner.None;
            switch (this.#dragCorner) {
                case ManipulatorCorner.TopLeft:
                    oppositeCorner = ManipulatorCorner.BottomRight;
                    break;
                case ManipulatorCorner.TopRight:
                    oppositeCorner = ManipulatorCorner.BottomLeft;
                    break;
                case ManipulatorCorner.BottomLeft:
                    oppositeCorner = ManipulatorCorner.TopRight;
                    break;
                case ManipulatorCorner.BottomRight:
                    oppositeCorner = ManipulatorCorner.TopLeft;
                    break;
            }
            if (oppositeCorner != ManipulatorCorner.None) {
                const startCorner = this.#startCorners[oppositeCorner];
                const c = CORNERS[this.#dragCorner];
                const x = c[0] * (this.#startWidth + deltaWidth) * 0.5;
                const y = c[1] * (this.#startHeight + deltaHeight) * 0.5;
                this.#center.x = startCorner.x + x * Math.cos(this.#rotation) - y * Math.sin(this.#rotation);
                this.#center.y = startCorner.y + x * Math.sin(this.#rotation) + y * Math.cos(this.#rotation);
            }
        }
        else {
            deltaWidth = 2 * deltaWidth;
            deltaHeight = 2 * deltaHeight;
        }
        //console.info("deltaWidth", deltaWidth);
        this.#width = this.#startWidth + deltaWidth * (this.#startWidth < 0 ? -1 : 1);
        this.#height = this.#startHeight + deltaHeight * (this.#startHeight < 0 ? -1 : 1);
        this.#update(ManipulatorUpdatedEventType.Size);
    }
    #getDelta(event) {
        let currentX = event.pageX;
        let currentY = event.pageY;
        if (event.ctrlKey) {
            currentX = this.#snapPosition(currentX);
            currentY = this.#snapPosition(currentY);
        }
        return {
            x: currentX - this.#startPageX,
            y: currentY - this.#startPageY,
        };
    }
    #resizeMatrix() {
        const a = (this.#dragCorner == ManipulatorCorner.BottomRight) || (this.#dragCorner == ManipulatorCorner.TopRight) || this.#dragSide == ManipulatorSide.Right ? 1 : 0;
        const b = (this.#dragCorner == ManipulatorCorner.BottomRight) || (this.#dragCorner == ManipulatorCorner.BottomLeft) || this.#dragSide == ManipulatorSide.Left || this.#dragSide == ManipulatorSide.Bottom ? 1 : 0;
        const c = a === 1 ? 0 : 1;
        const d = b === 1 ? 0 : 1;
        return {
            a,
            b,
            c,
            d
        };
    }
    convertToUnit(value, ratio) {
        return value;
        /*
        if (this.unit === 'px') {
        }

        if (this.unit === 'viewport') {
            const windowSize: number = ratio === 'width' ? window.innerWidth || screen.width : window.innerHeight || screen.height;
            return (value * 100) / windowSize;
        }

        const parentSize: number = ratio === 'width' ? this.parentWidth : this.parentHeight;
        return (value * 100) / parentSize;
        */
    }
    #initStartPositions(event) {
        this.#startPageX = event.pageX;
        this.#startPageY = event.pageY;
        const rect = this.#htmlQuad.getBoundingClientRect();
        const width = Math.abs(this.#htmlQuad.offsetWidth * Math.cos(this.#rotation)) + Math.abs(this.#htmlQuad.offsetHeight * Math.sin(this.#rotation));
        if (rect.width != 0) {
            this.#transformScale = width / rect.width;
        }
        else {
            this.#transformScale = 1;
        }
        this.#initStartPositionsMove();
        this.#initStartPositionsRotation();
        this.#initStartPositionsResize();
        this.#initStartCorners();
    }
    #initStartPositionsMove() {
        this.#startWidth = this.#width;
        this.#startHeight = this.#height;
        this.#startLeft = this.#center.x;
        this.#startTop = this.#center.y;
    }
    #initStartPositionsRotation() {
        const rect = this.#htmlQuad.getBoundingClientRect();
        this.#startRotationCenter.x = rect.left + rect.width * 0.5;
        this.#startRotationCenter.y = rect.top + rect.height * 0.5;
    }
    #initStartPositionsResize() {
        const theta = this.#rotation;
        const cos_t = Math.cos(theta);
        const sin_t = Math.sin(theta);
        const l = this.#center.x; // - this.#width * 0.5;
        const t = this.#center.y; //- this.#height * 0.5;
        const w = this.#width;
        const h = this.#height;
        const matrix = this.#resizeMatrix();
        this.#c0_x = this.#center.x;
        this.#c0_y = this.#center.y;
        const q0_x = l + matrix.a * w;
        const q0_y = t + matrix.b * h;
        const p0_x = l + matrix.c * w;
        const p0_y = t + matrix.d * h;
        this.#qp0_x = q0_x * cos_t - q0_y * sin_t - this.#c0_x * cos_t + this.#c0_y * sin_t + this.#c0_x;
        this.#qp0_y = q0_x * sin_t + q0_y * cos_t - this.#c0_x * sin_t - this.#c0_y * cos_t + this.#c0_y;
        this.#pp_x = p0_x * cos_t - p0_y * sin_t - this.#c0_x * cos_t + this.#c0_y * sin_t + this.#c0_x;
        this.#pp_y = p0_x * sin_t + p0_y * cos_t - this.#c0_x * sin_t - this.#c0_y * cos_t + this.#c0_y;
        this.#startCenter.x = this.#center.x;
        this.#startCenter.y = this.#center.y;
    }
    #initStartCorners() {
        for (let i = 0; i < 4; i++) {
            this.#startCorners[i] = this.getCorner(i);
        }
    }
    #rotateInput(event) {
        const result = prompt('rotation', String(this.#rotation * RAD_TO_DEG));
        if (result) {
            this.#rotation = Number(result) * DEG_TO_RAD;
            this.#update(ManipulatorUpdatedEventType.Rotation);
            this.#refresh();
            this.#dispatchEvent('updateend', ManipulatorUpdatedEventType.Rotation);
        }
    }
    #translateInput(event) {
        const result = prompt('center', `${this.#center.x} ${this.#center.y}`);
        if (result) {
            const a = result.split(' ');
            if (a.length >= 2) {
                this.#center.x = Number(a[0]);
                this.#center.y = Number(a[1]);
                this.#update(ManipulatorUpdatedEventType.Position);
                this.#refresh();
                this.#dispatchEvent('updateend', ManipulatorUpdatedEventType.Position);
            }
        }
    }
}
let defined2dManipulator = false;
function defineHarmony2dManipulator() {
    if (window.customElements && !defined2dManipulator) {
        customElements.define('harmony-2d-manipulator', HTMLHarmony2dManipulatorElement);
        defined2dManipulator = true;
        injectGlobalCss();
    }
}

var accordionCSS = ":host {\n\toverflow: hidden;\n\tdisplay: flex;\n\tjustify-content: center;\n\tflex-direction: column;\n\tposition: relative;\n\n\t/*--accordion-text-color: #000;*/\n}\n\n.item .header {\n\tcursor: pointer;\n\tdisplay: block;\n\tuser-select: none;\n\tpadding: 5px;\n\t/*color: var(--accordion-text-color)\n\tcolor: var(--accordion-text-color)*/\n}\n\n.item .content {\n\tdisplay: block;\n\toverflow: hidden;\n\theight: 0;\n\t/*transition: all 0.5s ease 0s;*/\n}\n\n.item .content.selected {\n\theight: unset;\n\tpadding: 10px;\n}\n\n\n@media (prefers-color-scheme: light) {\n\t:host {\n\t\t--accordion-text-color: #000;\n\t\t--accordion-background-color: #eee;\n\t\tcolor: #000;\n\t\tbackground: #eee;\n\t}\n}\n\n@media (prefers-color-scheme: dark) {\n\t:host {\n\t\t--accordion-text-color: #eee;\n\t\t--accordion-background-color: #000;\n\t\tcolor: #eee;\n\t\tbackground: #000;\n\t}\n}\n";

var itemCSS = "slot[name=\"header\"] {\n\tcursor: pointer;\n}\n";

class HTMLHarmonyItemElement extends HTMLElement {
    #shadowRoot;
    #htmlHeader;
    #htmlContent;
    #id = '';
    constructor() {
        super();
        this.#shadowRoot = this.attachShadow({ mode: 'closed' });
        shadowRootStyle(this.#shadowRoot, itemCSS);
        this.#htmlHeader = createElement('slot', {
            name: 'header',
            parent: this.#shadowRoot,
        });
        this.#htmlContent = createElement('slot', {
            name: 'content',
            parent: this.#shadowRoot,
        });
    }
    getHeader() {
        return this.#htmlHeader;
    }
    getContent() {
        return this.#htmlContent;
    }
    getId() {
        return this.#id;
    }
    attributeChangedCallback(name, oldValue, newValue) {
        switch (name) {
            case 'id':
            case 'item-id':
                this.#id = newValue;
                break;
        }
    }
    static get observedAttributes() {
        return ['id', 'item-id'];
    }
}
let definedHarmonyItem = false;
function defineHarmonyItem() {
    if (window.customElements && !definedHarmonyItem) {
        customElements.define('harmony-item', HTMLHarmonyItemElement);
        definedHarmonyItem = true;
    }
}

class HTMLHarmonyAccordionElement extends HTMLElement {
    #doOnce = true;
    #multiple = false;
    #disabled = false;
    #items = new Set();
    #selected = new Set();
    #shadowRoot;
    //#htmlSlots = new Set<HTMLSlotElement>();
    constructor() {
        super();
        this.#shadowRoot = this.attachShadow({ mode: 'closed', slotAssignment: "manual", });
        shadowRootStyle(this.#shadowRoot, accordionCSS);
        this.#initMutationObserver();
    }
    connectedCallback() {
        if (this.#doOnce) {
            this.#processChilds();
            this.#doOnce = false;
        }
    }
    #processChilds() {
        for (const child of this.children) {
            this.#addItem(child);
        }
    }
    #addItem(item) {
        if (this.#items.has(item)) {
            return;
        }
        if (item.tagName == 'HARMONY-ITEM') {
            const htmlSlot = createElement('slot', {
                parent: this.#shadowRoot,
            });
            htmlSlot.assign(item);
            this.#items.add(item);
            item.getHeader().addEventListener('click', () => this.#toggle(item));
        }
        this.#refresh();
    }
    createItem(header, content) {
        const item = createElement('harmony-item', { childs: [header, content] });
        header.slot = 'header';
        content.slot = 'content';
        this.append(item);
        return item;
    }
    #refresh() {
        for (const htmlItem of this.#items) {
            hide(htmlItem.getContent());
        }
    }
    #toggle(htmlItem, collapse = true) {
        //let content = this.#items.get(header);
        /*
        if (collapse && !this.#multiple) {
            for (let selected of this.#selected) {
                if (htmlItem != selected) {
                    this.#toggle(selected, false);
                }
            }
        }*/
        if (this.#selected.has(htmlItem)) {
            this.#display(htmlItem, false);
            htmlItem.dispatchEvent(new CustomEvent('collapsed'));
        }
        else {
            this.#display(htmlItem, true);
            htmlItem.dispatchEvent(new CustomEvent('expanded'));
        }
    }
    #display(htmlItem, display) {
        if (display) {
            this.#selected.add(htmlItem);
            //htmlHeader.classList.add('selected');
            //htmlContent.classList.add('selected');
            show(htmlItem);
            show(htmlItem.getContent());
            this.#dispatchSelect(true, htmlItem);
            if (!this.#multiple) {
                for (const selected of this.#selected) {
                    if (htmlItem != selected) {
                        this.#display(selected, false);
                    }
                }
            }
        }
        else {
            this.#selected.delete(htmlItem);
            //htmlHeader.classList.remove('selected');
            //htmlContent.classList.remove('selected');
            hide(htmlItem.getContent());
            this.#dispatchSelect(false, htmlItem);
        }
    }
    clear() {
        this.#items.clear();
        this.#selected.clear();
        this.#refresh();
    }
    expand(id) {
        for (const htmlItem of this.#items) {
            if (htmlItem.getId() == id) {
                this.#display(htmlItem, true);
            }
        }
    }
    expandAll() {
        for (const htmlItem of this.#items) {
            this.#display(htmlItem, true);
        }
    }
    collapse(id) {
        for (const htmlItem of this.#items) {
            if (htmlItem.getId() == id) {
                this.#display(htmlItem, false);
            }
        }
    }
    collapseAll() {
        for (const htmlItem of this.#items) {
            this.#display(htmlItem, false);
        }
    }
    #dispatchSelect(selected, htmlItem) {
        const htmlHeader = htmlItem.getHeader();
        const htmlContent = htmlItem.getContent();
        this.dispatchEvent(new CustomEvent(selected ? 'select' : 'unselect', {
            detail: {
                id: htmlItem.getId(),
                header: htmlHeader.assignedElements()[0],
                content: htmlContent.assignedElements()[0]
            }
        }));
    }
    #initMutationObserver() {
        const config = { childList: true, subtree: true };
        const mutationCallback = (mutationsList, observer) => {
            for (const mutation of mutationsList) {
                const addedNodes = mutation.addedNodes;
                for (const addedNode of addedNodes) {
                    if (addedNode.parentNode == this) {
                        this.#addItem(addedNode);
                    }
                }
            }
        };
        const observer = new MutationObserver(mutationCallback);
        observer.observe(this, config);
    }
    set disabled(disabled) {
        this.#disabled = disabled ? true : false;
        this.classList[this.#disabled ? 'add' : 'remove']('disabled');
    }
    get disabled() {
        return this.#disabled;
    }
    attributeChangedCallback(name, oldValue, newValue) {
        switch (name) {
            case 'multiple':
                this.#multiple = toBool(newValue);
                break;
        }
    }
    static get observedAttributes() {
        return ['multiple'];
    }
}
let definedAccordion = false;
function defineHarmonyAccordion() {
    if (window.customElements && !definedAccordion) {
        defineHarmonyItem();
        customElements.define('harmony-accordion', HTMLHarmonyAccordionElement);
        definedAccordion = true;
        injectGlobalCss();
    }
}

var colorPickerCSS = ":host {\n\t--harmony-color-picker-shadow-width: var(--harmony-color-picker-width, 15rem);\n\t--harmony-color-picker-shadow-height: var(--harmony-color-picker-height, 15rem);\n\t--harmony-color-picker-shadow-gap: var(--harmony-color-picker-gap, 0.5rem);\n\n\t--foreground-layer: none;\n\n\tbackground-color: var(--main-bg-color-bright);\n\tpadding: var(--harmony-color-picker-shadow-gap);\n\tbox-sizing: border-box;\n\tdisplay: inline-grid;\n\t/*grid-template-rows: 1rem 5fr;\n\tgrid-template-columns: 2fr 2fr 1rem;*/\n\tcolumn-gap: var(--harmony-color-picker-shadow-gap);\n\trow-gap: var(--harmony-color-picker-shadow-gap);\n\n\t/*width: var(--harmony-color-picker-width, 10rem);\n\theight: var(--harmony-color-picker-height, 10rem);*/\n\t/*display: flex;\n\tflex-wrap: wrap;*/\n\tgrid-template-areas: \"h h h h\" \"m m m a\" \"i i s s\" \"b b b b\";\n}\n\n#hue-picker {\n\tposition: relative;\n\t/*flex-basis: var(--harmony-color-picker-shadow-width);*/\n\tpadding: 1rem;\n\tbackground-image: linear-gradient(90deg, red, yellow, lime, cyan, blue, magenta, red);\n\tgrid-area: h;\n\theight: 0;\n}\n\n#main-picker {\n\tposition: relative;\n\tgrid-area: m;\n\twidth: var(--harmony-color-picker-shadow-width);\n\theight: var(--harmony-color-picker-shadow-height);\n\tbackground-image: linear-gradient(180deg, white, rgba(255, 255, 255, 0) 50%), linear-gradient(0deg, black, rgba(0, 0, 0, 0) 50%), linear-gradient(90deg, #808080, rgba(128, 128, 128, 0));\n\tbackground-color: currentColor;\n}\n\n#alpha-picker {\n\tposition: relative;\n\tpadding: 1rem;\n\tgrid-area: a;\n\twidth: 0;\n}\n\n#hue-selector {\n\tpadding: 1rem 0.2rem;\n}\n\n#alpha-selector {\n\tpadding: 0.2rem 1rem;\n}\n\n#main-selector {\n\tpadding: 0.5rem;\n\tborder-radius: 50%;\n}\n\n#input {\n\twidth: calc(var(--harmony-color-picker-shadow-width) * 0.6);\n\tgrid-area: i;\n\tfont-family: monospace;\n\tfont-size: 1.5rem;\n\tbox-sizing: border-box;\n}\n\n#sample {\n\tgrid-area: s;\n\t/*width: calc(var(--harmony-color-picker-shadow-width) * 0.25);*/\n}\n\n#buttons {\n\tgrid-area: b;\n\tdisplay: flex;\n\tgap: 2rem;\n}\n\n#buttons>button {\n\tflex: 1;\n\tfont-size: 1.5rem;\n\tcursor: pointer;\n}\n\n.alpha-background {\n\tbackground: var(--foreground-layer),\n\t\tlinear-gradient(45deg, lightgrey 25%, transparent 25%, transparent 75%, lightgrey 75%) 0 0 / 1rem 1rem,\n\t\tlinear-gradient(45deg, lightgrey 25%, white 25%, white 75%, lightgrey 75%) 0.5em 0.5em / 1em 1em;\n}\n\n.selector {\n\tposition: absolute;\n\tborder: 2px solid #fff;\n\tborder-radius: 100%;\n\tbox-shadow: 0 0 3px 1px #67b9ff;\n\ttransform: translate(-50%, -50%);\n\tcursor: pointer;\n\tdisplay: block;\n\tbackground: none;\n\tborder-radius: 2px;\n}\n";

class HTMLHarmonyColorPickerElement extends HTMLElement {
    #doOnce = true;
    #shadowRoot;
    #color = new Color({ hex: '#00ffffff' });
    #htmlHuePicker;
    #htmlHueSelector;
    #htmlMainPicker;
    #htmlMainSelector;
    #htmlAlphaPicker;
    #htmlAlphaSelector;
    #htmlInput;
    #htmlSample;
    #htmlOk;
    #htmlCancel;
    #dragElement = null;
    #shiftX = 0;
    #shiftY = 0;
    #pageX = 0;
    #pageY = 0;
    constructor() {
        super();
        document.addEventListener('mouseup', () => this.#dragElement = null);
        document.addEventListener('mousemove', event => this.#handleMouseMove(event));
        this.#shadowRoot = this.attachShadow({ mode: 'closed' });
        shadowRootStyle(this.#shadowRoot, colorPickerCSS);
        this.#htmlHuePicker = createElement('div', {
            parent: this.#shadowRoot,
            id: 'hue-picker',
            child: this.#htmlHueSelector = createElement('div', {
                id: 'hue-selector',
                class: 'selector',
                events: {
                    mousedown: (event) => this.#handleMouseDown(event),
                },
            }),
            events: {
                mousedown: (event) => {
                    this.#updateHue(event.offsetX / this.#htmlHuePicker.offsetWidth);
                    this.#handleMouseDown(event, this.#htmlHueSelector);
                },
            },
        });
        this.#htmlMainPicker = createElement('div', {
            parent: this.#shadowRoot,
            id: 'main-picker',
            child: this.#htmlMainSelector = createElement('div', {
                id: 'main-selector',
                class: 'selector',
                events: {
                    mousedown: (event) => this.#handleMouseDown(event),
                },
            }),
            events: {
                mousedown: (event) => {
                    this.#updateSatLum(event.offsetX / this.#htmlMainPicker.offsetWidth, 1 - (event.offsetY / this.#htmlMainPicker.offsetHeight));
                    this.#handleMouseDown(event, this.#htmlMainSelector);
                },
            },
        });
        this.#htmlAlphaPicker = createElement('div', {
            parent: this.#shadowRoot,
            id: 'alpha-picker',
            class: 'alpha-background',
            child: this.#htmlAlphaSelector = createElement('div', {
                id: 'alpha-selector',
                class: 'selector',
                events: {
                    mousedown: (event) => this.#handleMouseDown(event),
                },
            }),
            events: {
                mousedown: (event) => {
                    this.#updateAlpha(1 - (event.offsetY / this.#htmlAlphaPicker.offsetHeight));
                    this.#handleMouseDown(event, this.#htmlAlphaSelector);
                },
            },
        });
        this.#htmlInput = createElement('input', {
            parent: this.#shadowRoot,
            id: 'input',
            events: {
                change: () => this.#updateHex(this.#htmlInput.value),
            }
        });
        this.#htmlSample = createElement('div', {
            parent: this.#shadowRoot,
            id: 'sample',
            class: 'alpha-background',
        });
        createElement('div', {
            parent: this.#shadowRoot,
            id: 'buttons',
            childs: [
                this.#htmlOk = createElement('button', {
                    parent: this.#shadowRoot,
                    i18n: '#ok',
                    events: {
                        click: () => {
                            this.#updateHex(this.#htmlInput.value);
                            this.dispatchEvent(new CustomEvent('ok', { detail: { hex: this.#color.getHex(), rgba: this.#color.getRgba() } }));
                        },
                    },
                }),
                this.#htmlCancel = createElement('button', {
                    parent: this.#shadowRoot,
                    i18n: '#cancel',
                    events: {
                        click: () => this.dispatchEvent(new CustomEvent('cancel')),
                    }
                }),
            ],
        });
    }
    #updateAlpha(alpha) {
        this.#color.alpha = alpha;
        this.#update();
        this.#colorChanged();
    }
    #updateHue(hue) {
        this.#color.setHue(hue);
        this.#update();
        this.#colorChanged();
    }
    #updateHex(hex) {
        this.#color.setHex(hex);
        this.#update();
        this.#colorChanged();
    }
    #updateSatLum(sat, lum) {
        /*const sat = event.offsetX / event.target.offsetWidth;
        const lum = 1 - event.offsetY / event.target.offsetHeight;*/
        this.#color.setSatLum(sat, lum);
        this.#update();
        this.#colorChanged();
    }
    #colorChanged() {
        this.dispatchEvent(new CustomEvent('change', { detail: { hex: this.#color.getHex(), rgba: this.#color.getRgba() } }));
    }
    connectedCallback() {
        if (this.#doOnce) {
            this.#update();
            this.#doOnce = false;
        }
    }
    adoptStyleSheet(styleSheet) {
        this.#shadowRoot.adoptedStyleSheets.push(styleSheet);
    }
    #update() {
        const red = this.#color.red * 255;
        const green = this.#color.green * 255;
        const blue = this.#color.blue * 255;
        const hsl = this.#color.getHsl();
        const hue = hsl[0];
        const sat = hsl[1];
        const lum = hsl[2];
        this.#htmlAlphaPicker.style.cssText = `--foreground-layer: linear-gradient(rgb(${red} ${green} ${blue} / 1), rgb(${red} ${green} ${blue} / 0));`;
        // Note: As of today (feb 2024) the css image() function is not yet supported by any browser. We resort to use a constant linear gradient
        this.#htmlSample.style.cssText = `--foreground-layer: linear-gradient(rgb(${red} ${green} ${blue} / ${this.#color.alpha}), rgb(${red} ${green} ${blue} / ${this.#color.alpha}));`;
        this.#htmlMainPicker.style.cssText = `color: hsl(${hue}turn 100% 50%)`;
        this.#htmlInput.value = this.#color.getHex();
        this.#htmlHueSelector.style.left = `${hue * 100}%`;
        this.#htmlAlphaSelector.style.top = `${100 - this.#color.alpha * 100}%`;
        this.#htmlMainSelector.style.left = `${sat * 100}%`;
        this.#htmlMainSelector.style.top = `${100 - lum * 100}%`;
    }
    getColor() {
        return this.#color;
    }
    setHex(hex) {
        this.#color.setHex(hex);
        this.#update();
    }
    #handleMouseDown(event, selector) {
        this.#dragElement = selector ?? event.currentTarget;
        this.#shiftX = (selector ?? event.currentTarget).offsetLeft;
        this.#shiftY = (selector ?? event.currentTarget).offsetTop;
        this.#pageX = event.pageX;
        this.#pageY = event.pageY;
        event.stopPropagation();
    }
    #handleMouseMove(event) {
        const pageX = event.pageX - this.#pageX;
        const pageY = event.pageY - this.#pageY;
        switch (this.#dragElement) {
            case this.#htmlHueSelector:
                const hue = Math.max(Math.min((pageX + this.#shiftX) / this.#htmlHuePicker.offsetWidth, 1), 0);
                this.#updateHue(hue);
                break;
            case this.#htmlMainSelector:
                const sat = Math.max(Math.min((pageX + this.#shiftX) / this.#htmlMainPicker.offsetWidth, 1), 0);
                const lum = Math.max(Math.min((pageY + this.#shiftY) / this.#htmlMainPicker.offsetHeight, 1), 0);
                this.#updateSatLum(sat, 1 - lum);
                break;
            case this.#htmlAlphaSelector:
                const alpha = Math.max(Math.min((pageY + this.#shiftY) / this.#htmlAlphaPicker.offsetHeight, 1), 0);
                this.#updateAlpha(1 - alpha);
                break;
        }
    }
}
let definedColorPicker = false;
function defineHarmonyColorPicker() {
    if (window.customElements && !definedColorPicker) {
        customElements.define('harmony-color-picker', HTMLHarmonyColorPickerElement);
        definedColorPicker = true;
        injectGlobalCss();
    }
}

var menuCSS = ":host {\n\tfont-size: 1.5em;\n\tcursor: not-allowed;\n\tcolor: var(--harmony-ui-text-primary);\n\tbackground-color: green;\n\tbackground-color: var(--harmony-ui-menu-bg-color);\n\toverflow: auto;\n\tz-index: 100000;\n}\n\n.harmony-menu-item {\n\tbackground-color: green;\n\tcursor: pointer;\n\tbackground-color: var(--harmony-ui-menu-item-bg-color);\n}\n\n.harmony-menu-item.disabled {\n\tpointer-events: none;\n}\n\n.harmony-menu-item.selected {\n\tbackground-color: blue;\n\tbackground-color: var(--harmony-ui-menu-item-selected-bg-color);\n}\n\n\n.harmony-menu-item.separator {\n\theight: 5px;\n\tbackground-color: black;\n}\n\n.harmony-menu-item>.harmony-menu-item-title:hover {\n\tbackground-color: var(--harmony-ui-menu-item-hover-bg-color);\n}\n\n.harmony-menu-item.selected>.harmony-menu-item-title::after {\n\tcontent: \"✔\";\n}\n\n.harmony-menu-item>.harmony-menu-item-title::after {\n\ttransition: all 0.2s ease 0s;\n\twidth: 32px;\n\theight: 32px;\n}\n\n.harmony-menu-item.closed>.harmony-menu-item-title,\n.harmony-menu-item.opened>.harmony-menu-item-title {\n\tpadding-right: 32px;\n}\n\n.harmony-menu-item.closed>.harmony-menu-item-title::after {\n\tcontent: \"➤\";\n}\n\n.harmony-menu-item.opened>.harmony-menu-item-title::after {\n\tcontent: \"➤\";\n\ttransform: rotate(90deg);\n}\n\n.harmony-menu-item .submenu {\n\tbackground-color: var(--harmony-ui-menu-submenu-bg-color);\n\tpadding-left: 10px;\n\tmargin-left: 2px;\n\tdisplay: none;\n\toverflow: hidden;\n\tposition: relative;\n\tbackground-color: var(--harmony-ui-menu-submenu-fg-color);\n}\n\n.harmony-menu-item.opened>.submenu {\n\tdisplay: block;\n}\n";

class HTMLHarmonyMenuElement extends HTMLElement {
    #doOnce = true;
    #subMenus = new Map();
    #shadowRoot;
    #contextual = false;
    constructor() {
        super();
        this.#shadowRoot = this.attachShadow({ mode: 'closed' });
        document.addEventListener('click', (event) => {
            if (this.#contextual && !this.contains(event.target)) {
                this.close();
            }
        });
    }
    #show(items, userData) {
        this.#setItems(items, userData);
        this.#checkSize();
    }
    show(items, userData) {
        this.#show(items, userData);
        this.setContextual(false);
    }
    showContextual(items, clientX, clientY, userData) {
        document.body.append(this);
        this.style.left = clientX + 'px';
        this.style.top = clientY + 'px';
        this.setContextual(true);
        this.#show(items, userData);
    }
    setContextual(contextual) {
        this.style.position = contextual ? 'absolute' : '';
        this.#contextual = contextual;
    }
    #checkSize() {
        const bodyRect = document.body.getBoundingClientRect();
        const elemRect = this.getBoundingClientRect();
        this.style.maxWidth = bodyRect.width + 'px';
        this.style.maxHeight = bodyRect.height + 'px';
        if (elemRect.right > bodyRect.right) {
            this.style.left = Math.max((bodyRect.width - elemRect.width), 0) + 'px';
            /*if (elemRect.width > bodyRect.width) {
                this.style.maxWidth = bodyRect.width + 'px';
            } else {
                this.style.maxWidth = '';
            }*/
        }
        if (elemRect.bottom > bodyRect.bottom) {
            this.style.top = Math.max((bodyRect.height - elemRect.height), 0) + 'px';
            /*if (elemRect.height > bodyRect.height) {
                this.style.maxHeight = bodyRect.height + 'px';
            } else {
                this.style.maxHeight = '';
            }*/
        }
        if (elemRect.left < 0) {
            this.style.left = '0px';
        }
        if (elemRect.top < 0) {
            this.style.top = '0px';
        }
    }
    close() {
        if (this.#contextual) {
            this.remove();
        }
    }
    connectedCallback() {
        if (this.#doOnce) {
            I18n.observeElement(this.#shadowRoot);
            shadowRootStyle(this.#shadowRoot, menuCSS);
            const callback = (entries, observer) => {
                entries.forEach(() => {
                    this.#checkSize();
                });
            };
            const resizeObserver = new ResizeObserver(callback);
            resizeObserver.observe(this);
            resizeObserver.observe(document.body);
            this.#doOnce = false;
        }
    }
    #setItems(items, userData) {
        this.#shadowRoot.innerHTML = '';
        if (items instanceof Array) {
            for (const item of items) {
                this.#shadowRoot.append(this.addItem(item, userData));
            }
        }
        else {
            for (const itemId in items) {
                const item = items[itemId];
                this.#shadowRoot.append(this.addItem(item, userData));
            }
        }
    }
    #openSubMenu(htmlSubMenu) {
        for (const [htmlItem, sub] of this.#subMenus) {
            if (sub == htmlSubMenu || sub.contains(htmlSubMenu)) {
                htmlItem.classList.add('opened');
                htmlItem.classList.remove('closed');
            }
            else {
                htmlItem.classList.remove('opened');
                htmlItem.classList.add('closed');
            }
        }
        this.#checkSize();
    }
    addItem(item, userData) {
        const htmlItem = createElement('div', {
            class: 'harmony-menu-item',
        });
        if (!item) {
            htmlItem.classList.add('separator');
        }
        else {
            const htmlItemTitle = createElement('div', {
                class: 'harmony-menu-item-title',
            });
            if (item.i18n) {
                htmlItemTitle.classList.add('i18n');
                htmlItemTitle.setAttribute('data-i18n', item.i18n);
                htmlItemTitle.innerHTML = item.i18n;
            }
            else {
                htmlItemTitle.innerText = item.name ?? '';
            }
            htmlItem.append(htmlItemTitle);
            if (item.selected) {
                htmlItem.classList.add('selected');
            }
            if (item.disabled) {
                htmlItem.classList.add('disabled');
            }
            if (item.submenu) {
                const htmlSubMenu = createElement('div', {
                    class: 'submenu',
                });
                this.#subMenus.set(htmlItem, htmlSubMenu);
                let subItems = 0;
                if (item.submenu instanceof Array) {
                    for (const subItem of item.submenu) {
                        htmlSubMenu.append(this.addItem(subItem, userData));
                        ++subItems;
                    }
                }
                else {
                    for (const subItemName in item.submenu) {
                        const subItem = item.submenu[subItemName];
                        htmlSubMenu.append(this.addItem(subItem, userData));
                        ++subItems;
                    }
                }
                htmlItem.append(htmlSubMenu);
                //htmlSubMenu.style.display = 'none';
                htmlItem.classList.add('closed');
                if (item.opened) {
                    this.#openSubMenu(htmlSubMenu);
                }
                htmlItem.addEventListener('click', event => {
                    this.#openSubMenu(htmlSubMenu);
                    if (item.cmd) {
                        this.dispatchEvent(new CustomEvent(item.cmd));
                    }
                    if (item.f) {
                        item.f(userData);
                    }
                    event.stopPropagation();
                });
                if (subItems == 0) {
                    hide(htmlItem);
                }
            }
            else {
                htmlItem.addEventListener('click', (event) => {
                    if (item.cmd) {
                        this.dispatchEvent(new CustomEvent(item.cmd));
                    }
                    if (item.f) {
                        item.f(userData);
                    }
                    event.stopPropagation();
                });
                htmlItem.addEventListener('click', () => this.close());
            }
        }
        return htmlItem;
    }
}
let definedMenu = false;
function defineHarmonyMenu() {
    if (window.customElements && !definedMenu) {
        customElements.define('harmony-menu', HTMLHarmonyMenuElement);
        definedMenu = true;
        injectGlobalCss();
    }
}

var copyCSS = "harmony-copy {\n\tcursor: pointer;\n\tposition: relative;\n}\n\n.harmony-copy-copied {\n\ttransition: top 1s;\n\tposition: absolute;\n\ttop: 0%;\n}\n\n.harmony-copy-copied-end {\n\ttop: -100%;\n}\n";

class HTMLHarmonyCopyElement extends HTMLElement {
    #doOnce = true;
    #htmlCopied;
    constructor() {
        super();
        this.#htmlCopied = createElement('div', { class: 'harmony-copy-copied' });
        this.addEventListener('click', () => this.#copy());
    }
    connectedCallback() {
        if (this.#doOnce) {
            this.#doOnce = false;
            this.append(this.#htmlCopied);
            hide(this.#htmlCopied);
        }
    }
    async #copy() {
        try {
            const text = this.innerText;
            this.#htmlCopied.innerText = text;
            show(this.#htmlCopied);
            await navigator.clipboard.writeText(text);
            this.#htmlCopied.classList.add('harmony-copy-copied-end');
            setTimeout(() => { this.#htmlCopied.classList.remove('harmony-copy-copied-end'); hide(this.#htmlCopied); }, 1000);
        }
        catch (e) {
            console.log(e);
        }
    }
}
let definedCopy = false;
function defineHarmonyCopy() {
    if (window.customElements && !definedCopy) {
        customElements.define('harmony-copy', HTMLHarmonyCopyElement);
        documentStyle(copyCSS);
        definedCopy = true;
        injectGlobalCss();
    }
}

var fileInputCSS = "label {\n\tcursor: pointer;\n\theight: 100%;\n\tdisplay: flex;\n\tuser-select: none;\n}\n\nlabel>span {\n\tmargin: auto;\n}\n\n.tooltip {\n\tposition: relative;\n}\n\n.text {\n\tflex: 1;\n\tfont-size: 2rem;\n}\n\n.icon,\n.info {\n\tzoom: 2;\n}\n";

var tooltipCSS = ":host {\n\tdisplay: grid;\n\tposition: absolute;\n\twidth: 100%;\n\theight: 100%;\n\ttop: 0;\n\tanchor-name: --anchor-el;\n}\n\n:host(:hover) {\n\t--harmony-tooltip-hover: 1;\n}\n\n.tooltip {\n\t--bottom-tip: conic-gradient(from -30deg at bottom, rgba(0, 0, 0, 0), #000 1deg 60deg, rgba(0, 0, 0, 0) 61deg) bottom / 100% 50% no-repeat;\n\t--top-tip: conic-gradient(from 150deg at top, rgba(0, 0, 0, 0), #000 1deg 60deg, rgba(0, 0, 0, 0) 61deg) top / 100% 50% no-repeat;\n\t--right-tip: conic-gradient(from -120deg at right, rgba(0, 0, 0, 0), #000 1deg 60deg, rgba(0, 0, 0, 0) 61deg) right / 50% 100% no-repeat;\n\t--left-tip: conic-gradient(from 60deg at left, rgba(0, 0, 0, 0), #000 1deg 60deg, rgba(0, 0, 0, 0) 61deg) left / 50% 100% no-repeat;\n\n\t--p-inline: 1.5ch;\n\t--p-block: .75ch;\n\t--triangle-size: 0.5rem;\n\t--bg: hsl(0 0% 20%);\n\n\n\n\tpointer-events: none;\n\tuser-select: none;\n\topacity: var(--harmony-tooltip-hover, 0);\n\tposition: fixed;\n\tposition-anchor: --anchor-el;\n\t/*top: anchor(bottom);*/\n\t/*justify-self: anchor-center;*/\n\tjustify-self: var(--justify);\n\tbottom: var(--bottom);\n\tleft: var(--left);\n\tright: var(--right);\n\ttop: var(--top);\n\n\tmax-width: 10rem;\n\tbackground-color: var(--bg);\n\tcolor: #fff;\n\ttext-align: center;\n\tborder-radius: 6px;\n\tpadding: 0.3rem 0.3rem;\n\tz-index: 1;\n\ttransition: opacity 0.3s;\n}\n\n.tooltip::after {\n\tcontent: \"\";\n\tbackground: var(--bg);\n\tposition: absolute;\n\tz-index: -1;\n\tinset: 0;\n\tmask: var(--tip);\n\tinset-block-start: var(--inset-block-start-tip, 0);\n\tinset-block-end: var(--inset-block-end-tip, 0);\n\tborder-block-start: var(--border-block-start-tip, 0);\n\tborder-block-end: var(--border-block-end-tip, 0);\n\tinset-inline-start: var(--inset-inline-start-tip, 0);\n\tinset-inline-end: var(--inset-inline-end-tip, 0);\n\tborder-inline-start: var(--border-inline-start-tip, 0);\n\tborder-inline-end: var(--border-inline-end-tip, 0);\n}\n\n.tooltip:is([data-position=\"top\"], :not([data-position])) {\n\t--bottom: anchor(top);\n\t--justify: anchor-center;\n\t--tip: var(--bottom-tip);\n\t--inset-block-end-tip: calc(var(--triangle-size) * -1);\n\t--border-block-end-tip: var(--triangle-size) solid transparent;\n}\n\n.tooltip[data-position=\"left\"] {\n\t--right: anchor(left);\n\t--tip: var(--right-tip);\n\t--inset-inline-end-tip: calc(var(--triangle-size) * -1);\n\t--border-inline-end-tip: var(--triangle-size) solid transparent;\n}\n\n.tooltip[data-position=\"right\"] {\n\t--left: anchor(right);\n\t--tip: var(--left-tip);\n\t--inset-inline-start-tip: calc(var(--triangle-size) * -1);\n\t--border-inline-start-tip: var(--triangle-size) solid transparent;\n}\n\n.tooltip[data-position=\"bottom\"] {\n\t--top: anchor(bottom);\n\t--justify: anchor-center;\n\t--tip: var(--top-tip);\n\t--inset-block-start-tip: calc(var(--triangle-size) * -1);\n\t--border-block-start-tip: var(--triangle-size) solid transparent;\n}\n";

class HTMLHarmonyTooltipElement extends HTMLElement {
    #shadowRoot;
    #htmlText;
    constructor() {
        super();
        this.#shadowRoot = this.attachShadow({ mode: 'closed' });
        shadowRootStyle(this.#shadowRoot, tooltipCSS);
        I18n.observeElement(this.#shadowRoot);
        this.#htmlText = createElement('div', {
            class: 'tooltip',
            parent: this.#shadowRoot,
        });
    }
    attributeChangedCallback(name, oldValue, newValue) {
        switch (name) {
            case 'data-label':
                this.#htmlText.innerHTML = newValue;
                this.#htmlText.classList.remove('i18n');
                break;
            case 'data-i18n':
                this.#htmlText.setAttribute('data-i18n', newValue);
                this.#htmlText.innerHTML = newValue;
                this.#htmlText.classList.add('i18n');
                break;
            case 'data-position':
                this.#htmlText.setAttribute('data-position', newValue);
                break;
        }
    }
    static get observedAttributes() {
        return ['data-label', 'data-i18n', 'data-position'];
    }
}
let definedTooltip = false;
function defineHarmonyTooltip() {
    if (window.customElements && !definedTooltip) {
        customElements.define('harmony-tooltip', HTMLHarmonyTooltipElement);
        definedTooltip = true;
        injectGlobalCss();
    }
}

class HTMLHarmonyFileInputElement extends HTMLElement {
    #shadowRoot;
    #htmlText;
    #htmlInput;
    #htmlHelp;
    #htmlTooltip;
    constructor() {
        super();
        this.#shadowRoot = this.attachShadow({ mode: 'closed' });
        shadowRootStyle(this.#shadowRoot, fileInputCSS);
        I18n.observeElement(this.#shadowRoot);
        defineHarmonyTooltip();
        createElement('label', {
            parent: this.#shadowRoot,
            childs: [
                createElement('span', {
                    class: 'icon',
                    innerHTML: folderOpenSVG,
                }),
                this.#htmlText = createElement('span', {
                    class: 'text',
                }),
                this.#htmlHelp = createElement('span', {
                    class: 'tooltip',
                    hidden: true,
                    childs: [
                        createElement('span', {
                            class: 'info',
                            innerHTML: infoSVG,
                        }),
                        this.#htmlTooltip = createElement('harmony-tooltip', {
                            i18n: '',
                            'data-position': 'bottom',
                        }),
                    ]
                }),
                this.#htmlInput = createElement('input', {
                    type: 'file',
                    hidden: true,
                    events: {
                        change: (event) => this.dispatchEvent(cloneEvent(event)),
                    }
                }),
            ],
        });
    }
    get files() {
        return this.#htmlInput.files;
    }
    set accept(accept) {
        this.#htmlInput.accept = accept;
    }
    get accept() {
        return this.#htmlInput.accept;
    }
    adoptStyleSheet(styleSheet) {
        this.#shadowRoot.adoptedStyleSheets.push(styleSheet);
    }
    attributeChangedCallback(name, oldValue, newValue) {
        switch (name) {
            case 'data-label':
                this.#htmlText.innerHTML = newValue;
                this.#htmlText.classList.remove('i18n');
                break;
            case 'data-i18n':
                this.#htmlText.setAttribute('data-i18n', newValue);
                this.#htmlText.innerHTML = newValue;
                this.#htmlText.classList.add('i18n');
                break;
            case 'data-tooltip-i18n':
                if (newValue == '') {
                    hide(this.#htmlHelp);
                }
                else {
                    show(this.#htmlHelp);
                    this.#htmlTooltip.setAttribute('data-i18n', newValue);
                }
                break;
            case 'data-accept':
                this.accept = newValue;
                break;
        }
    }
    static get observedAttributes() {
        return ['data-label', 'data-i18n', 'data-accept', 'data-tooltip-i18n'];
    }
}
let definedFileInput = false;
function defineHarmonyFileInput() {
    if (window.customElements && !definedFileInput) {
        customElements.define('harmony-file-input', HTMLHarmonyFileInputElement);
        definedFileInput = true;
        injectGlobalCss();
    }
}

var labelPropertyCSS = ":host {\n\tdisplay: flex;\n\tgap: var(--harmony-label-property-gap, 0.5);\n}\n";

class HTMLHarmonyLabelPropertyElement extends HTMLElement {
    #doOnce = false;
    #htmlLabel;
    #htmlProperty;
    #shadowRoot;
    constructor() {
        super();
        this.#shadowRoot = this.attachShadow({ mode: 'closed' });
        shadowRootStyle(this.#shadowRoot, labelPropertyCSS);
        this.#htmlLabel = createElement('label', { i18n: '', parent: this.#shadowRoot });
        this.#htmlProperty = createElement('span', { parent: this.#shadowRoot });
    }
    set label(label) {
        this.#htmlLabel.setAttribute('data-i18n', label);
    }
    set property(property) {
        this.#htmlProperty.innerHTML = property;
    }
    connectedCallback() {
        if (!this.#doOnce) {
            this.#doOnce = true;
            this.append(this.#htmlLabel, this.#htmlProperty);
        }
    }
}
let definedLabelProperty = false;
function defineHarmonyLabelProperty() {
    if (window.customElements && !definedLabelProperty) {
        customElements.define('harmony-label-property', HTMLHarmonyLabelPropertyElement);
        definedLabelProperty = true;
        injectGlobalCss();
    }
}

var paletteCSS = ":host {\r\n\t--harmony-palette-shadow-color-size: var(--harmony-palette-color-size, 2rem);\r\n\t--harmony-palette-shadow-gap: var(--harmony-palette-gap, 0.5rem);\r\n\t--harmony-palette-shadow-border-color: var(--harmony-palette-border-color, grey);\r\n\t--harmony-palette-shadow-selected-border-color: var(--harmony-palette-selected-border-color, orange);\r\n\tdisplay: flex;\r\n\tflex-direction: row;\r\n\tflex-wrap: wrap;\r\n\tgap: var(--harmony-palette-shadow-gap);\r\n}\r\n\r\n.color {\r\n\theight: var(--harmony-palette-shadow-color-size);\r\n\twidth: var(--harmony-palette-shadow-color-size);\r\n\tborder-radius: calc(var(--harmony-palette-shadow-color-size) * .1);\r\n\tborder: calc(var(--harmony-palette-shadow-color-size) * .1) solid var(--harmony-palette-shadow-border-color);\r\n\tpadding: calc(var(--harmony-palette-shadow-color-size) * .1);\r\n\tcursor: pointer;\r\n}\r\n\r\n.color.selected {\r\n\tborder-color: var(--harmony-palette-shadow-selected-border-color);\r\n\tborder-width: calc(var(--harmony-palette-shadow-color-size) * .2);\r\n\tpadding: 0;\r\n\tcolor: black;\r\n}\r\n\r\n.color>svg {\r\n\theight: 100%;\r\n\twidth: 100%;\r\n}\r\n";

function clampColor(val) {
    return Math.min(Math.max(0, val), 1);
}
class HTMLHarmonyPaletteElement extends HTMLElement {
    #initialized = false;
    #multiple = false;
    #colors = new Map();
    #selected = new Map();
    #colorElements = new Map();
    #preSelected = new Set();
    #shadowRoot;
    constructor() {
        super();
        this.#shadowRoot = this.attachShadow({ mode: 'closed' });
    }
    connectedCallback() {
        if (!this.#initialized) {
            I18n.observeElement(this.#shadowRoot);
            shadowRootStyle(this.#shadowRoot, paletteCSS);
            this.#initialized = true;
            this.#processChilds();
        }
    }
    adoptStyleSheet(styleSheet) {
        this.#shadowRoot.adoptedStyleSheets.push(styleSheet);
    }
    #processChilds() {
        //This is a 2 steps process cause we may change DOM
        const children = this.children;
        const list = [];
        for (const child of children) {
            list.push(child);
        }
        list.forEach(element => {
            const c = this.#addColor(element.innerText);
            element.remove();
            if (c && element.hasAttribute('selected')) {
                this.#preSelected.add(c.h);
            }
        });
        this.#refreshHTML();
    }
    #refreshHTML() {
        if (!this.#initialized) {
            return;
        }
        this.innerText = '';
        this.#colorElements.clear();
        for (const [colorHex, color] of this.#colors) {
            const element = createElement('div', {
                parent: this.#shadowRoot,
                class: 'color',
                'data-color': colorHex,
                style: `background-color: ${colorHex}`,
                events: {
                    click: (event) => this.#selectColor(colorHex, event.target),
                }
            });
            this.#colorElements.set(colorHex, element);
            if (this.#preSelected.has(colorHex)) {
                this.#selectColor(colorHex, element);
            }
        }
        this.#preSelected.clear();
    }
    #selectColor(hex, element, selected = false) {
        const s = this.#selected.get(hex);
        if (s && selected !== true) {
            if (this.#multiple) {
                this.#setSelected(s, false);
                this.#dispatchSelect(hex, false);
                this.#selected.delete(hex);
            }
        }
        else {
            if (!this.#multiple) {
                for (const [h, e] of this.#selected) {
                    this.#setSelected(e, false);
                    this.#dispatchSelect(h, false);
                    this.#selected.delete(h);
                }
            }
            this.#dispatchSelect(hex, true);
            if (element) {
                this.#selected.set(hex, element);
                this.#setSelected(element, true);
            }
        }
    }
    #setSelected(element, selected) {
        if (!element) {
            return;
        }
        if (selected) {
            element.classList.add('selected');
            element.innerHTML = checkOutlineSVG;
        }
        else {
            element.classList.remove('selected');
            element.innerText = '';
        }
    }
    #dispatchSelect(hex, selected) {
        this.dispatchEvent(new CustomEvent(selected ? 'select' : 'unselect', { detail: { hex: hex } }));
    }
    clearColors() {
        this.#colors.clear();
        this.#refreshHTML();
    }
    addColor(color, tooltip) {
        const c = this.#addColor(color, tooltip);
        this.#refreshHTML();
        return c;
    }
    selectColor(color, selected = true) {
        const c = this.#getColorAsRGB(color);
        this.#selectColor(c.h, this.#colorElements.get(c.h), selected);
    }
    toggleColor(color) {
        const c = this.#getColorAsRGB(color);
        this.#selectColor(c.h, this.#colorElements.get(c.h));
    }
    #addColor(color, tooltip) {
        const c = this.#getColorAsRGB(color);
        if (!c) {
            return;
        }
        /*
        c.selected = false;
        c.tooltip = tooltip;
        */
        this.#colors.set(c.h, c);
        return c;
    }
    #getColorAsRGB(color) {
        let r = 0, g = 0, b = 0;
        switch (true) {
            case typeof color == 'string':
                const c = parseInt('0x' + color.replace('#', ''), 16);
                r = ((c >> 16) & 0xFF) / 255;
                g = ((c >> 8) & 0xFF) / 255;
                b = (c & 0xFF) / 255;
                break;
            case Array.isArray(color):
                r = clampColor(color[0]);
                g = clampColor(color[1]);
                b = clampColor(color[2]);
                break;
        }
        return { r: r, g: g, b: b, h: '#' + Number((r * 255 << 16) + (g * 255 << 8) + (b * 255)).toString(16).padStart(6, '0') };
    }
    attributeChangedCallback(name, oldValue, newValue) {
        switch (name) {
            case 'multiple':
                this.#multiple = toBool(newValue);
                break;
        }
    }
    static get observedAttributes() {
        return ['multiple'];
    }
}
let definedPalette = false;
function defineHarmonyPalette() {
    if (window.customElements && !definedPalette) {
        customElements.define('harmony-palette', HTMLHarmonyPaletteElement);
        definedPalette = true;
        injectGlobalCss();
    }
}

var panelCSS = ":host {\n\tdisplay: flex;\n\tflex: 1;\n\tflex-direction: column;\n\n\tflex: 0 0 auto;\n\t/*flex-grow: 0;\n\tflex-shrink: 0;\n\tflex-basis: auto;*/\n\t/*flex-basis: 0;*/\n\t/*flex: 1;*/\n\t/*height:100%;\n\twidth:100%;*/\n\n\t/*padding: 5px !important;*/\n\tbox-sizing: border-box;\n\tpointer-events: all;\n\toverflow: hidden;\n\tposition: relative;\n\tflex-direction: column;\n\tbox-sizing: border-box;\n}\n\n.harmony-panel-row {\n\tflex-direction: row;\n}\n\n.harmony-panel-row>harmony-panel {\n\theight: 100%;\n}\n\n.harmony-panel-column {\n\tflex-direction: column;\n}\n\n.harmony-panel-column>harmony-panel {\n\twidth: 100%;\n}\n\n.harmony-panel-splitter {\n\tdisplay: none;\n\tflex: 0 0 10px;\n\tbackground-color: red;\n}\n\n.title {\n\tcursor: pointer;\n\ttext-align: center;\n\tfont-size: 1.5em;\n\tpadding: 4px;\n\toverflow: hidden;\n}\n\n.content {\n\twidth: 100%;\n\tbox-sizing: border-box;\n}\n\n[collapsible='1']>.title::after {\n\tcontent: \"-\";\n\tright: 5px;\n\tposition: absolute;\n}\n\n[collapsed='1']>.title::after {\n\tcontent: \"+\";\n}\n";

let nextId = 0;
//let spliter: HTMLElement = createElement('div', { class: 'harmony-panel-splitter' }) as HTMLElement;
let highlitPanel;
class HTMLHarmonyPanelElement extends HTMLElement {
    #doOnce = true;
    #parent = null;
    #panels = new Set();
    #size = 1;
    #direction = 'undefined';
    #isContainer = false;
    #isMovable = false;
    #isCollapsible = false;
    #isCollapsed = false;
    customPanelId = nextId++;
    htmlTitle;
    htmlContent;
    #isDummy = false;
    #shadowRoot;
    constructor() {
        super();
        this.#shadowRoot = this.attachShadow({ mode: 'closed' });
        shadowRootStyle(this.#shadowRoot, panelCSS);
        //this.addEventListener('dragstart', event => this._handleDragStart(event));
        //this.addEventListener('dragover', event => this._handleDragOver(event));
        //this.addEventListener('drop', event => this._handleDrop(event));
        //this.addEventListener('mouseenter', event => this._handleMouseEnter(event));
        //this.addEventListener('mousemove', event => this._handleMouseMove(event));
        //this.addEventListener('mouseleave', event => this._handleMouseLeave(event));
        this.htmlTitle = createElement('div', {
            class: 'title',
            parent: this.#shadowRoot,
            events: {
                click: () => this.#toggleCollapse(),
            }
        });
        this.htmlContent = createElement('div', {
            class: 'content',
            parent: this.#shadowRoot,
        });
    }
    connectedCallback() {
        if (this.#doOnce) {
            //this.append(...this.childNodes);
            this.#doOnce = false;
        }
        super.append(this.htmlTitle);
        super.append(this.htmlContent);
        //let parentElement = this.parentElement;
        /*if (this._parent && (this._parent != parentElement)) {
            this._parent._removePanel(this);
        }

        if (parentElement && parentElement.tagName == 'HARMONY-PANEL') {
            parentElement._addPanel(this);
            this._parent = parentElement;
        }*/
        /*if (!this._firstTime) {
            this._firstTime = true;
            //this.style.backgroundColor = `rgb(${255*Math.random()},${255*Math.random()},${255*Math.random()})`;
            //this.append(this.CustomPanelId);
            this.title = this.CustomPanelId;
            this.direction = this._direction;
            //this.size = this._size;
            //this.draggable = true;
        }*/
    }
    append() {
        this.htmlContent.append(...arguments);
    }
    prepend() {
        this.htmlContent.prepend(...arguments);
    }
    /*
        appendChild(child: HTMLElement) {
            this.htmlContent.appendChild(child);
        }
    */
    get innerHTML() {
        return this.htmlContent.innerHTML;
    }
    set innerHTML(innerHTML) {
        this.htmlContent.innerHTML = innerHTML;
    }
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue == newValue) {
            return;
        }
        if (name == 'panel-direction') {
            this.#direction = newValue;
        }
        else if (name == 'panel-size') {
            this.size = Number(newValue);
        }
        else if (name == 'is-container') {
            this.isContainer = toBool(newValue);
        }
        else if (name == 'is-movable') {
            this.isMovable = toBool(newValue);
        }
        else if (name == 'collapsible') {
            this.collapsible = toBool(newValue);
        }
        else if (name == 'collapsed') {
            this.collapsed = toBool(newValue);
        }
        else if (name == 'title') {
            this.title = newValue;
        }
        else if (name == 'title-i18n') {
            this.titleI18n = newValue;
        }
    }
    static get observedAttributes() {
        return ['panel-direction', 'panel-size', 'is-container', 'is-movable', 'title', 'title-i18n', 'collapsible', 'collapsed'];
    }
    /*
        _handleDragStart(event) {
            if (this._isMovable == false) {
                event.preventDefault();
                return;
            }
            event.stopPropagation();
            event.dataTransfer.setData('text/plain', null);
            dragged = event.target;
        }

        _handleDragOver(event) {
            if (this._isContainer != false) {
                event.preventDefault();
            }
            event.stopPropagation();
        }

        _handleDrop(event) {
            if (this._isContainer != false) {
                event.stopPropagation();
                event.preventDefault();
                if (dragged) {
                    if (this != dragged) {
                        this._addChild(dragged, event.offsetX, event.offsetY);
                        //OptionsManager.setItem('app.layout.disposition', HTMLHarmonyPanelElement.saveDisposition());
                    }
                }
            }
            dragged = null;
        }

        _handleMouseEnter(event) {
            //console.error(this, event);
            //clearInterval(HTMLHarmonyPanelElement._interval);
            //HTMLHarmonyPanelElement._interval = setInterval(event => this.style.opacity = (Math.floor(new Date().getTime() / 500) % 2) / 2 + 0.5, 100);
            //event.stopPropagation();
        }

        _handleMouseMove(event) {
            const delta = 5;
            //console.error(event.offsetX, event.offsetY);
            //this.style.opacity = (Math.floor(new Date().getTime() / 1000) % 2);
            //HTMLHarmonyPanelElement.highlitPanel = this;
            event.stopPropagation();
            if (event.offsetX < delta || event.offsetY < delta) {
                HTMLHarmonyPanelElement.highlitPanel = this;
                this.parentNode.insertBefore(HTMLHarmonyPanelElement._spliter, this);
            } else if ((this.offsetWidth - event.offsetX) < delta || (this.offsetHeight - event.offsetY) < delta) {
                HTMLHarmonyPanelElement.highlitPanel = this;
                this.parentNode.insertBefore(HTMLHarmonyPanelElement._spliter, this.nextSibling);
            } else {
                HTMLHarmonyPanelElement.highlitPanel = null;
            }

        }

        _handleMouseLeave(event) {
            //console.error(this, event);
            //clearInterval(HTMLHarmonyPanelElement._interval);
        }
            */
    static set highlitPanel(panel) {
        if (highlitPanel) {
            highlitPanel.style.filter = '';
        }
        highlitPanel = panel;
        if (highlitPanel) {
            highlitPanel.style.filter = 'grayscale(80%)'; ///'contrast(200%)';
        }
    }
    /*
        _addChild(child, x, y) {
            let percent = 0.2;
            let percent2 = 0.8;
            let height = this.clientHeight;
            let width = this.clientWidth;

            if (this._direction == undefined) {
                if (x <= width * percent) {
                    this.prepend(dragged);
                    this.direction = 'row';
                }
                if (x >= width * percent2) {
                    this.append(dragged);
                    this.direction = 'row';
                }
                if (y <= height * percent) {
                    this.prepend(dragged);
                    this.direction = 'column';
                }
                if (y >= height * percent2) {
                    this.append(dragged);
                    this.direction = 'column';
                }
            } else if (this._direction == 'row') {
                if (x <= width * percent) {
                    this.prepend(dragged);
                }
                if (x >= width * percent2) {
                    this.append(dragged);
                }
                if (y <= height * percent) {
                    this._split(dragged, true, 'column');
                }
                if (y >= height * percent2) {
                    this._split(dragged, false, 'column');
                }
            } else if (this._direction == 'column') {
                if (x <= width * percent) {
                    this._split(dragged, true, 'row');
                }
                if (x >= width * percent2) {
                    this._split(dragged, false, 'row');
                }
                if (y <= height * percent) {
                    this.prepend(dragged);
                }
                if (y >= height * percent2) {
                    this.append(dragged);
                }
            }
        }*/
    /*
        _split(newNode, before, direction) {
            let panel = HTMLHarmonyPanelElement._createDummy();//document.createElement('harmony-panel');
            /*panel.id = HTMLHarmonyPanelElement.nextId;
            panel._isDummy = true;
            panel.classList.add('dummy');* /
            panel.size = this.size;
            this.style.flex = this.style.flex;
            this.after(panel);
            if (before) {
                panel.append(newNode);
                panel.append(this);
            } else {
                panel.append(this);
                panel.append(newNode);
            }
            panel.direction = direction;
        }
    */
    /*
        static _createDummy() {
            let dummy = document.createElement('harmony-panel');
            dummy.id = HTMLHarmonyPanelElement.#nextId;
            dummy._isDummy = true;
            dummy.classList.add('dummy');
            return dummy;
        }
    */
    /*
        _addPanel(panel) {
            this._panels.add(panel);
        }

        _removePanel(panel) {
            this._panels.delete(panel);
            if (this._isDummy) {
                if (this._panels.size == 0) {
                    this.remove();
                } else if (this._panels.size == 1) {
                    this.after(this._panels.values().next().value);
                    this.remove();
                }
            }
        }
    */
    /*
        set active(active) {
            if (this._active != active) {
                this.dispatchEvent(new CustomEvent('activated'));
            }
            this._active = active;
            this.style.display = active ? '' : 'none';
            if (active) {
                this._header.classList.add('activated');
            } else {
                this._header.classList.remove('activated');
            }
        }
        */
    /*
        _click() {
            this.active = true;
            if (this._group) {
                this._group.active = this;
            }
        }
    */
    set direction(direction) {
        this.#direction = direction;
        this.classList.remove('harmony-panel-row');
        this.classList.remove('harmony-panel-column');
        if (direction == 'row') {
            this.classList.add('harmony-panel-row');
        }
        else if (direction == 'column') {
            this.classList.add('harmony-panel-column');
        }
    }
    get direction() {
        return this.#direction;
    }
    set size(size) {
        /*if (size === undefined) {
            return;
        }*/
        this.#size = size;
        //this.style.flexBasis = size;
        this.style.flex = String(size);
    }
    get size() {
        return this.#size;
    }
    set isContainer(isContainer) {
        this.#isContainer = isContainer;
    }
    set isMovable(isMovable) {
        this.#isMovable = isMovable;
    }
    set collapsible(collapsible) {
        this.#isCollapsible = collapsible;
        this.setAttribute('collapsible', String(this.#isCollapsible ? 1 : 0));
    }
    set collapsed(collapsed) {
        this.#isCollapsed = (collapsed == true) ? this.#isCollapsible : false;
        this.setAttribute('collapsed', String(this.#isCollapsed ? 1 : 0));
        if (this.#isCollapsed) {
            this.htmlContent.style.display = 'none';
        }
        else {
            this.htmlContent.style.display = '';
        }
    }
    set title(title) {
        if (title) {
            this.htmlTitle = this.htmlTitle ?? document.createElement('div');
            this.htmlTitle.innerHTML = title;
            super.prepend(this.htmlTitle);
        }
        else {
            this.htmlTitle.remove();
        }
    }
    set titleI18n(titleI18n) {
        this.htmlTitle.classList.add('i18n');
        this.htmlTitle.setAttribute('data-i18n', titleI18n);
        this.htmlTitle.remove();
        this.title = titleI18n;
    }
    #toggleCollapse() {
        this.collapsed = !this.#isCollapsed;
    }
    static get nextId() {
        return `harmony-panel-dummy-${++nextId}`;
    }
    static saveDisposition() {
        const list = document.getElementsByTagName('harmony-panel');
        const json = { panels: {}, dummies: [] };
        for (const panel of list) {
            if (panel.id && panel.parentElement && panel.parentElement.id && panel.parentElement.tagName == 'HARMONY-PANEL') {
                json.panels[panel.id] = { parent: panel.parentElement.id, size: panel.size, direction: panel.direction };
                if (panel.#isDummy) {
                    json.dummies.push(panel.id);
                }
            }
        }
        return json;
    }
    static restoreDisposition(json) {
        return;
        /*
        if (!json || !json.dummies || !json.panels) { return; }

        let dummiesList = new Map();
        for (let oldDummy of json.dummies) {
            let newDummy = HTMLHarmonyPanelElement._createDummy();
            document.body.append(newDummy);
            dummiesList.set(oldDummy, newDummy.id);
        }

        let list = document.getElementsByTagName('harmony-panel');
        for (let panel of list) {
            if (panel.id) {
                let p = json.panels[panel.id];
                if (p) {
                    if (p.size != 1 || panel._isDummy) {
                        panel.size = p.size;
                    }
                    panel.direction = p.direction;
                    let newParentId = dummiesList.get(p.parent) || p.parent;
                    if (p && newParentId) {
                        let parent = document.getElementById(newParentId);
                        /*if (!parent && p.dummy) {
                            parent = document.createElement('harmony-panel');
                        }* /
                        if (parent) {
                            parent.append(panel);
                        } else {
                            console.error('no parent', panel, newParentId);
                        }
                    }
                }
            }
        }*/
    }
}
let definedPanel = false;
function defineHarmonyPanel() {
    if (window.customElements && !definedPanel) {
        customElements.define('harmony-panel', HTMLHarmonyPanelElement);
        definedPanel = true;
        injectGlobalCss();
    }
}

var circularProgressCSS = ":host {\n\t--track-color: var(--harmony-circular-progress-track-color, #CCC);\n\t--progress-color: var(--harmony-circular-progress-progress-color, #F00);\n\tdisplay: inline-flex;\n}\n\n.track {\n\tcolor: var(--track-color);\n\topacity: 30%;\n\tstroke-width: 10%;\n}\n\n.progress {\n\tcolor: var(--progress-color);\n\tstroke-dasharray: calc(var(--progress) * pi * 100% * 0.8) calc((1 - var(--progress)) * pi * 100% * 0.8);\n\tstroke-width: 10%;\n\tstroke-dashoffset: calc(pi * 100% * 0.8 * 0.25);\n}\n";

class HTMLHarmonyElement extends HTMLElement {
    initialized = false;
    initElement() {
        if (this.initialized) {
            return;
        }
        this.initialized = true;
        this.createElement();
    }
    createElement() {
    }
    connectedCallback() {
        this.initElement();
    }
    attributeChangedCallback(name, oldValue, newValue) {
        this.initElement();
        this.onAttributeChanged(name, oldValue, newValue);
    }
    onAttributeChanged(name, oldValue, newValue) {
    }
    static get observedAttributes() {
        return ['label'];
    }
}

class HTMLHarmonyCircularProgressElement extends HTMLHarmonyElement {
    #shadowRoot;
    #disabled = false;
    #htmlLabel;
    #htmlSVG;
    #htmlTrack;
    #htmlProgress;
    #start = 0;
    #end = Math.PI * 2;
    #progress = 0.5;
    createElement() {
        this.#shadowRoot = this.attachShadow({ mode: 'closed' });
        shadowRootStyle(this.#shadowRoot, circularProgressCSS);
        I18n.observeElement(this.#shadowRoot);
        this.#htmlLabel = createElement('div', {
            parent: this.#shadowRoot,
            class: 'label',
        });
        this.#htmlSVG = createElementNS('http://www.w3.org/2000/svg', 'svg', {
            style: `--progress:${this.#progress};`,
            parent: this.#shadowRoot,
            childs: [
                this.#htmlTrack = createElementNS('http://www.w3.org/2000/svg', 'circle', {
                    class: 'track',
                    attributes: {
                        cx: '50%',
                        cy: '50%',
                        r: '40%',
                        fill: 'none',
                        'stroke-width': '10%',
                        'shape-rendering': 'geometricPrecision',
                        stroke: 'currentColor',
                    }
                }),
                this.#htmlProgress = createElementNS('http://www.w3.org/2000/svg', 'circle', {
                    class: 'progress',
                    attributes: {
                        cx: '50%',
                        cy: '50%',
                        r: '40%',
                        fill: 'none',
                        'stroke-width': '10%',
                        'shape-rendering': 'geometricPrecision',
                        stroke: 'currentColor',
                    }
                }),
            ],
        });
        this.#refresh();
    }
    setProgress(progress) {
        this.#progress = progress;
        if (this.#htmlSVG) {
            this.#htmlSVG.style.cssText = `--progress: ${progress}`;
        }
    }
    #refresh() {
        if (this.#htmlSVG) {
            this.#htmlSVG.style.cssText = `--progress: ${this.#progress}`;
        }
    }
    onAttributeChanged(name, oldValue, newValue) {
        switch (name) {
            case 'data-label':
                if (this.#htmlLabel) {
                    this.#htmlLabel.innerHTML = newValue;
                }
                this.#htmlLabel?.classList.remove('i18n');
                break;
            case 'data-i18n':
                this.#htmlLabel?.setAttribute('data-i18n', newValue);
                if (this.#htmlLabel) {
                    this.#htmlLabel.innerHTML = newValue;
                }
                this.#htmlLabel?.classList.add('i18n');
                break;
        }
    }
    static get observedAttributes() {
        return ['data-label', 'data-i18n'];
    }
}
let definedCircularProgress = false;
function defineHarmonyCircularProgress() {
    if (window.customElements && !definedCircularProgress) {
        customElements.define('harmony-circular-progress', class extends HTMLHarmonyCircularProgressElement {
        });
        customElements.define('h-cp', class extends HTMLHarmonyCircularProgressElement {
        });
        definedCircularProgress = true;
        injectGlobalCss();
    }
}

var radioCSS = ":host {\n\t--harmony-radio-shadow-button-border-radius: var(--harmony-radio-button-border-radius, 0.5rem);\n\tdisplay: inline-flex;\n\toverflow: hidden;\n\tuser-select: none;\n}\n\n.label {\n\tmargin: auto 0;\n\tfont-weight: bold;\n\tmargin-right: 0.25rem;\n}\n\n::slotted(button) {\n\tpadding: 0.5rem;\n\tcolor: var(--harmony-ui-text-primary);\n\tflex: auto;\n\tcursor: pointer;\n\tappearance: none;\n\tborder-style: solid;\n\tborder-width: 0.0625rem;\n\tborder-color: var(--harmony-ui-border-primary);\n\tborder-right-style: none;\n\tbackground-color: var(--harmony-ui-input-background-primary);\n\ttransition: background-color 0.2s linear;\n\tfont-size: 1rem;\n\toverflow: hidden;\n}\n\n::slotted(button:hover) {\n\tbackground-color: var(--harmony-ui-input-background-secondary);\n}\n\n::slotted(button[selected]) {\n\tbackground-color: var(--harmony-ui-accent-primary);\n}\n\n::slotted(button[selected]:hover) {\n\tbackground-color: var(--harmony-ui-accent-secondary);\n}\n\n::slotted(button:first-of-type) {\n\tborder-radius: var(--harmony-radio-shadow-button-border-radius) 0 0 var(--harmony-radio-shadow-button-border-radius);\n}\n\n::slotted(button:last-child) {\n\tborder-right-style: solid;\n\tborder-radius: 0 var(--harmony-radio-shadow-button-border-radius) var(--harmony-radio-shadow-button-border-radius) 0;\n}\n";

class HTMLHarmonyRadioElement extends HTMLElement {
    #doOnce = true;
    #disabled = false;
    #multiple = false;
    #htmlLabel;
    #buttons = new Map();
    #buttons2 = new Set();
    #slots = new Set();
    #selected = new Set();
    #shadowRoot;
    #lastSelected;
    constructor() {
        super();
        this.#shadowRoot = this.attachShadow({ mode: 'closed', slotAssignment: "manual" });
        this.#htmlLabel = createElement('div', { class: 'label' });
        this.#initMutationObserver();
    }
    connectedCallback() {
        if (this.#doOnce) {
            I18n.observeElement(this.#shadowRoot);
            shadowRootStyle(this.#shadowRoot, radioCSS);
            this.#shadowRoot.prepend(this.#htmlLabel);
            hide(this.#htmlLabel);
            this.#processChilds();
            this.#doOnce = false;
        }
    }
    #processChilds() {
        for (const child of this.children) {
            this.#initButton(child);
        }
    }
    #initButton(htmlButton) {
        this.#buttons.set(htmlButton.value, htmlButton);
        if (!this.#buttons2.has(htmlButton)) {
            htmlButton.addEventListener('click', () => this.select(htmlButton.value, !this.#multiple || !htmlButton.hasAttribute('selected')));
            this.#buttons2.add(htmlButton);
            const htmlSlot = createElement('slot', {
                parent: this.#shadowRoot,
            });
            this.#slots.add(htmlSlot);
            htmlSlot.assign(htmlButton);
            I18n.updateElement(htmlButton);
        }
        if (this.#selected.has(htmlButton.value) || htmlButton.hasAttribute('selected')) {
            this.select(htmlButton.value, true);
        }
    }
    select(value, select = true) {
        this.#selected[select ? 'add' : 'delete'](value);
        const htmlButton = this.#buttons.get(value);
        if (htmlButton) {
            if (select) {
                if (!this.#multiple) {
                    for (const child of this.children) {
                        if (child.hasAttribute('selected')) {
                            child.removeAttribute('selected');
                            this.dispatchEvent(new CustomEvent('change', { detail: { value: child.value, state: false } }));
                            child.dispatchEvent(new CustomEvent('change', { detail: { value: child.value, state: false } }));
                        }
                    }
                }
                htmlButton.setAttribute('selected', '');
                if (this.#lastSelected) {
                    this.#lastSelected.classList.remove('last-selected');
                }
                this.#lastSelected = htmlButton;
                this.#lastSelected.classList.add('last-selected');
            }
            else {
                htmlButton.removeAttribute('selected');
            }
            this.dispatchEvent(new CustomEvent('change', { detail: { value: htmlButton.value, state: select } }));
            htmlButton.dispatchEvent(new CustomEvent('change', { detail: { value: htmlButton.value, state: select } }));
        }
    }
    isSelected(value) {
        const htmlButton = this.#buttons.get(value);
        return htmlButton?.value ?? false;
    }
    set disabled(disabled) {
        this.#disabled = disabled ? true : false;
        this.classList[this.#disabled ? 'add' : 'remove']('disabled');
    }
    get disabled() {
        return this.#disabled;
    }
    clear() {
        for (const button of this.#buttons2) {
            button.remove();
        }
        for (const slot of this.#slots) {
            slot.remove();
        }
        this.#buttons.clear();
        this.#buttons2.clear();
        this.#selected.clear();
        this.#slots.clear();
    }
    #initMutationObserver() {
        const config = { childList: true, subtree: true };
        const mutationCallback = (mutationsList, observer) => {
            for (const mutation of mutationsList) {
                const addedNodes = mutation.addedNodes;
                for (const addedNode of addedNodes) {
                    if (addedNode.parentNode == this) {
                        this.#initButton(addedNode);
                    }
                }
            }
        };
        const observer = new MutationObserver(mutationCallback);
        observer.observe(this, config);
    }
    attributeChangedCallback(name, oldValue, newValue) {
        switch (name) {
            case 'data-label':
                this.#htmlLabel.innerHTML = newValue;
                this.#htmlLabel.classList.remove('i18n');
                show(this.#htmlLabel);
                break;
            case 'data-i18n':
                this.#htmlLabel.setAttribute('data-i18n', newValue);
                this.#htmlLabel.innerHTML = newValue;
                this.#htmlLabel.classList.add('i18n');
                show(this.#htmlLabel);
                break;
            case 'disabled':
                this.disabled = toBool(newValue);
                break;
            case 'multiple':
                this.#multiple = true;
            case 'value':
                this.select(newValue, true);
                break;
        }
    }
    static get observedAttributes() {
        return ['data-label', 'data-i18n', 'disabled', 'multiple', 'value'];
    }
}
let definedRadio = false;
function defineHarmonyRadio() {
    if (window.customElements && !definedRadio) {
        customElements.define('harmony-radio', HTMLHarmonyRadioElement);
        definedRadio = true;
        injectGlobalCss();
    }
}

var slideshowZoomCSS = ":host {\n\tposition: fixed;\n\tpointer-events: none;\n\twidth: 100%;\n\theight: 100%;\n\tz-index: var(--harmony-slideshow-zoom-z-index, 1000000);\n\ttop: 0;\n\tleft: 0;\n\n}\n\nimg {\n\twidth: 100%;\n\tposition: relative;\n\twidth: 1500px;\n}\n";

var slideshowCSS = ":host {\n\toverflow: hidden;\n\tdisplay: flex;\n\talign-items: center;\n\tjustify-content: center;\n\tflex-direction: column;\n\tposition: relative;\n}\n\n.image {\n\tposition: relative;\n\tflex-shrink: 0;\n}\n\n.images {\n\toverflow: hidden;\n\tflex: 1;\n\twidth: 100%;\n}\n\n.images-outer {\n\toverflow: hidden;\n\tmargin: auto;\n}\n\n.images-inner {\n\tdisplay: flex;\n\tposition: relative;\n\twidth: 100%;\n\theight: 100%;\n}\n\n:host(.dynamic) .images-inner {\n\ttransition: all 0.5s ease 0s;\n}\n\n/* Controls */\n.controls {\n\tposition: absolute;\n\tz-index: 1000;\n\topacity: 0;\n\twidth: 100%;\n\theight: 100%;\n\tdisplay: none;\n}\n\n:host(.dynamic) .controls {\n\tdisplay: unset;\n}\n\n.controls>div {\n\tposition: absolute;\n\n\tbackground-size: 100%;\n\tbackground-repeat: no-repeat;\n\tbackground-position: center;\n\tpointer-events: all;\n\tcursor: pointer;\n}\n\n.previous-image,\n.next-image {\n\ttop: calc(50% - 24px);\n\twidth: 48px;\n\theight: 48px;\n\tbackground-image: url(\"data:image/svg+xml,%3C%3Fxml version='1.0'%3F%3E%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath style='fill:%23ffffff;stroke:%23000000;stroke-width:10;' d='M 360,100 300,30 30,256 300,482 360,412 175,256 Z'/%3E%3C/svg%3E%0A\");\n\n}\n\n.previous-image {\n\tleft: 10px;\n}\n\n.next-image {\n\tright: 10px;\n\ttransform: scaleX(-1);\n}\n\n.play,\n.pause {\n\tbottom: 10px;\n\tleft: 10px;\n\twidth: 25px;\n\theight: 25px;\n}\n\n.play {\n\tbackground-image: url(\"data:image/svg+xml,%3C%3Fxml version='1.0'%3F%3E%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath style='fill:%23ffffff;stroke:%23000000;stroke-width:40;' d='M20 20 L470 256 L20 492 Z'/%3E%3C/svg%3E%0A\");\n}\n\n.pause {\n\tright: 0px;\n\tbackground-image: url(\"data:image/svg+xml,%3C%3Fxml version='1.0'%3F%3E%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cg style='fill:%23ffffff;stroke:%23000000;stroke-width:30;'%3E%3Crect width='140' height='452' x='30' y='30' /%3E%3Crect width='140' height='452' x='342' y='30' /%3E%3C/g%3E%3C/svg%3E%0A\");\n}\n\n/* thumbnails */\n.thumbnails {\n\twidth: 100%;\n\t/*background-color: red;*/\n\tflex: 0;\n\tdisplay: flex;\n\tjustify-content: center;\n}\n\n:host(.dynamic) .thumbnails {\n\tdisplay: none;\n}\n\n.thumbnails>img {\n\tobject-fit: contain;\n\theight: 80px;\n\tcursor: pointer;\n\tmargin: 3px;\n}\n\n.zoom {\n\tposition: fixed;\n\tpointer-events: none;\n\t/*transform: scale(3);*/\n\twidth: 100%;\n\theight: 100%;\n}\n\n.zoom>img {\n\t/*transform: scale(3);*/\n\twidth: 100%;\n\tposition: relative;\n\twidth: 1500px;\n}\n";

const resizeCallback = (entries, observer) => {
    entries.forEach(entry => {
        entry.target.onResized();
    });
};
const DEFAULT_AUTO_PLAY_DELAY = 3000;
const DEFAULT_SCROLL_TRANSITION_TIME = 0.5;
class HTMLHarmonySlideshowElement extends HTMLElement {
    #shadowRoot;
    #zoomShadowRoot;
    #activeImage;
    #currentImage = 0;
    #doOnce = true;
    #doOnceOptions;
    #dynamic = true;
    #htmlImages;
    #htmlImagesOuter;
    #htmlImagesInner;
    #htmlPauseButton;
    #htmlPlayButton;
    #htmlThumbnails;
    #images = [];
    #imgSet = new Set();
    #htmlZoomImage;
    #resizeObserver = new ResizeObserver(resizeCallback);
    #autoPlay = false;
    #autoPlayDelay = 0;
    #smoothScroll = false;
    #smoothScrollTransitionTime = 0;
    #autoplayTimeout = 0;
    constructor(options) {
        super();
        this.#doOnceOptions = options;
        this.#initObserver();
        this.#shadowRoot = this.attachShadow({ mode: 'closed' });
        I18n.observeElement(this.#shadowRoot);
        shadowRootStyleSync(this.#shadowRoot, slideshowCSS); // sync version is used to ensure style is loaded before computation occurs
        this.#htmlImages = createElement('div', {
            class: 'images',
            parent: this.#shadowRoot,
            child: this.#htmlImagesOuter = createElement('div', {
                class: 'images-outer',
                child: this.#htmlImagesInner = createElement('div', {
                    class: 'images-inner',
                }),
                events: {
                    mouseover: (event) => this.#zoomImage(event),
                    mousemove: (event) => this.#zoomImage(event),
                    mouseout: (event) => this.#zoomImage(event),
                },
            }),
        });
        createElement('div', {
            class: 'controls',
            parent: this.#shadowRoot,
            childs: [
                createElement('div', {
                    class: 'previous-image',
                    events: {
                        click: (event) => { this.previousImage(); this.setAutoPlay(false); },
                    },
                }),
                createElement('div', {
                    class: 'next-image',
                    events: {
                        click: (event) => { this.nextImage(); this.setAutoPlay(false); },
                    },
                }),
                this.#htmlPlayButton = createElement('div', {
                    class: 'play',
                    events: {
                        click: () => this.play(true),
                    },
                }),
                this.#htmlPauseButton = createElement('div', {
                    class: 'pause',
                    events: {
                        click: () => this.play(false),
                    },
                }),
            ],
            events: {
                mouseenter: (event) => event.target.style.opacity = 'unset',
                mouseleave: (event) => event.target.style.opacity = '0',
            },
        });
        this.#htmlZoomImage = createElement('img');
        this.#zoomShadowRoot = createShadowRoot('div', {
            adoptStyle: slideshowZoomCSS,
            parent: document.body,
            childs: [
                this.#htmlZoomImage,
            ]
        });
        this.#htmlThumbnails = createElement('div', {
            class: 'thumbnails',
            parent: this.#shadowRoot,
        });
    }
    previousImage() {
        if (this.#currentImage == 0) {
            this.setImage(this.#images.length - 1);
        }
        else {
            this.setImage(this.#currentImage - 1);
        }
    }
    nextImage() {
        if (this.#currentImage >= this.#images.length - 1) {
            this.setImage(0);
        }
        else {
            this.setImage(this.#currentImage + 1);
        }
    }
    setImage(imageId) {
        this.#currentImage = imageId;
        this.active = this.#images[imageId];
    }
    connectedCallback() {
        if (this.#doOnce) {
            //this.#initHtml();
            this.#processOptions(this.#doOnceOptions);
            this.#processChilds();
            this.#doOnce = false;
        }
        this.#resizeObserver.observe(this);
        this.checkImagesSize();
        if (this.#dynamic) {
            this.classList.add('dynamic');
        }
    }
    disconnectedCallback() {
        if (this.#zoomShadowRoot) {
            this.#zoomShadowRoot.host.remove();
            hide(this.#zoomShadowRoot);
        }
    }
    addImage(htmlImage) {
        if (htmlImage.constructor.name == 'HTMLImageElement') {
            if (!this.#imgSet.has(htmlImage)) {
                this.#images.push(htmlImage);
                this.#imgSet.add(htmlImage);
                this.#htmlImagesInner.append(htmlImage);
                if (!this.#activeImage) {
                    this.active = htmlImage;
                }
                htmlImage.classList.add('image');
                htmlImage.decode().then(() => {
                    this.refresh();
                });
                htmlImage.onload = () => this.checkImageSize(htmlImage);
                const htmlThumbnailImage = htmlImage.cloneNode();
                this.#htmlThumbnails.append(htmlThumbnailImage);
                htmlThumbnailImage.addEventListener('click', () => this.active = htmlImage);
            }
        }
    }
    removeAllImages() {
        this.#images = [];
        this.#imgSet = new Set();
        this.#htmlImagesInner.innerText = '';
        this.#htmlThumbnails.innerText = '';
        this.#activeImage = undefined;
        // Remove pending images
        const list = [];
        for (const child of this.children) {
            if (child.constructor.name == 'HTMLImageElement') {
                list.push(child);
            }
        }
        list.forEach(element => element.remove());
    }
    refresh() {
        for (const image of this.#images) {
            //image.style.display = (image ==  this.#activeImage) ? '' : 'none';
            image.style.display = '';
        }
    }
    #processOptions(options = {}) {
        this.setAutoPlay(options.autoPlay ?? true);
        this.#autoPlayDelay = options.autoPlayDelay ?? DEFAULT_AUTO_PLAY_DELAY;
        this.#smoothScroll = options.smoothScroll ?? true;
        this.#smoothScrollTransitionTime = options.smoothScrollTransitionTime ?? DEFAULT_SCROLL_TRANSITION_TIME;
        if (options.images) {
            for (const image of options.images) {
                const htmlImage = createElement('img');
                htmlImage.src = image;
                this.addImage(htmlImage);
            }
        }
        if (options.class) {
            this.className = options.class;
        }
        if (options.id) {
            this.id = options.id;
        }
    }
    #processChilds() {
        //This is a 2 steps process cause we may change DOM
        const list = [];
        for (const child of this.children) {
            list.push(child);
        }
        list.forEach(element => this.addImage(element));
    }
    set active(htmlImage) {
        if (htmlImage) {
            this.#activeImage = htmlImage;
            this.refresh();
            this.checkImageSize(htmlImage);
            this.#htmlImagesInner.style.left = `-${htmlImage.offsetLeft}px`;
            this.play();
        }
    }
    set dynamic(dynamic) {
        this.#dynamic = dynamic;
        if (!dynamic) {
            this.setAutoPlay(false);
            this.setImage(0);
        }
        if (dynamic) {
            this.classList.add('dynamic');
        }
        else {
            this.classList.remove('dynamic');
        }
    }
    setAutoPlay(autoPlay) {
        this.#autoPlay = autoPlay && this.#dynamic;
        if (autoPlay) {
            hide(this.#htmlPlayButton);
            show(this.#htmlPauseButton);
        }
        else {
            show(this.#htmlPlayButton);
            hide(this.#htmlPauseButton);
        }
    }
    play(autoPlay) {
        if (autoPlay !== undefined) {
            this.setAutoPlay(autoPlay);
        }
        clearTimeout(this.#autoplayTimeout);
        if (this.#autoPlay) {
            this.#autoplayTimeout = setTimeout(() => this.nextImage(), this.#autoPlayDelay);
        }
    }
    onResized() {
        this.checkImagesSize();
    }
    checkImagesSize() {
        const rect = this.#htmlImages.getBoundingClientRect();
        for (const image of this.#images) {
            this.checkImageSize(image, rect);
        }
    }
    checkImageSize(htmlImage, rect = this.#htmlImages.getBoundingClientRect()) {
        if (this.#activeImage != htmlImage) {
            return;
        }
        let widthRatio = 1.0;
        let heightRatio = 1.0;
        const naturalWidth = htmlImage.naturalWidth;
        const naturalHeight = htmlImage.naturalHeight;
        if (naturalWidth > rect.width) {
            widthRatio = rect.width / naturalWidth;
        }
        if (naturalHeight > rect.height) {
            heightRatio = rect.height / naturalHeight;
        }
        const ratio = Math.min(widthRatio, heightRatio);
        const imageWidth = naturalWidth * ratio + 'px';
        const imageHeight = naturalHeight * ratio + 'px';
        this.#htmlImagesOuter.style.width = imageWidth;
        this.#htmlImagesOuter.style.height = imageHeight;
    }
    #zoomImage(event) {
        const activeImage = this.#activeImage;
        switch (event.type) {
            case 'mouseover':
                if (activeImage) {
                    this.#htmlZoomImage.src = activeImage.src;
                    show(this.#zoomShadowRoot);
                }
                break;
            case 'mousemove':
                if (activeImage) {
                    const deltaWidth = this.#zoomShadowRoot.host.clientWidth - this.#htmlZoomImage.clientWidth;
                    const deltaHeight = this.#zoomShadowRoot.host.clientHeight - this.#htmlZoomImage.clientHeight;
                    const mouseX = event.offsetX / activeImage.offsetWidth - 0.5;
                    const mouseY = event.offsetY / activeImage.offsetHeight - 0.5;
                    /*if (deltaWidth >= 0) {
                        this.#htmlZoomImage.style.left = `${-mouseX * deltaWidth}px`;
                    } else {

                    }
                    if (deltaHeight >= 0) {
                        this.#htmlZoomImage.style.top = `${-mouseY * deltaHeight}px`;
                    }*/
                    //console.log(deltaWidth, deltaHeight);
                    //console.log(mouseX, mouseY);
                    this.#htmlZoomImage.style.left = `${deltaWidth * 0.5 - Math.sign(deltaWidth) * mouseX * deltaWidth}px`;
                    this.#htmlZoomImage.style.top = `${deltaHeight * 0.5 - Math.sign(deltaHeight) * mouseY * deltaHeight}px`;
                }
                break;
            case 'mouseout':
                hide(this.#zoomShadowRoot);
                break;
        }
    }
    #initObserver() {
        const config = { childList: true, subtree: true };
        const mutationCallback = (mutationsList, observer) => {
            for (const mutation of mutationsList) {
                for (const addedNode of mutation.addedNodes) {
                    if (addedNode.parentNode == this) {
                        this.addImage(addedNode);
                    }
                }
            }
        };
        const observer = new MutationObserver(mutationCallback);
        observer.observe(this, config);
    }
    attributeChangedCallback(name, oldValue, newValue) {
        switch (name) {
            case 'dynamic':
                this.dynamic = toBool(newValue);
                break;
        }
    }
    static get observedAttributes() {
        return ['dynamic'];
    }
}
let definedSlideshow = false;
function defineHarmonySlideshow() {
    if (window.customElements && !definedSlideshow) {
        customElements.define('harmony-slideshow', HTMLHarmonySlideshowElement);
        definedSlideshow = true;
        injectGlobalCss();
    }
}

var selectCSS = "";

class HTMLHarmonySelectElement extends HTMLElement {
    #htmlSelect;
    #shadowRoot;
    constructor() {
        super();
        this.#shadowRoot = this.attachShadow({ mode: 'closed' });
        this.#htmlSelect = createElement('select', { parent: this.#shadowRoot });
    }
    connectedCallback() {
        shadowRootStyle(this.#shadowRoot, selectCSS);
        this.#shadowRoot.append(this.#htmlSelect);
    }
    attributeChangedCallback(name, oldValue, newValue) {
        if (name == 'multiple') {
            this.#htmlSelect.setAttribute('multiple', newValue);
        }
    }
    addEventListener(type, listener) {
        this.#htmlSelect.addEventListener(type, listener);
    }
    /*
        onChange(event: Event) {
            let newEvent = new event.constructor(event.type, event);
            this.dispatchEvent(newEvent);
        }
    */
    addOption(value, text) {
        text = text ?? value;
        const option = document.createElement('option');
        option.value = value;
        option.innerHTML = text;
        this.#htmlSelect.append(option);
    }
    addOptions(values) {
        if (values && values.entries) {
            for (const [value, text] of values.entries()) {
                this.addOption(value, text);
            }
        }
    }
    setOptions(values) {
        this.removeAllOptions();
        this.addOptions(values);
    }
    removeOption(value) {
        const list = this.#htmlSelect.children;
        for (let i = 0; i < list.length; i++) {
            if (list[i].value === value) {
                list[i].remove();
            }
        }
    }
    removeAllOptions() {
        const list = this.#htmlSelect.children;
        while (list[0]) {
            list[0].remove();
        }
    }
    select(value) {
        const list = this.#htmlSelect.children;
        for (let i = 0; i < list.length; i++) {
            if (list[i].value === value) {
                list[i].selected = true;
            }
        }
    }
    selectFirst() {
        if (this.#htmlSelect.children[0]) {
            this.#htmlSelect.children[0].selected = true;
            this.#htmlSelect.dispatchEvent(new Event('input'));
        }
    }
    unselect(value) {
        const list = this.#htmlSelect.children;
        for (let i = 0; i < list.length; i++) {
            if (list[i].value === value) {
                list[i].selected = false;
            }
        }
    }
    unselectAll() {
        const list = this.#htmlSelect.children;
        for (let i = 0; i < list.length; i++) {
            list[i].selected = false;
        }
    }
    static get observedAttributes() {
        return ['multiple'];
    }
}
let definedSelect = false;
function defineHarmonySelect() {
    if (window.customElements && !definedSelect) {
        customElements.define('harmony-select', HTMLHarmonySelectElement);
        definedSelect = true;
        injectGlobalCss();
    }
}

var sliderCSS = ":host {\n\tdisplay: flex;\n}\n\nlabel {\n\twidth: var(--h-slider-label-width, auto);\n}\n\ninput[type=range] {\n\tflex: auto;\n}\n\ninput[type=number] {\n\tflex: 0 0 var(--h-slider-input-width, 4rem);\n\tfont-size: var(--h-slider-input-font-size, 1.2rem);\n\tmin-width: 0;\n\ttext-align: center;\n}\n";

class HTMLHarmonySliderElement extends HTMLHarmonyElement {
    #shadowRoot;
    #htmlLabel;
    #htmlSlider;
    #htmlInput;
    #htmlPrependSlot;
    #htmlAppendSlot;
    #htmlPrependIcon;
    #htmlAppendIcon;
    #min = 0;
    #max = 100;
    #value = [50, 50];
    #isRange = false;
    createElement() {
        this.#shadowRoot = this.attachShadow({ mode: 'closed' });
        shadowRootStyle(this.#shadowRoot, sliderCSS);
        I18n.observeElement(this.#shadowRoot);
        this.#htmlLabel = createElement('label', {
            parent: this.#shadowRoot,
            hidden: true,
        });
        this.#htmlPrependSlot = createElement('slot', {
            parent: this.#shadowRoot,
            name: 'prepend',
        });
        this.#htmlPrependIcon = createElement('img', {
            parent: this.#shadowRoot,
        });
        this.#htmlSlider = createElement('input', {
            type: 'range',
            parent: this.#shadowRoot,
            step: 'any',
            $change: (event) => this.#setValue(Number(event.target.value), undefined, event.target),
            $input: (event) => this.#setValue(Number(event.target.value), undefined, event.target),
        });
        this.#htmlAppendIcon = createElement('img', {
            parent: this.#shadowRoot,
        });
        this.#htmlAppendSlot = createElement('slot', {
            parent: this.#shadowRoot,
            name: 'append',
        });
        this.#htmlInput = createElement('input', {
            type: 'number',
            hidden: true,
            parent: this.#shadowRoot,
            value: 50,
            step: 'any',
            min: 0,
            max: 1000,
            $change: (event) => this.#setValue(Number(event.target.value), undefined, event.target),
            $input: (event) => this.#setValue(Number(event.target.value), undefined, event.target),
        });
    }
    #checkMin(value) {
        if (value < this.#min) {
            return this.#min;
        }
        return value;
    }
    #checkMax(max) {
        if (max > this.#max) {
            return this.#max;
        }
        return max;
    }
    #setValue(min, max, initiator) {
        //	 TODO: swap min/max
        if (min !== undefined) {
            this.#value[0] = this.#checkMin(min);
        }
        if (max !== undefined) {
            this.#value[1] = this.#checkMax(max);
        }
        if (initiator != this.#htmlSlider) {
            this.#htmlSlider.value = String(min ?? this.#value[0]);
        }
        if (initiator != this.#htmlInput) {
            this.#htmlInput.value = String((min ?? this.#value[0]).toFixed(2));
        }
        this.dispatchEvent(new CustomEvent('input', {
            detail: {
                value: this.#isRange ? this.#value : this.#value[0],
            }
        }));
    }
    get value() {
        return this.#isRange ? this.#value : this.#value[0];
    }
    isRange() {
        return this.#isRange;
    }
    setValue(value) {
        if (Array.isArray(value)) {
            this.#setValue(value[0], value[1]);
        }
        else {
            if (this.#isRange) {
                console.error('value must be an array');
            }
            else {
                this.#setValue(value);
            }
        }
    }
    onAttributeChanged(name, oldValue, newValue) {
        let step;
        switch (name) {
            case 'label':
                this.#htmlLabel.innerHTML = newValue;
                updateElement(this.#htmlLabel, { i18n: newValue, });
                show(this.#htmlLabel);
                break;
            case 'min':
                this.#min = Number(newValue);
                this.#htmlSlider.setAttribute('min', String(this.#min));
                this.#htmlInput.setAttribute('min', String(this.#min));
                break;
            case 'max':
                this.#max = Number(newValue);
                this.#htmlSlider.setAttribute('max', String(this.#max));
                this.#htmlInput.setAttribute('max', String(this.#max));
                break;
            case 'value':
                if (newValue === null) {
                    break;
                }
                const value = JSON.parse(newValue);
                if (Array.isArray(value)) {
                    this.setValue(value);
                }
                else {
                    const n = Number(value);
                    if (!Number.isNaN(n)) {
                        this.setValue(n);
                    }
                }
                break;
            case 'step':
                step = Number(newValue);
                if (Number.isNaN(step)) {
                    step = undefined;
                }
                else {
                    step = step;
                }
                this.#htmlSlider.setAttribute('step', step ? String(step) : 'any');
                break;
            case 'input-step':
                step = Number(newValue);
                if (Number.isNaN(step)) {
                    step = undefined;
                }
                else {
                    step = step;
                }
                this.#htmlInput.setAttribute('step', step ? String(step) : 'any');
                break;
            case 'has-input':
                if (newValue === null) {
                    hide(this.#htmlInput);
                }
                else {
                    show(this.#htmlInput);
                }
                break;
            /*
            case 'data-label':
                this.#htmlText.innerHTML = newValue;
                this.#htmlText.classList.remove('i18n');
                break;
            case 'data-i18n':
                this.#htmlText.setAttribute('data-i18n', newValue);
                this.#htmlText.innerHTML = newValue;
                this.#htmlText.classList.add('i18n');
                break;
            case 'data-position':
                this.#htmlText.setAttribute('data-position', newValue);
                break;
                */
        }
    }
    static get observedAttributes() {
        return super.observedAttributes.concat(['label', 'min', 'max', 'input-step', 'has-input', 'append-icon', 'prepend-icon', 'value']);
    }
}
let definedSlider = false;
function defineHarmonySlider() {
    if (window.customElements && !definedSlider) {
        customElements.define('harmony-slider', HTMLHarmonySliderElement);
        definedSlider = true;
        injectGlobalCss();
    }
}

var splitterCSS = ":host {\n\tdisplay: flex;\n\tpointer-events: none;\n\t/*--harmony-color-picker-shadow-gap: var(--harmony-color-picker-gap, 0.5rem);*/\n\t--harmony-splitter-shadow-gutter-thickness: var(--harmony-splitter-gutter-thickness, 0.3rem);\n\t--harmony-splitter-shadow-gutter-bg-color: var(--harmony-splitter-gutter-bg-color, black);\n}\n\n:host(.vertical) {\n\tflex-direction: row;\n}\n\n:host(.horizontal) {\n\tflex-direction: column;\n}\n\n:host .gutter {\n\tflex: 0 0 var(--harmony-splitter-shadow-gutter-thickness);\n\tpointer-events: all;\n\tbackground-color: var(--harmony-splitter-shadow-gutter-bg-color);\n}\n\n:host(.vertical) .gutter {\n\tcursor: ew-resize;\n}\n\n:host(.horizontal) .gutter {\n\tcursor: ns-resize;\n}\n\n:host .panel {\n\tflex: 0 0 50%;\n\tdisplay: flex;\n\tpointer-events: none;\n}\n";

class HTMLHarmonySplitterElement extends HTMLElement {
    #shadowRoot;
    #htmlPanel1;
    #htmlPanel2;
    #htmlGutter;
    #doOnce = true;
    #orientation = 'v';
    #split = 0.5;
    #startOffsetLeft = 0;
    #startOffsetTop = 0;
    #startPageX = 0;
    #startPageY = 0;
    #startOffsetX = 0;
    #startOffsetY = 0;
    #dragging = false;
    constructor() {
        super();
        this.#shadowRoot = this.attachShadow({ mode: 'closed' });
        shadowRootStyleSync(this.#shadowRoot, splitterCSS); // sync version is used to ensure style is loaded before computation occurs
        this.#htmlPanel1 = createElement('slot', {
            class: 'panel',
            name: '1',
            parent: this.#shadowRoot,
        });
        this.#htmlGutter = createElement('div', {
            class: 'gutter',
            parent: this.#shadowRoot,
            /*events: {
                mousedown: event => this.#handleMouseDown(event),
            },*/
        });
        this.#htmlPanel2 = createElement('slot', {
            class: 'panel',
            name: '2',
            parent: this.#shadowRoot,
        });
        this.#htmlGutter.addEventListener('mousedown', event => this.#handleMouseDown(event));
        document.body.addEventListener('mousemove', event => this.#handleMouseMove(event), { capture: true });
        document.body.addEventListener('mouseup', () => this.#dragging = false);
    }
    connectedCallback() {
        if (this.#doOnce) {
            this.setOrientation(this.getAttribute('orientation') ?? 'v');
            this.#update();
            this.#doOnce = false;
        }
    }
    #update() {
        this.#htmlPanel1.style.flexBasis = this.#split * 100 + '%';
        this.#htmlPanel2.style.flexBasis = (1 - this.#split) * 100 + '%';
    }
    setOrientation(orientation) {
        this.classList.remove('vertical', 'horizontal');
        switch (orientation) {
            case 'v':
            case 'vertical':
                this.#orientation = 'v';
                this.classList.add('vertical');
                break;
            case 'h':
            case 'horizontal':
                this.#orientation = 'h';
                this.classList.add('horizontal');
                break;
        }
    }
    #handleMouseDown(event) {
        this.#startOffsetLeft = this.#htmlGutter.offsetLeft;
        this.#startOffsetTop = this.#htmlGutter.offsetTop;
        this.#startOffsetX = event.offsetX;
        this.#startOffsetY = event.offsetY;
        this.#startPageX = event.pageX;
        this.#startPageY = event.pageY;
        this.#dragging = true;
        event.stopPropagation();
    }
    #handleMouseMove(event) {
        if (!this.#dragging) {
            return;
        }
        const elemRect = this.getBoundingClientRect();
        const clientX = event.clientX;
        const clientY = event.clientY;
        if (this.#orientation == 'v') {
            this.#split = (clientX - elemRect.x) / elemRect.width;
        }
        else {
            this.#split = (clientY - elemRect.y) / elemRect.height;
        }
        this.#split = Math.max(Math.min(this.#split, 0.99), 0.01);
        this.dispatchEvent(new CustomEvent('change', { detail: { value: this.#split } }));
        this.#update();
    }
    attributeChangedCallback(name, oldValue, newValue) {
        switch (name) {
            case 'orientation':
                this.setOrientation(newValue);
                break;
        }
    }
    static get observedAttributes() {
        return ['orientation'];
    }
}
let definedSplitter = false;
function defineHarmonySplitter() {
    if (window.customElements && !definedSplitter) {
        customElements.define('harmony-splitter', HTMLHarmonySplitterElement);
        definedSplitter = true;
        injectGlobalCss();
    }
}

var switchCSS = ":host {\n\t--harmony-switch-shadow-width: var(--harmony-switch-width, 4rem);\n\t--harmony-switch-shadow-height: var(--harmony-switch-height, 2rem);\n\t--harmony-switch-shadow-on-background-color: var(--harmony-switch-on-background-color, #1072eb);\n\t--harmony-switch-shadow-on-background-color-hover: var(--harmony-switch-on-background-color-hover, #1040c1);\n\t--harmony-switch-shadow-slider-width: var(--harmony-switch-slider-width, 1.4rem);\n\t--harmony-switch-shadow-slider-height: var(--harmony-switch-slider-height, 1.4rem);\n\t--harmony-switch-shadow-slider-margin: var(--harmony-switch-slider-margin, 0.3rem);\n\t--harmony-switch-shadow-slider-border-width: var(--harmony-switch-slider-border-width, 0rem);\n\t--slot-width: var(--harmony-switch-slot-width, auto);\n\t--prepend-width: var(--harmony-switch-prepend-width, var(--slot-width));\n\t--append-width: var(--harmony-switch-append-width, var(--slot-width));\n\n\tdisplay: inline-flex;\n\tuser-select: none;\n\tcursor: pointer;\n\tjustify-content: space-between;\n}\n\n:host>* {\n\tflex-grow: 0;\n}\n\n.label {\n\tmargin: auto 0;\n\tfont-weight: bold;\n\tflex: 1;\n}\n\nslot{\n\tdisplay: inline-block;\n}\n\nslot[name=\"prepend\"] {\n\twidth: var(--prepend-width);\n}\n\nslot[name=\"append\"] {\n\twidth: var(--append-width);\n}\n\n.harmony-switch-outer {\n\tdisplay: flex;\n\theight: var(--harmony-switch-shadow-height);\n\tborder-radius: calc(var(--harmony-switch-shadow-height) * 0.5);\n\talign-items: center;\n\tmargin-left: 0.25rem;\n\ttransition: background-color 0.25s linear;\n\twidth: var(--harmony-switch-shadow-width);\n}\n\n.harmony-switch-outer {\n\tbackground-color: var(--harmony-ui-input-background-primary);\n}\n\n.harmony-switch-outer:hover {\n\tbackground-color: var(--harmony-ui-input-background-secondary);\n}\n\n.harmony-switch-outer.on {\n\tbackground-color: var(--harmony-ui-accent-primary);\n}\n\n.harmony-switch-outer.on:hover {\n\tbackground-color: var(--harmony-ui-accent-secondary);\n}\n\n.harmony-switch-inner {\n\tdisplay: inline-block;\n\theight: var(--harmony-switch-shadow-slider-height);\n\twidth: var(--harmony-switch-shadow-slider-width);\n\tborder-radius: calc(var(--harmony-switch-shadow-slider-height) * 0.5);\n\ttransition: all 0.25s;\n\tposition: relative;\n\tleft: var(--harmony-switch-shadow-slider-margin);\n\tborder: var(--harmony-switch-shadow-slider-border-width) solid;\n\tbox-sizing: border-box;\n\tborder-color: var(--harmony-ui-input-border-primary);\n\tbackground-color: var(--harmony-ui-input-background-tertiary);\n}\n\n.harmony-switch-outer.ternary .harmony-switch-inner {\n\tleft: calc(50% - var(--harmony-switch-shadow-slider-width) * 0.5);\n}\n\n.harmony-switch-outer.off .harmony-switch-inner {\n\tleft: var(--harmony-switch-shadow-slider-margin);\n}\n\n.harmony-switch-outer.on .harmony-switch-inner {\n\tleft: calc(100% - var(--harmony-switch-shadow-slider-width) - var(--harmony-switch-shadow-slider-margin));\n}\n\n.harmony-switch-outer.ternary.off {\n\tbackground-color: red;\n}\n\n.harmony-switch-outer.ternary.off:hover {\n\tbackground-color: red;\n}\n\n.harmony-switch-outer.ternary.on {\n\tbackground-color: green;\n}\n\n.harmony-switch-outer.ternary.on:hover {\n\tbackground-color: green;\n}\n";

class HTMLHarmonySwitchElement extends HTMLHarmonyElement {
    #shadowRoot;
    #disabled = false;
    #htmlLabel;
    #htmlSwitchOuter;
    #state = false;
    #ternary = false;
    createElement() {
        this.#shadowRoot = this.attachShadow({ mode: 'closed' });
        shadowRootStyle(this.#shadowRoot, switchCSS);
        I18n.observeElement(this.#shadowRoot);
        this.#htmlLabel = createElement('div', {
            parent: this.#shadowRoot,
            class: 'label',
        });
        createElement('slot', {
            parent: this.#shadowRoot,
            name: 'prepend',
            $click: () => this.state = false,
        });
        this.#htmlSwitchOuter = createElement('span', {
            parent: this.#shadowRoot,
            class: 'harmony-switch-outer',
            child: createElement('span', { class: 'harmony-switch-inner' }),
            $click: () => this.toggle(),
        });
        createElement('slot', {
            parent: this.#shadowRoot,
            name: 'append',
            $click: () => this.state = true,
        });
        this.#refresh();
    }
    set disabled(disabled) {
        this.#disabled = disabled ? true : false;
        this.classList[this.#disabled ? 'add' : 'remove']('disabled');
    }
    get disabled() {
        return this.#disabled;
    }
    set state(state) {
        if (this.#state != state) {
            this.#state = state;
            this.dispatchEvent(new CustomEvent('change', { detail: { state: state, value: state } }));
        }
        else {
            this.#state = state;
        }
        this.#refresh();
    }
    get state() {
        return this.#state;
    }
    set checked(checked) {
        this.state = checked;
    }
    get checked() {
        return this.#state;
    }
    set ternary(ternary) {
        this.#ternary = ternary;
        this.#refresh();
    }
    get ternary() {
        return this.#ternary;
    }
    toggle() {
        if (this.#ternary) {
            if (this.#state === false) {
                this.state = undefined;
            }
            else if (this.#state === undefined) {
                this.state = true;
            }
            else {
                this.state = false;
            }
        }
        else {
            this.state = !this.#state;
        }
        this.#refresh();
    }
    #refresh() {
        this.#htmlSwitchOuter?.classList.remove('on', 'off', 'ternary');
        if (this.#ternary) {
            this.#htmlSwitchOuter?.classList.add('ternary');
        }
        if (this.#state === undefined) {
            return;
        }
        this.#htmlSwitchOuter?.classList.add(this.#state ? 'on' : 'off');
    }
    onAttributeChanged(name, oldValue, newValue) {
        switch (name) {
            case 'data-label':
                if (this.#htmlLabel) {
                    this.#htmlLabel.innerHTML = newValue;
                }
                this.#htmlLabel?.classList.remove('i18n');
                break;
            case 'data-i18n':
                this.#htmlLabel?.setAttribute('data-i18n', newValue);
                if (this.#htmlLabel) {
                    this.#htmlLabel.innerHTML = newValue;
                }
                this.#htmlLabel?.classList.add('i18n');
                break;
            case 'disabled':
                this.disabled = toBool(newValue);
                break;
            case 'ternary':
                this.ternary = true;
            case 'state':
                if (newValue == '' || newValue == 'undefined') {
                    this.state = undefined;
                }
                else {
                    if (newValue == 'true' || newValue == '1') {
                        this.state = true;
                    }
                    else {
                        this.state = false;
                    }
                }
                break;
        }
    }
    static get observedAttributes() {
        return ['data-label', 'data-i18n', 'disabled', 'ternary', 'state'];
    }
}
let definedSwitch = false;
function defineHarmonySwitch() {
    if (window.customElements && !definedSwitch) {
        customElements.define('harmony-switch', HTMLHarmonySwitchElement);
        definedSwitch = true;
        injectGlobalCss();
    }
}

class HTMLHarmonyTabElement extends HTMLElement {
    #disabled = false;
    #active = false;
    #header;
    #htmlTitle;
    #htmlClose;
    #group;
    #closed = false;
    constructor() {
        super();
        this.#header = createElement('div', {
            class: 'tab',
            childs: [
                this.#htmlTitle = createElement('span', {
                    ...(this.getAttribute('data-i18n')) && { i18n: this.getAttribute('data-i18n') },
                    ...(this.getAttribute('data-text')) && { innerText: this.getAttribute('data-text') },
                }),
                this.#htmlClose = createElement('span', {
                    class: 'close',
                    innerHTML: closeSVG,
                    hidden: !toBool(this.getAttribute('data-closable') ?? ''),
                    $click: (event) => { event.stopPropagation(); this.close(); },
                }),
            ],
            $click: () => this.#click(),
        });
    }
    get htmlHeader() {
        return this.#header;
    }
    connectedCallback() {
        const parentElement = this.parentElement;
        if (parentElement && parentElement.tagName == 'HARMONY-TAB-GROUP') {
            parentElement.addTab(this);
            this.#group = parentElement;
        }
    }
    attributeChangedCallback(name, oldValue, newValue) {
        switch (name) {
            case 'data-i18n':
                this.#htmlTitle.setAttribute('data-i18n', newValue);
                this.#htmlTitle.innerText = newValue;
                this.#htmlTitle.classList.add('i18n');
                break;
            case 'data-text':
                this.#htmlTitle.innerText = newValue;
                break;
            case 'disabled':
                this.disabled = toBool(newValue);
            case 'data-closable':
                display(this.#htmlClose, toBool(newValue));
                break;
        }
    }
    set disabled(disabled) {
        this.#disabled = disabled ? true : false;
        this.#header.classList[this.#disabled ? 'add' : 'remove']('disabled');
    }
    get disabled() {
        return this.#disabled;
    }
    activate() {
        this.setActive(true);
    }
    close() {
        if (this.#closed) {
            return false;
        }
        if (!this.dispatchEvent(new CustomEvent('close', { cancelable: true, detail: { tab: this } }))) {
            return false;
        }
        this.#group?.closeTab(this);
        return true;
    }
    /**
     * @deprecated use setActive() instead
     */
    set active(active) {
        console.warn('deprecated, use setActive instead');
        this.setActive(active);
    }
    setActive(active) {
        if (this.#active != active) {
            this.#active = active;
            if (active) {
                this.dispatchEvent(new CustomEvent('activated', { detail: { tab: this } }));
            }
            else {
                this.dispatchEvent(new CustomEvent('deactivated', { detail: { tab: this } }));
            }
        }
        display(this, active);
        if (active) {
            this.#header.classList.add('activated');
        }
        else {
            this.#header.classList.remove('activated');
        }
        if (active && this.#group) {
            this.#group.activateTab(this);
        }
    }
    /**
     * @deprecated use isActive() instead
     */
    get active() {
        console.warn('deprecated, use getActive instead');
        return this.isActive();
    }
    isActive() {
        return this.#active;
    }
    isClosed() {
        return this.#closed;
    }
    #click() {
        if (!this.dispatchEvent(new CustomEvent('click', { cancelable: true, detail: { tab: this } }))) {
            return;
        }
        if (!this.#disabled) {
            this.activate();
        }
    }
    static get observedAttributes() {
        return ['data-i18n', 'data-text', 'disabled', 'data-closable'];
    }
}
let definedTab = false;
function defineHarmonyTab() {
    if (window.customElements && !definedTab) {
        customElements.define('harmony-tab', HTMLHarmonyTabElement);
        definedTab = true;
        injectGlobalCss();
    }
}

var tabGroupCSS = ":host,\nharmony-tab-group {\n\twidth: 100%;\n\theight: 100%;\n\tdisplay: flex;\n\tflex-direction: column;\n\tposition: relative;\n\t/*overflow: hidden;*/\n}\n\n.harmony-tab-group-header {\n\tbackground-color: var(--main-bg-color-bright);\n\tdisplay: flex;\n\tflex-wrap: wrap;\n\t/*overflow: hidden;*/\n\twidth: 100%;\n}\n\n.harmony-tab-group-content {\n\tflex: 1;\n\tbackground-color: var(--main-bg-color-dark);\n\toverflow: auto;\n\twidth: 100%;\n}\n";

var tabCSS = "harmony-tab {\n\tdisplay: block;\n\theight: 100%;\n\toverflow: auto;\n}\n\nharmony-tab::first-letter {\n\ttext-transform: uppercase;\n}\n\n.tab {\n\tdisplay: inline-block;\n\tbackground-color: var(--main-bg-color-bright);\n\tpadding: 10px;\n\tborder: 1px solid black;\n\tborder-top: 0px;\n\tposition: relative;\n\tcolor: var(--main-text-color-dark2);\n\tcursor: pointer;\n\tuser-select: none;\n\tpointer-events: all;\n\tflex: 0 0;\n\ttext-align: center;\n\twhite-space: nowrap;\n\tdisplay: flex;\n\talign-items: center;\n}\n\n.label.activated {\n\tbackground-color: var(--main-bg-color-dark);\n\tborder-bottom: 1px solid var(--main-bg-color-dark);\n\tborder-left: 1px solid white;\n\tz-index: 2;\n}\n";

class HTMLHarmonyTabGroupElement extends HTMLElement {
    #doOnce = true;
    #tabs = new Set();
    #header;
    #content;
    #activeTab;
    #shadowRoot;
    constructor() {
        super();
        this.#shadowRoot = this.attachShadow({ mode: 'closed' });
        this.#header = createElement('div', {
            class: 'harmony-tab-group-header',
        });
        this.#content = createElement('div', {
            class: 'harmony-tab-group-content',
        });
    }
    connectedCallback() {
        if (this.#doOnce) {
            I18n.observeElement(this.#shadowRoot);
            shadowRootStyle(this.#shadowRoot, tabGroupCSS);
            shadowRootStyle(this.#shadowRoot, tabCSS);
            this.#shadowRoot.append(this.#header, this.#content);
            this.#doOnce = false;
        }
    }
    adoptStyleSheet(styleSheet) {
        this.#shadowRoot.adoptedStyleSheets.push(styleSheet);
    }
    addTab(tab) {
        this.#tabs.add(tab);
        if (!this.#activeTab) {
            this.#activeTab = tab;
        }
        this.#refresh();
    }
    #refresh() {
        this.#header.replaceChildren();
        this.#content.replaceChildren();
        for (const tab of this.#tabs) {
            this.#header.append(tab.htmlHeader);
            this.#content.append(tab);
            if (tab != this.#activeTab) {
                tab.setActive(false);
            }
        }
        this.#activeTab?.setActive(true);
    }
    /**
     * @deprecated use activateTab() instead
     */
    set active(tab) {
        console.warn('deprecated, use activateTab instead');
        this.activateTab(tab);
    }
    activateTab(tab) {
        if (this.#activeTab != tab) {
            this.#activeTab = tab;
            this.#refresh();
        }
    }
    closeTab(tab) {
        this.#tabs.delete(tab);
        if (this.#activeTab == tab) {
            this.#activeTab = this.#tabs.values().next().value;
        }
        this.#refresh();
    }
    clear() {
        this.#tabs.clear();
        this.#activeTab = undefined;
        this.#header.innerText = '';
        this.#content.innerText = '';
    }
}
let definedTabGroup = false;
function defineHarmonyTabGroup() {
    if (window.customElements && !definedTabGroup) {
        customElements.define('harmony-tab-group', HTMLHarmonyTabGroupElement);
        definedTabGroup = true;
        injectGlobalCss();
    }
}

var toggleButtonCSS = ":host {\n\tcursor: pointer;\n\tdisplay: inline-block;\n\tposition: relative;\n}\n\non,\noff {\n\theight: 100%;\n\twidth: 100%;\n\tbackground-size: 100% auto;\n\tbox-sizing: border-box;\n}\n";

class HTMLHarmonyToggleButtonElement extends HTMLElement {
    #state = false;
    #shadowRoot;
    #htmlSlotOn;
    #htmlSlotOff;
    constructor() {
        super();
        this.#shadowRoot = this.attachShadow({ mode: 'closed' });
        this.#htmlSlotOn = createElement('slot', {
            parent: this.#shadowRoot,
            name: 'on',
        });
        this.#htmlSlotOff = createElement('slot', {
            parent: this.#shadowRoot,
            name: 'off',
        });
        I18n.observeElement(this.#shadowRoot);
        shadowRootStyle(this.#shadowRoot, toggleButtonCSS);
        this.addEventListener('click', (event) => {
            this.#click();
            event.stopPropagation();
        });
        this.#initObserver();
    }
    connectedCallback() {
        this.#refresh();
    }
    attributeChangedCallback(name, oldValue, newValue) {
        if (name == 'state') {
            this.state = toBool(newValue);
        }
    }
    get state() {
        return this.#state;
    }
    set state(state) {
        state = state ? true : false;
        if (this.#state != state) {
            this.#state = state;
            this.dispatchEvent(new CustomEvent('change', { detail: { oldState: this.#state, newState: state } }));
            this.#refresh();
        }
    }
    #refresh() {
        this.classList.remove('on', 'off');
        if (this.#state) {
            this.classList.add('on');
            if (this.#htmlSlotOn.assignedElements().length) {
                show(this.#htmlSlotOn);
                hide(this.#htmlSlotOff);
            }
        }
        else {
            this.classList.add('off');
            if (this.#htmlSlotOff.assignedElements().length) {
                hide(this.#htmlSlotOn);
                show(this.#htmlSlotOff);
            }
        }
    }
    #click() {
        this.state = !this.#state;
    }
    #initObserver() {
        const config = { childList: true, subtree: true };
        const mutationCallback = (mutationsList, observer) => {
            for (const mutation of mutationsList) {
                for (const addedNode of mutation.addedNodes) {
                    if (addedNode.parentNode == this) {
                        this.#refresh();
                    }
                }
            }
        };
        const observer = new MutationObserver(mutationCallback);
        observer.observe(this, config);
    }
    adoptStyleSheet(styleSheet) {
        this.#shadowRoot.adoptedStyleSheets.push(styleSheet);
    }
    static get observedAttributes() {
        return ['state'];
    }
}
let definedToggleButton = false;
function defineHarmonyToggleButton() {
    if (window.customElements && !definedToggleButton) {
        customElements.define('harmony-toggle-button', HTMLHarmonyToggleButtonElement);
        definedToggleButton = true;
        injectGlobalCss();
    }
}

var treeCSS = ":host {\n\t--child-margin: var(--harmony-tree-child-margin, 1rem);\n\t--header-bg-color: var(--harmony-tree-header-bg-color, var(--main-bg-color-dark, black));\n\t--selected-bg-color: var(--harmony-tree-selected-bg-color, var(--accent-primary, rgb(26, 172, 201)));\n\tcolor: var(--main-text-color-dark2, white);\n}\n\n.item {\n\twidth: 100%;\n}\n\n.header {\n\twidth: 100%;\n\theight: 1rem;\n\tbackground-color: var(--header-bg-color);\n\tcursor: pointer;\n\tdisplay: flex;\n\tgap: 0.2rem;\n\talign-items: center;\n}\n\n.childs {\n\tmargin-left: var(--child-margin);\n}\n\n.root>.header {\n\tdisplay: none;\n}\n\n.root>.childs {\n\tmargin-left: unset;\n}\n\n.actions{\n\tdisplay: flex;\n}\n\n.header.selected{\n\tbackground-color: var(--selected-bg-color);\n}\n";

class TreeItem {
    name;
    isRoot;
    icon;
    type;
    parent;
    childs = new Set;
    actions = new Set();
    userData;
    constructor(name, options = {}) {
        this.name = name;
        this.isRoot = options.isRoot;
        this.icon = options.icon;
        this.type = options.type ?? '';
        this.parent = options.parent;
        this.userData = options.userData;
        if (options.parent) {
            options.parent.addChild(this);
        }
        if (options.childs) {
            for (const child of options.childs) {
                this.addChild(child);
            }
        }
        this.#sortByName();
    }
    addChild(child) {
        this.childs.add(child);
    }
    #sortByName() {
        this.childs[Symbol.iterator] = function* () {
            yield* [...this.values()].sort((a, b) => {
                return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
            });
        };
    }
    getPath(separator = '/') {
        let path = '';
        if (this.parent) {
            const parentPath = this.parent.getPath(separator);
            if (parentPath) {
                path = parentPath + separator;
            }
        }
        path += this.name;
        return path;
    }
    getLevel() {
        if (this.parent) {
            return 1 + this.parent.getLevel();
        }
        return 0;
    }
    addAction(action) {
        this.actions.add(action);
    }
    addActions(actions) {
        for (const action of actions) {
            this.actions.add(action);
        }
    }
    removeAction(action) {
        this.actions.delete(action);
    }
    static createFromPathList(paths, options = {}) {
        class element {
            tree;
            childs = new Map();
            constructor(tree) {
                this.tree = tree;
            }
        }
        const root = new TreeItem('', { userData: options.userData, type: 'root' });
        const top = new element(root);
        for (const path of paths) {
            const segments = path.split(options.pathSeparator ?? '/');
            let current = top;
            let parent = root;
            for (let i = 0, l = segments.length; i < l; i++) {
                const s = segments[i];
                if (s == '') {
                    continue;
                }
                let type = 'directory';
                if (i == l - 1) {
                    type = 'file';
                }
                if (!current.childs.has(s)) {
                    current.childs.set(s, new element(new TreeItem(s, { parent: parent, type: type, userData: options.userData })));
                }
                parent = current.childs.get(s).tree;
                current = current.childs.get(s);
            }
        }
        return root;
    }
    #matchFilter(filter) {
        if (!filter) {
            return true;
        }
        if (filter.name) {
            if (!this.name.toLowerCase().includes(filter.name.toLowerCase())) {
                return false;
            }
            if (this.type != 'file') {
                return false;
            }
        }
        if (filter.types) {
            let match = false;
            for (const tf of filter.types) {
                if (tf === this.type) {
                    match = true;
                    break;
                }
            }
            if (!match) {
                return false;
            }
        }
        if (filter.type !== undefined) {
            if (filter.type !== this.type) {
                return false;
            }
        }
        return true;
    }
    *walk(filter) {
        let stack = [this];
        let current;
        do {
            current = stack.pop();
            if (!current) {
                break;
            }
            if (current.#matchFilter(filter)) {
                yield current;
            }
            for (let child of current.childs) {
                stack.push(child);
            }
        } while (current);
    }
}
class HTMLHarmonyTreeElement extends HTMLHarmonyElement {
    #shadowRoot;
    #root;
    #htmlContextMenu;
    #isInitialized = new Set();
    #isExpanded = new Map();
    #filter;
    #isVisible = new Set();
    #actions = new Map();
    /*
    #itemActions = new Map<TreeItem, HTMLElement>();
    #items = new Map<TreeItem, HTMLElement>();
    */
    #itemElements = new Map();
    #selectedItem = null;
    createElement() {
        this.#shadowRoot = this.attachShadow({ mode: 'closed' });
        shadowRootStyle(this.#shadowRoot, treeCSS);
        I18n.observeElement(this.#shadowRoot);
        this.#refresh();
    }
    adoptStyle(css) {
        this.initElement();
        shadowRootStyle(this.#shadowRoot, css);
    }
    #refresh() {
        if (!this.#shadowRoot) {
            return;
        }
        this.#shadowRoot.replaceChildren();
        if (!this.#root) {
            return;
        }
        this.#createItem(this.#root, this.#shadowRoot, true);
        this.#refreshFilter();
    }
    #refreshFilter() {
        for (const [item, itemElement] of this.#itemElements) {
            display(itemElement.element, !this.#filter || this.#isVisible.has(item));
        }
    }
    setRoot(root) {
        this.#root = root;
        if (this.#root) {
            this.#root.isRoot = true;
        }
        this.#refresh();
    }
    #buildContextMenu(contextMenu, x, y) {
        if (!this.#htmlContextMenu) {
            defineHarmonyMenu();
            this.#htmlContextMenu = createElement('harmony-menu');
        }
        this.#htmlContextMenu.showContextual(contextMenu, x, y);
    }
    #contextMenuHandler(event, item) {
        if (!event.shiftKey) {
            this.dispatchEvent(new CustomEvent('contextmenu', {
                detail: {
                    item: item,
                    buildContextMenu: (menu) => this.#buildContextMenu(menu, event.clientX, event.clientY),
                },
            }));
            event.preventDefault();
            event.stopPropagation();
        }
    }
    #createItem(item, parent, createExpanded) {
        let element;
        const itemElement = this.#itemElements.get(item);
        if (itemElement) {
            element = itemElement.element;
            parent.append(element);
        }
        else {
            let childs;
            let header;
            let actions;
            element = createElement('div', {
                class: `item level${item.getLevel()}`,
                parent: parent,
                childs: [
                    header = createElement('div', {
                        class: 'header',
                        childs: [
                            createElement('div', {
                                class: 'title',
                                innerText: item.name,
                            }),
                            actions = createElement('div', {
                                class: 'actions',
                            }),
                        ],
                        $click: () => {
                            if (this.#isExpanded.get(item)) {
                                this.collapseItem(item);
                            }
                            else {
                                this.expandItem(item);
                                this.#refreshFilter();
                            }
                            this.dispatchEvent(new CustomEvent('itemclick', { detail: { item: item } }));
                        },
                        $contextmenu: (event) => this.#contextMenuHandler(event, item),
                    }),
                    childs = createElement('div', {
                        class: 'childs',
                    }),
                ]
            });
            this.#itemElements.set(item, { element: element, header: header, childs: childs, actions: actions });
        }
        if (item.isRoot && item.name == '') {
            element.classList.add('root');
        }
        if (item.type) {
            element.classList.add(`type-${item.type}`);
        }
        if (createExpanded || this.#isExpanded.get(item)) {
            this.expandItem(item);
        }
        this.refreshActions(item);
        return element;
    }
    expandItem(item) {
        if (item.parent) {
            this.expandItem(item.parent);
        }
        const childs = this.#itemElements.get(item)?.childs;
        if (!childs || this.#isExpanded.get(item) === true) {
            return;
        }
        this.#isExpanded.set(item, true);
        show(childs);
        if (!this.#isInitialized.has(item)) {
            for (const child of item.childs) {
                this.#createItem(child, childs, false);
            }
            this.#isInitialized.add(item);
        }
    }
    collapseItem(item) {
        const childs = this.#itemElements.get(item)?.childs;
        if (!childs) {
            return;
        }
        this.#isExpanded.set(item, false);
        hide(childs);
    }
    selectItem(item, scrollIntoView = true) {
        if (item == this.#selectedItem) {
            return;
        }
        if (this.#selectedItem) {
            this.#itemElements.get(this.#selectedItem)?.header?.classList.remove('selected');
        }
        if (item) {
            if (item.parent) {
                this.expandItem(item.parent);
            }
            const itemElement = this.#itemElements.get(item)?.header;
            itemElement?.classList.add('selected');
            if (scrollIntoView) {
                setTimeout(() => {
                    itemElement?.scrollIntoView();
                }, 0);
            }
        }
        this.#selectedItem = item;
    }
    addAction(name, img, tooltip) {
        const action = {
            name: name,
            tooltip: tooltip,
        };
        if (typeof img == 'string') {
            action.innerHTML = img;
        }
        else {
            action.element = img;
        }
        this.#actions.set(name, action);
    }
    refreshActions(item) {
        const htmlActions = this.#itemElements.get(item)?.actions;
        htmlActions?.replaceChildren();
        for (const actionName of item.actions) {
            const action = this.#actions.get(actionName);
            if (action) {
                createElement('div', {
                    child: action.element,
                    innerHTML: action.innerHTML,
                    parent: htmlActions,
                    i18n: {
                        title: action.tooltip,
                    },
                    $click: (event) => this.#actionHandler(event, item, actionName),
                });
            }
        }
    }
    #actionHandler(event, item, action) {
        this.dispatchEvent(new CustomEvent('itemaction', {
            detail: {
                item: item,
                action: action,
            },
        }));
        event.preventDefault();
        event.stopPropagation();
    }
    setFilter(filter) {
        this.#filter = filter;
        this.#isVisible.clear();
        if (this.#filter && this.#root) {
            for (const item of this.#root.walk(this.#filter)) {
                let current = item;
                do {
                    if (current) {
                        this.#isVisible.add(current);
                    }
                    current = current.parent;
                } while (current);
            }
        }
        this.#refresh();
    }
    onAttributeChanged(name, oldValue, newValue) {
        switch (name) {
            case 'data-root':
                const root = JSON.parse(newValue);
                this.setRoot(root);
                break;
        }
    }
    static get observedAttributes() {
        return ['data-root'];
    }
}
let definedTree = false;
function defineHarmonyTree() {
    if (window.customElements && !definedTree) {
        customElements.define('harmony-tree', class extends HTMLHarmonyTreeElement {
        });
        customElements.define('h-tree', class extends HTMLHarmonyTreeElement {
        });
        definedTree = true;
        injectGlobalCss();
    }
}

export { AddI18nElement, HTMLHarmony2dManipulatorElement, HTMLHarmonyAccordionElement, HTMLHarmonyCircularProgressElement, HTMLHarmonyColorPickerElement, HTMLHarmonyCopyElement, HTMLHarmonyFileInputElement, HTMLHarmonyItemElement, HTMLHarmonyLabelPropertyElement, HTMLHarmonyMenuElement, HTMLHarmonyPaletteElement, HTMLHarmonyPanelElement, HTMLHarmonyRadioElement, HTMLHarmonySelectElement, HTMLHarmonySliderElement, HTMLHarmonySlideshowElement, HTMLHarmonySplitterElement, HTMLHarmonySwitchElement, HTMLHarmonyTabElement, HTMLHarmonyTabGroupElement, HTMLHarmonyToggleButtonElement, HTMLHarmonyTooltipElement, HTMLHarmonyTreeElement, I18n, I18nElements, I18nEvents, ManipulatorCorner, ManipulatorDirection, ManipulatorResizeOrigin, ManipulatorSide, ManipulatorUpdatedEventType, TreeItem, cloneEvent, createElement, createElementNS, createShadowRoot, defineHarmony2dManipulator, defineHarmonyAccordion, defineHarmonyCircularProgress, defineHarmonyColorPicker, defineHarmonyCopy, defineHarmonyFileInput, defineHarmonyItem, defineHarmonyLabelProperty, defineHarmonyMenu, defineHarmonyPalette, defineHarmonyPanel, defineHarmonyRadio, defineHarmonySelect, defineHarmonySlider, defineHarmonySlideshow, defineHarmonySplitter, defineHarmonySwitch, defineHarmonyTab, defineHarmonyTabGroup, defineHarmonyToggleButton, defineHarmonyTooltip, defineHarmonyTree, display, documentStyle, documentStyleSync, hide, isVisible, shadowRootStyle, shadowRootStyleSync, show, styleInject, toggle, updateElement, visible };
