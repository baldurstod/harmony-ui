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

function rgbToHsl(r, g, b) {
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s, l = (max + min) / 2;
    if (max == min) {
        h = s = 0; // achromatic
    }
    else {
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / d + 2;
                break;
            case b:
                h = (r - g) / d + 4;
                break;
        }
        h /= 6;
    }
    return [h, s, l];
}
function hslToRgb(h, s, l) {
    var r, g, b;
    if (s == 0) {
        r = g = b = l; // achromatic
    }
    else {
        function hue2rgb(p, q, t) {
            if (t < 0)
                t += 1;
            if (t > 1)
                t -= 1;
            if (t < 1 / 6)
                return p + (q - p) * 6 * t;
            if (t < 1 / 2)
                return q;
            if (t < 2 / 3)
                return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        }
        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }
    return [r, g, b];
}
class Color {
    #rgba = [];
    constructor({ red = 0, green = 0, blue = 0, alpha = 1, hex = '' } = {}) {
        this.#rgba[0] = red;
        this.#rgba[1] = green;
        this.#rgba[2] = blue;
        this.#rgba[3] = alpha;
        if (hex) {
            this.setHex(hex);
        }
    }
    setHue(hue) {
        const hsl = rgbToHsl(this.#rgba[0], this.#rgba[1], this.#rgba[2]);
        const rgb = hslToRgb(hue, hsl[1], hsl[2]);
        this.#rgba[0] = rgb[0];
        this.#rgba[1] = rgb[1];
        this.#rgba[2] = rgb[2];
    }
    setSatLum(sat, lum) {
        const hsl = rgbToHsl(this.#rgba[0], this.#rgba[1], this.#rgba[2]);
        const rgb = hslToRgb(hsl[0], sat, lum);
        this.#rgba[0] = rgb[0];
        this.#rgba[1] = rgb[1];
        this.#rgba[2] = rgb[2];
    }
    setHex(hex) {
        hex = (hex.startsWith('#') ? hex.slice(1) : hex)
            .replace(/^(\w{3})$/, '$1F') //987      -> 987F
            .replace(/^(\w)(\w)(\w)(\w)$/, '$1$1$2$2$3$3$4$4') //9876     -> 99887766
            .replace(/^(\w{6})$/, '$1FF'); //987654   -> 987654FF
        if (!hex.match(/^([0-9a-fA-F]{8})$/)) {
            throw new Error('Unknown hex color; ' + hex);
        }
        const rgba = hex
            .match(/^(\w\w)(\w\w)(\w\w)(\w\w)$/)?.slice(1) //98765432 -> 98 76 54 32
            .map(x => parseInt(x, 16)); //Hex to decimal
        if (rgba) {
            this.#rgba[0] = rgba[0] / 255;
            this.#rgba[1] = rgba[1] / 255;
            this.#rgba[2] = rgba[2] / 255;
            this.#rgba[3] = rgba[3] / 255;
        }
    }
    getHex() {
        const hex = this.#rgba.map(x => Math.round(x * 255).toString(16));
        return '#' + hex.map(x => x.padStart(2, '0')).join('');
    }
    getHue() {
        return rgbToHsl(this.#rgba[0], this.#rgba[1], this.#rgba[2])[0];
    }
    getHsl() {
        return rgbToHsl(this.#rgba[0], this.#rgba[1], this.#rgba[2]);
    }
    getRgba() {
        return this.#rgba;
    }
    set red(red) {
        this.#rgba[0] = red;
    }
    get red() {
        return this.#rgba[0];
    }
    set green(green) {
        this.#rgba[1] = green;
    }
    get green() {
        return this.#rgba[1];
    }
    set blue(blue) {
        this.#rgba[2] = blue;
    }
    get blue() {
        return this.#rgba[2];
    }
    set alpha(alpha) {
        this.#rgba[3] = alpha;
    }
    get alpha() {
        return this.#rgba[3];
    }
    getLuminance() {
        return 0.2126 * this.#rgba[0] + 0.7152 * this.#rgba[1] + 0.0722 * this.#rgba[2];
    }
}

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

const arrowDownwardAltSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M480-240 240-480l56-56 144 144v-368h80v368l144-144 56 56-240 240Z"/></svg>';

const arrowLeftAltSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M400-240 160-480l240-240 56 58-142 142h486v80H314l142 142-56 58Z"/></svg>';

const arrowRightAltSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="m560-240-56-58 142-142H160v-80h486L504-662l56-58 240 240-240 240Z"/></svg>';

const arrowUpwardAltSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M440-240v-368L296-464l-56-56 240-240 240 240-56 56-144-144v368h-80Z"/></svg>';

const bookmarksPlainSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M120-40v-640q0-33 23.5-56.5T200-760h400q33 0 56.5 23.5T680-680v640L400-160 120-40Zm640-120v-680H240v-80h520q33 0 56.5 23.5T840-840v680h-80Z"/></svg>';

const borderClearSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M120-120v-80h80v80h-80Zm0-160v-80h80v80h-80Zm0-160v-80h80v80h-80Zm0-160v-80h80v80h-80Zm0-160v-80h80v80h-80Zm160 640v-80h80v80h-80Zm0-320v-80h80v80h-80Zm0-320v-80h80v80h-80Zm160 640v-80h80v80h-80Zm0-160v-80h80v80h-80Zm0-160v-80h80v80h-80Zm0-160v-80h80v80h-80Zm0-160v-80h80v80h-80Zm160 640v-80h80v80h-80Zm0-320v-80h80v80h-80Zm0-320v-80h80v80h-80Zm160 640v-80h80v80h-80Zm0-160v-80h80v80h-80Zm0-160v-80h80v80h-80Zm0-160v-80h80v80h-80Zm0-160v-80h80v80h-80Z"/></svg>';

const brickLayoutSVG = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" stroke="currentColor" viewBox="0 -960 960 960"><path d="M1272.376 37.904h368.25v185.269h-368.25zM784.125 37.904h368.25v185.269h-368.25ZM295.875 37.904h368.25v185.269h-368.25Z" style="fill:none;stroke-width:69.3655;stroke-linecap:round;stroke-linejoin:round" transform="matrix(.59923 0 0 .61654 -100.204 -372.272)"/><path d="M1272.376-267.365h368.25v185.269h-368.25zM784.125-267.365h368.25v185.269h-368.25Z" style="fill:none;stroke-width:69.3655;stroke-linecap:round;stroke-linejoin:round" transform="matrix(.59923 0 0 .61654 -246.491 -372.272)"/><path d="M1272.376-572.635h368.25v185.27h-368.25zM784.125-572.635h368.25v185.27h-368.25ZM295.875-572.635h368.25v185.27h-368.25Z" style="fill:none;stroke-width:69.3655;stroke-linecap:round;stroke-linejoin:round" transform="matrix(.59923 0 0 .61654 -100.204 -372.272)"/></svg>';

const bugReportSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M480-200q66 0 113-47t47-113v-160q0-66-47-113t-113-47q-66 0-113 47t-47 113v160q0 66 47 113t113 47Zm-80-120h160v-80H400v80Zm0-160h160v-80H400v80Zm80 40Zm0 320q-65 0-120.5-32T272-240H160v-80h84q-3-20-3.5-40t-.5-40h-80v-80h80q0-20 .5-40t3.5-40h-84v-80h112q14-23 31.5-43t40.5-35l-64-66 56-56 86 86q28-9 57-9t57 9l88-86 56 56-66 66q23 15 41.5 34.5T688-640h112v80h-84q3 20 3.5 40t.5 40h80v80h-80q0 20-.5 40t-3.5 40h84v80H688q-32 56-87.5 88T480-120Z"/></svg>';

const checkSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/></svg>';

const checkCircleSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m424-296 282-282-56-56-226 226-114-114-56 56 170 170Zm56 216q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/></svg>';

const checkOutlineSVG = '<svg xmlns="http://www.w3.org/2000/svg"  height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="m 381,-240 424,-424 -57,-56 -368,367 -169,-170 -57,57 z m 0,113 -339,-339 169,-170 170,170 366,-367 172,168 z"/><path fill="#ffffff" d="m 381,-240 424,-424 -57,-56 -368,367 -169,-170 -57,57 z m 366,-593 c -498,-84.66667 -249,-42.33333 0,0 z"/></svg>';

const closeSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>';

const contentCopySVG = '<svg height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-560h80v560h440v80H200Zm160-240v-480 480Z"/></svg>';

const cropPortraitSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M720-80H240q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h480q33 0 56.5 23.5T800-800v640q0 33-23.5 56.5T720-80Zm-480-80h480v-640H240v640Zm0 0v-640 640Z"/></svg>';

const cycleSVG = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 512 477.853" fill="currentColor"><path d="M68.269,170.663c37.7,0,68.269,30.563,68.269,68.269c0,21.579-10.011,40.821-25.643,53.326 c21.548,65.568,81.742,113.632,153.643,117.348c0,26.458,10.952,50.373,28.573,67.426l-20.042,0.821 c-110.053,0-202.727-74.395-230.463-175.637C17.621,292.068,0,267.563,0,238.932C0,201.227,30.568,170.663,68.269,170.663z M349.868,0c37.705,0,68.279,30.563,68.279,68.263c0,37.706-30.574,68.269-68.279,68.269c-37.631,0-68.147-30.452-68.273-68.058 c-2.821-0.137-5.663-0.211-8.526-0.211c-66.3,0-123.769,37.806-152.026,93.032c-15.037-10.242-33.205-16.231-52.773-16.231 l-15.531,1.278C88.91,60.368,173.937,0,273.068,0c17.273,0,34.116,1.832,50.348,5.311C331.553,1.89,340.489,0,349.868,0z M358.395,341.332c15.074,0,28.989,4.884,40.284,13.137c27.974-30.4,45.068-70.969,45.068-115.537 c0-37.284-11.958-71.779-32.258-99.858c18.974-16.516,31.227-40.531,32.195-67.421C485.937,114.753,512,173.8,512,238.932 c0,74.095-33.727,140.315-86.652,184.142c-6.253,31.242-33.858,54.779-66.953,54.779c-37.694,0-68.252-30.547-68.252-68.247 C290.143,371.9,320.7,341.332,358.395,341.332z"></path></svg>';

const dangerousSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M330-120 120-330v-300l210-210h300l210 210v300L630-120H330Zm36-190 114-114 114 114 56-56-114-114 114-114-56-56-114 114-114-114-56 56 114 114-114 114 56 56Zm-2 110h232l164-164v-232L596-760H364L200-596v232l164 164Zm116-280Z"/></svg>';

const dashboardSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M520-600v-240h320v240H520ZM120-440v-400h320v400H120Zm400 320v-400h320v400H520Zm-400 0v-240h320v240H120Zm80-400h160v-240H200v240Zm400 320h160v-240H600v240Zm0-480h160v-80H600v80ZM200-200h160v-80H200v80Zm160-320Zm240-160Zm0 240ZM360-280Z"/></svg>';

const downloadSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z"/></svg>';

const dragPanSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M480-80 310-250l57-57 73 73v-206H235l73 72-58 58L80-480l169-169 57 57-72 72h206v-206l-73 73-57-57 170-170 170 170-57 57-73-73v206h205l-73-72 58-58 170 170-170 170-57-57 73-73H520v205l72-73 58 58L480-80Z"/></svg>';

const errorSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M480-280q17 0 28.5-11.5T520-320q0-17-11.5-28.5T480-360q-17 0-28.5 11.5T440-320q0 17 11.5 28.5T480-280Zm-40-160h80v-240h-80v240Zm40 360q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/></svg>';

const favoriteSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="m480-120-58-52q-101-91-167-157T150-447.5Q111-500 95.5-544T80-634q0-94 63-157t157-63q52 0 99 22t81 62q34-40 81-62t99-22q94 0 157 63t63 157q0 46-15.5 90T810-447.5Q771-395 705-329T538-172l-58 52Zm0-108q96-86 158-147.5t98-107q36-45.5 50-81t14-70.5q0-60-40-100t-100-40q-47 0-87 26.5T518-680h-76q-15-41-55-67.5T300-774q-60 0-100 40t-40 100q0 35 14 70.5t50 81q36 45.5 98 107T480-228Zm0-273Z"/></svg>';

const fileExportSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M480-480ZM202-65l-56-57 118-118h-90v-80h226v226h-80v-89L202-65Zm278-15v-80h240v-440H520v-200H240v400h-80v-400q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T720-80H480Z"/></svg>';

const fireSVG = '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 512 682.562" fill="currentColor"><path d="M304,0c0,0,23.688,84.805,23.688,153.602c0,65.922-43.219,119.523-109.289,119.523c-66.078,0-116-53.445-116-119.523 l0.805-11.523C38.883,219.047,0,318.242,0,426.562c0,141.438,114.562,256,256,256s256-114.562,256-256 C512,253.922,428.969,100,304,0z M246.719,586.562c-56.961,0-103.195-44.969-103.195-100.484c0-52,33.438-88.484,90.078-99.828 c56.648-11.375,115.195-38.57,147.68-82.406c12.469,41.281,19.031,84.797,19.031,129.125 C400.312,517.594,331.531,586.562,246.719,586.562z"></path></svg>';

const flexWrapSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M40-80v-360h240v360H40Zm320 0v-360h240v360H360Zm320 0v-360h240v360H680Zm-240-80h80v-200h-80v200ZM40-520v-360h240v360H40Zm320 0v-360h240v360H360Zm320 0v-360h240v360H680Zm-560-80h80v-200h-80v200Zm640 0h80v-200h-80v200Z"/></svg>';

const folderSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640v400q0 33-23.5 56.5T800-160H160Zm0-80h640v-400H447l-80-80H160v480Zm0 0v-480 480Z"/></svg>';

const folderOpenSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640H447l-80-80H160v480l96-320h684L837-217q-8 26-29.5 41.5T760-160H160Zm84-80h516l72-240H316l-72 240Zm0 0 72-240-72 240Zm-84-400v-80 80Z"/></svg>';

const gridOffSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M333-200v-133H200v133h133Zm214 0v-100l-33-33H413v133h134Zm80 0Zm116-133Zm-410-80v-101l-33-33H200v134h133Zm80 0Zm347 0v-134H627v99l35 35h98ZM529-547Zm-329-80Zm347 0v-133H413v98l35 35h99Zm213 0v-133H627v133h133ZM316-760Zm524 525L235-840h525q33 0 56.5 23.5T840-760v525ZM200-120q-33 0-56.5-23.5T120-200v-640l720 720H200Zm619 92L28-820l56-56L876-84l-57 56Z"/></svg>';

const gridOffsetSVG = '<svg width="24px" height="24px" stroke="currentColor" version="1.1" viewBox="0 -960 960 960" xmlns="http://www.w3.org/2000/svg"><g transform="matrix(1.0998 0 0 1.0998 -38.889 15.241)" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="60"><path transform="matrix(.8 0 0 .8 -186.23 -228.45)" d="m1053.8-392h222.51v229.41h-222.51z"/><path transform="matrix(.8 0 0 .8 -186.23 -228.45)" d="m711.26-217.29h222.51v229.41h-222.51z"/><path transform="matrix(.8 0 0 .8 -186.23 -228.45)" d="m368.74-392h222.51v229.41h-222.51z"/><path transform="matrix(.8 0 0 .8 -186.23 -228.45)" d="m711.26-566.71h222.51v229.41h-222.51z"/></g></svg>';

const gridOnSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h133v-133H200v133Zm213 0h134v-133H413v133Zm214 0h133v-133H627v133ZM200-413h133v-134H200v134Zm213 0h134v-134H413v134Zm214 0h133v-134H627v134ZM200-627h133v-133H200v133Zm213 0h134v-133H413v133Zm214 0h133v-133H627v133Z"/></svg>';

const gridRegularSVG = '<svg width="24px" height="24px" stroke="currentColor" version="1.1" viewBox="0 -960 960 960" xmlns="http://www.w3.org/2000/svg"><path transform="translate(5.3038 -39.975)" x="136.55508" y="-786.79065" width="278.14114" height="286.76569" d="m136.56-786.79h278.14v286.77h-278.14zm398.14 0h278.14v286.77h-278.14zm-398.14 406.77h278.14v286.77h-278.14zm398.14 0h278.14v286.77h-278.14z" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="60"/></svg>';

const helpSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M478-240q21 0 35.5-14.5T528-290q0-21-14.5-35.5T478-340q-21 0-35.5 14.5T428-290q0 21 14.5 35.5T478-240Zm-36-154h74q0-33 7.5-52t42.5-52q26-26 41-49.5t15-56.5q0-56-41-86t-97-30q-57 0-92.5 30T342-618l66 26q5-18 22.5-39t53.5-21q32 0 48 17.5t16 38.5q0 20-12 37.5T506-526q-44 39-54 59t-10 73Zm38 314q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/></svg>';

const infoSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M440-280h80v-240h-80v240Zm40-320q17 0 28.5-11.5T520-640q0-17-11.5-28.5T480-680q-17 0-28.5 11.5T440-640q0 17 11.5 28.5T480-600Zm0 520q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/></svg>';

const lapsSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m360-120-57-56 64-64h-7q-117 0-198.5-81.5T80-520q0-117 81.5-198.5T360-800h240q117 0 198.5 81.5T880-520q0 117-81.5 198.5T600-240v-80q83 0 141.5-58.5T800-520q0-83-58.5-141.5T600-720H360q-83 0-141.5 58.5T160-520q0 83 58.5 142.5T360-312h16l-72-72 56-56 160 160-160 160Z"/></svg>';

const lockSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M240-80q-33 0-56.5-23.5T160-160v-400q0-33 23.5-56.5T240-640h40v-80q0-83 58.5-141.5T480-920q83 0 141.5 58.5T680-720v80h40q33 0 56.5 23.5T800-560v400q0 33-23.5 56.5T720-80H240Zm0-80h480v-400H240v400Zm240-120q33 0 56.5-23.5T560-360q0-33-23.5-56.5T480-440q-33 0-56.5 23.5T400-360q0 33 23.5 56.5T480-280ZM360-640h240v-80q0-50-35-85t-85-35q-50 0-85 35t-35 85v80ZM240-160v-400 400Z"/></svg>';

const lockOpenSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M240-640h360v-80q0-50-35-85t-85-35q-50 0-85 35t-35 85h-80q0-83 58.5-141.5T480-920q83 0 141.5 58.5T680-720v80h40q33 0 56.5 23.5T800-560v400q0 33-23.5 56.5T720-80H240q-33 0-56.5-23.5T160-160v-400q0-33 23.5-56.5T240-640Zm0 480h480v-400H240v400Zm240-120q33 0 56.5-23.5T560-360q0-33-23.5-56.5T480-440q-33 0-56.5 23.5T400-360q0 33 23.5 56.5T480-280ZM240-160v-400 400Z"/></svg>';

const lockOpenRightSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M240-160h480v-400H240v400Zm240-120q33 0 56.5-23.5T560-360q0-33-23.5-56.5T480-440q-33 0-56.5 23.5T400-360q0 33 23.5 56.5T480-280ZM240-160v-400 400Zm0 80q-33 0-56.5-23.5T160-160v-400q0-33 23.5-56.5T240-640h280v-80q0-83 58.5-141.5T720-920q83 0 141.5 58.5T920-720h-80q0-50-35-85t-85-35q-50 0-85 35t-35 85v80h120q33 0 56.5 23.5T800-560v400q0 33-23.5 56.5T720-80H240Z"/></svg>';

const mailSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm320-280L160-640v400h640v-400L480-440Zm0-80 320-200H160l320 200ZM160-640v-80 480-400Z"/></svg>';

const manageAccountsSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M400-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM80-160v-112q0-33 17-62t47-44q51-26 115-44t141-18h14q6 0 12 2-8 18-13.5 37.5T404-360h-4q-71 0-127.5 18T180-306q-9 5-14.5 14t-5.5 20v32h252q6 21 16 41.5t22 38.5H80Zm560 40-12-60q-12-5-22.5-10.5T584-204l-58 18-40-68 46-40q-2-14-2-26t2-26l-46-40 40-68 58 18q11-8 21.5-13.5T628-460l12-60h80l12 60q12 5 22.5 11t21.5 15l58-20 40 70-46 40q2 12 2 25t-2 25l46 40-40 68-58-18q-11 8-21.5 13.5T732-180l-12 60h-80Zm40-120q33 0 56.5-23.5T760-320q0-33-23.5-56.5T680-400q-33 0-56.5 23.5T600-320q0 33 23.5 56.5T680-240ZM400-560q33 0 56.5-23.5T480-640q0-33-23.5-56.5T400-720q-33 0-56.5 23.5T320-640q0 33 23.5 56.5T400-560Zm0-80Zm12 400Z"/></svg>';

const manufacturingSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="m234-480-12-60q-12-5-22.5-10.5T178-564l-58 18-40-68 46-40q-2-13-2-26t2-26l-46-40 40-68 58 18q11-8 21.5-13.5T222-820l12-60h80l12 60q12 5 22.5 10.5T370-796l58-18 40 68-46 40q2 13 2 26t-2 26l46 40-40 68-58-18q-11 8-21.5 13.5T326-540l-12 60h-80Zm40-120q33 0 56.5-23.5T354-680q0-33-23.5-56.5T274-760q-33 0-56.5 23.5T194-680q0 33 23.5 56.5T274-600ZM592-40l-18-84q-17-6-31.5-14.5T514-158l-80 26-56-96 64-56q-2-18-2-36t2-36l-64-56 56-96 80 26q14-11 28.5-19.5T574-516l18-84h112l18 84q17 6 31.5 14.5T782-482l80-26 56 96-64 56q2 18 2 36t-2 36l64 56-56 96-80-26q-14 11-28.5 19.5T722-124l-18 84H592Zm56-160q50 0 85-35t35-85q0-50-35-85t-85-35q-50 0-85 35t-35 85q0 50 35 85t85 35Z"/></svg>';

const moreHorizSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M240-400q-33 0-56.5-23.5T160-480q0-33 23.5-56.5T240-560q33 0 56.5 23.5T320-480q0 33-23.5 56.5T240-400Zm240 0q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm240 0q-33 0-56.5-23.5T640-480q0-33 23.5-56.5T720-560q33 0 56.5 23.5T800-480q0 33-23.5 56.5T720-400Z"/></svg>';

const openInNewSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h280v80H200v560h560v-280h80v280q0 33-23.5 56.5T760-120H200Zm188-212-56-56 372-372H560v-80h280v280h-80v-144L388-332Z"/></svg>';

const openWithSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M480-80 310-250l57-57 73 73v-166h80v165l72-73 58 58L480-80ZM250-310 80-480l169-169 57 57-72 72h166v80H235l73 72-58 58Zm460 0-57-57 73-73H560v-80h165l-73-72 58-58 170 170-170 170ZM440-560v-166l-73 73-57-57 170-170 170 170-57 57-73-73v166h-80Z"/></svg>';

const overscanSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M280-400v-160l-80 80 80 80Zm200 120 80-80H400l80 80Zm-80-320h160l-80-80-80 80Zm280 200 80-80-80-80v160ZM160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm0-80h640v-480H160v480Zm0 0v-480 480Z"/></svg>';

const panZoomSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M120-120v-240h80v104l124-124 56 56-124 124h104v80H120Zm516-460-56-56 124-124H600v-80h240v240h-80v-104L636-580Z"/></svg>';

const patreonLogoSVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M1033.05,324.45c-0.19-137.9-107.59-250.92-233.6-291.7c-156.48-50.64-362.86-43.3-512.28,27.2  C106.07,145.41,49.18,332.61,47.06,519.31c-1.74,153.5,13.58,557.79,241.62,560.67c169.44,2.15,194.67-216.18,273.07-321.33  c55.78-74.81,127.6-95.94,216.01-117.82C929.71,603.22,1033.27,483.3,1033.05,324.45z"/></svg>';

const pauseSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M560-200v-560h160v560H560Zm-320 0v-560h160v560H240Z"/></svg>';

const personSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v112H160Zm80-80h480v-32q0-11-5.5-20T700-306q-54-27-109-40.5T480-360q-56 0-111 13.5T260-306q-9 5-14.5 14t-5.5 20v32Zm240-320q33 0 56.5-23.5T560-640q0-33-23.5-56.5T480-720q-33 0-56.5 23.5T400-640q0 33 23.5 56.5T480-560Zm0-80Zm0 400Z"/></svg>';

const photoCameraSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M480-260q75 0 127.5-52.5T660-440q0-75-52.5-127.5T480-620q-75 0-127.5 52.5T300-440q0 75 52.5 127.5T480-260Zm0-80q-42 0-71-29t-29-71q0-42 29-71t71-29q42 0 71 29t29 71q0 42-29 71t-71 29ZM160-120q-33 0-56.5-23.5T80-200v-480q0-33 23.5-56.5T160-760h126l74-80h240l74 80h126q33 0 56.5 23.5T880-680v480q0 33-23.5 56.5T800-120H160Z"/></svg>';

const playSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M320-200v-560l440 280-440 280Z"/></svg>';

const playlistAddSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M120-320v-80h280v80H120Zm0-160v-80h440v80H120Zm0-160v-80h440v80H120Zm520 480v-160H480v-80h160v-160h80v160h160v80H720v160h-80Z"/></svg>';

const print3dSVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"height="24" width="24" fill="currentColor"><path d="M19,6A1,1 0 0,0 20,5A1,1 0 0,0 19,4A1,1 0 0,0 18,5A1,1 0 0,0 19,6M19,2A3,3 0 0,1 22,5V11H18V7H6V11H2V5A3,3 0 0,1 5,2H19M18,18.25C18,18.63 17.79,18.96 17.47,19.13L12.57,21.82C12.4,21.94 12.21,22 12,22C11.79,22 11.59,21.94 11.43,21.82L6.53,19.13C6.21,18.96 6,18.63 6,18.25V13C6,12.62 6.21,12.29 6.53,12.12L11.43,9.68C11.59,9.56 11.79,9.5 12,9.5C12.21,9.5 12.4,9.56 12.57,9.68L17.47,12.12C17.79,12.29 18,12.62 18,13V18.25M12,11.65L9.04,13L12,14.6L14.96,13L12,11.65M8,17.66L11,19.29V16.33L8,14.71V17.66M16,17.66V14.71L13,16.33V19.29L16,17.66Z" /></svg>';

const questionMarkSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M424-320q0-81 14.5-116.5T500-514q41-36 62.5-62.5T584-637q0-41-27.5-68T480-732q-51 0-77.5 31T365-638l-103-44q21-64 77-111t141-47q105 0 161.5 58.5T698-641q0 50-21.5 85.5T609-475q-49 47-59.5 71.5T539-320H424Zm56 240q-33 0-56.5-23.5T400-160q0-33 23.5-56.5T480-240q33 0 56.5 23.5T560-160q0 33-23.5 56.5T480-80Z"/></svg>';

const repeatSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentcolor"><path d="M280-80 120-240l160-160 56 58-62 62h406v-160h80v240H274l62 62-56 58Zm-80-440v-240h486l-62-62 56-58 160 160-160 160-56-58 62-62H280v160h-80Z"/></svg>';

const repeatOnSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentcolor"><path d="M120-40q-33 0-56.5-23.5T40-120v-720q0-33 23.5-56.5T120-920h720q33 0 56.5 23.5T920-840v720q0 33-23.5 56.5T840-40H120Zm160-40 56-58-62-62h486v-240h-80v160H274l62-62-56-58-160 160L280-80Zm-80-440h80v-160h406l-62 62 56 58 160-160-160-160-56 58 62 62H200v240Z"/></svg>';

const repeatOneSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentcolor"><path d="M460-360v-180h-60v-60h120v240h-60ZM280-80 120-240l160-160 56 58-62 62h406v-160h80v240H274l62 62-56 58Zm-80-440v-240h486l-62-62 56-58 160 160-160 160-56-58 62-62H280v160h-80Z"/></svg>';

const repeatOneOnSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentcolor"><path d="M120-40q-33 0-56.5-23.5T40-120v-720q0-33 23.5-56.5T120-920h720q33 0 56.5 23.5T920-840v720q0 33-23.5 56.5T840-40H120Zm160-40 56-58-62-62h486v-240h-80v160H274l62-62-56-58-160 160L280-80Zm-80-440h80v-160h406l-62 62 56 58 160-160-160-160-56 58 62 62H200v240Zm260 160h60v-240H400v60h60v180Z"/></svg>';

const restartSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M440-122q-121-15-200.5-105.5T160-440q0-66 26-126.5T260-672l57 57q-38 34-57.5 79T240-440q0 88 56 155.5T440-202v80Zm80 0v-80q87-16 143.5-83T720-440q0-100-70-170t-170-70h-3l44 44-56 56-140-140 140-140 56 56-44 44h3q134 0 227 93t93 227q0 121-79.5 211.5T520-122Z"/></svg>';

const rotateSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M482-160q-134 0-228-93t-94-227v-7l-64 64-56-56 160-160 160 160-56 56-64-64v7q0 100 70.5 170T482-240q26 0 51-6t49-18l60 60q-38 22-78 33t-82 11Zm278-161L600-481l56-56 64 64v-7q0-100-70.5-170T478-720q-26 0-51 6t-49 18l-60-60q38-22 78-33t82-11q134 0 228 93t94 227v7l64-64 56 56-160 160Z"/></svg>';

const rotate360SVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m360-160-56-56 70-72q-128-17-211-70T80-480q0-83 115.5-141.5T480-680q169 0 284.5 58.5T880-480q0 62-66.5 111T640-296v-82q77-20 118.5-49.5T800-480q0-32-85.5-76T480-600q-149 0-234.5 44T160-480q0 24 51 57.5T356-372l-52-52 56-56 160 160-160 160Z"/></svg>';

const rotateLeftSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M440-80q-50-5-96-24.5T256-156l56-58q29 21 61.5 34t66.5 18v82Zm80 0v-82q104-15 172-93.5T760-438q0-117-81.5-198.5T480-718h-8l64 64-56 56-160-160 160-160 56 58-62 62h6q75 0 140.5 28.5t114 77q48.5 48.5 77 114T840-438q0 137-91 238.5T520-80ZM198-214q-32-42-51.5-88T122-398h82q5 34 18 66.5t34 61.5l-58 56Zm-76-264q6-51 25-98t51-86l58 56q-21 29-34 61.5T204-478h-82Z"/></svg>';

const rotateRightSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M522-80v-82q34-5 66.5-18t61.5-34l56 58q-42 32-88 51.5T522-80Zm-80 0Q304-98 213-199.5T122-438q0-75 28.5-140.5t77-114q48.5-48.5 114-77T482-798h6l-62-62 56-58 160 160-160 160-56-56 64-64h-8q-117 0-198.5 81.5T202-438q0 104 68 182.5T442-162v82Zm322-134-58-56q21-29 34-61.5t18-66.5h82q-5 50-24.5 96T764-214Zm76-264h-82q-5-34-18-66.5T706-606l58-56q32 39 51 86t25 98Z"/></svg>';

const runSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px"  fill="currentColor"><path d="M520-40v-240l-84-80-40 176-276-56 16-80 192 40 64-324-72 28v136h-80v-188l158-68q35-15 51.5-19.5T480-720q21 0 39 11t29 29l40 64q26 42 70.5 69T760-520v80q-66 0-123.5-27.5T540-540l-24 120 84 80v300h-80Zm20-700q-33 0-56.5-23.5T460-820q0-33 23.5-56.5T540-900q33 0 56.5 23.5T620-820q0 33-23.5 56.5T540-740Z"/></svg>';

const sentimentExcitedSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M320-480v80q0 66 47 113t113 47q66 0 113-47t47-113v-80H320Zm160 180q-42 0-71-29t-29-71v-20h200v20q0 42-29 71t-71 29ZM340-680q-38 0-67.5 27.5T231-577l58 14q6-26 20-41.5t31-15.5q17 0 31 15.5t20 41.5l58-14q-12-48-41.5-75.5T340-680Zm280 0q-38 0-67.5 27.5T511-577l58 14q6-26 20-41.5t31-15.5q17 0 31 15.5t20 41.5l58-14q-12-48-41.5-75.5T620-680ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z"/></svg>';

const settingsSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="m370-80-16-128q-13-5-24.5-12T307-235l-119 50L78-375l103-78q-1-7-1-13.5v-27q0-6.5 1-13.5L78-585l110-190 119 50q11-8 23-15t24-12l16-128h220l16 128q13 5 24.5 12t22.5 15l119-50 110 190-103 78q1 7 1 13.5v27q0 6.5-2 13.5l103 78-110 190-118-50q-11 8-23 15t-24 12L590-80H370Zm112-260q58 0 99-41t41-99q0-58-41-99t-99-41q-59 0-99.5 41T342-480q0 58 40.5 99t99.5 41Z"/></svg>';

const sfmLogoSVG = '<svg xmlns:svg="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 1032.4293 876.705" fill="currentColor"><g transform="translate(-8.39062,-169.65234)"><circle cx="446.37213" cy="396.92026" r="88"/><circle cx="240.51529" cy="535.80176" r="88"/><circle cx="574.89032" cy="780.79077" r="88"/><circle cx="318.33252" cy="780.80878" r="88"/><circle cx="652.69293" cy="535.88745" r="88"/><circle cx="446.67859" cy="608.25507" r="49.263958" /><path d="m 900.06641,169.65234 -453.75196,0.36524 c -241.39522,0 -437.92382,196.66566 -437.92383,438.16992 0,241.50426 196.52861,438.1699 437.92383,438.1699 175.89612,0 328.97933,-103.66237 398.55499,-253.76264 L 1033.4824,353.14369 c 8.3473,-19.44831 7.2949,-33.96174 7.2949,-45.30971 0,-80.3554 -63.45512,-138.18164 -140.71089,-138.18164 z M 880.57227,227.875 c 50.71383,0 91.12304,40.42218 91.12304,91.20117 0,50.77899 -40.40921,91.20117 -91.12304,91.20117 -50.71384,0 -91.125,-40.42218 -91.125,-91.20117 0,-50.77899 40.41116,-91.20117 91.125,-91.20117 z m -434.25782,22.63281 c 197.86831,0 357.4336,159.64852 357.4336,357.67969 0,198.03117 -159.56529,357.67969 -357.4336,357.67969 -197.86831,0 -357.433591,-159.64852 -357.433591,-357.67969 0,-198.03117 159.565281,-357.67969 357.433591,-357.67969 z"/></g></svg>';

const shareSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M720-80q-50 0-85-35t-35-85q0-7 1-14.5t3-13.5L322-392q-17 15-38 23.5t-44 8.5q-50 0-85-35t-35-85q0-50 35-85t85-35q23 0 44 8.5t38 23.5l282-164q-2-6-3-13.5t-1-14.5q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35q-23 0-44-8.5T638-672L356-508q2 6 3 13.5t1 14.5q0 7-1 14.5t-3 13.5l282 164q17-15 38-23.5t44-8.5q50 0 85 35t35 85q0 50-35 85t-85 35Z"/></svg>';

const shoppingCartSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path fill="currentColor" d="M 286.788,-81 C 266.92933,-81 250,-88.070667 236,-102.212 c -14,-14.142 -21,-31.142 -21,-51 0,-19.85867 7.07067,-36.788 21.212,-50.788 14.142,-14 31.142,-21 51,-21 19.85867,0 36.788,7.07067 50.788,21.212 14,14.142 21,31.142 21,51 0,19.85867 -7.07067,36.788 -21.212,50.788 -14.142,14 -31.142,21 -51,21 z m 400,0 C 666.92933,-81 650,-88.070667 636,-102.212 c -14,-14.142 -21,-31.142 -21,-51 0,-19.85867 7.07067,-36.788 21.212,-50.788 14.142,-14 31.142,-21 51,-21 19.85867,0 36.788,7.07067 50.788,21.212 14,14.142 21,31.142 21,51 0,19.85867 -7.07067,36.788 -21.212,50.788 -14.142,14 -31.142,21 -51,21 z M 205,-801 345,-513 h 288 l 161.074,-288 z m 0,0 h 589.074 c 15.30933,0 26.95767,7 34.945,21 7.98733,14 7.981,28 -0.019,42 l -135,243 c -7.33333,12.66667 -16.853,22.83333 -28.559,30.5 -11.70667,7.66667 -24.52033,11.5 -38.441,11.5 H 324 l -56,104 h 491 v 60 H 277 c -28,0 -48.16667,-9.33333 -60.5,-28 -12.33333,-18.66667 -12.16667,-39.66667 0.5,-63 L 281,-498 129,-820 H 51 v -60 h 117 z m 140,288 h 288 z"/></svg>';

const skeletonSVG = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="24" height="24" fill="currentColor" viewBox="0 0 512 477.853"><path id="a" d="M244.758.927a30.28 30.28 0 0 0-30.291 30.291 30.28 30.28 0 0 0 30.291 30.292 30.28 30.28 0 0 0 30.25-30.292A30.28 30.28 0 0 0 244.758.927m0 18.416a11.883 11.883 0 0 1 11.875 11.875 11.883 11.883 0 0 1-11.875 11.875 11.883 11.883 0 0 1-11.916-11.875 11.883 11.883 0 0 1 11.916-11.875"/><use xlink:href="#a" transform="translate(94.487 84.329)"/><use xlink:href="#a" transform="translate(-93.337 105.028)"/><use xlink:href="#a" transform="translate(0 95.445)"/><use xlink:href="#a" transform="translate(113.652 208.139)"/><use xlink:href="#a" transform="translate(217.53 176.707)"/><use xlink:href="#a" transform="translate(-123.235 228.838)"/><use xlink:href="#a" transform="translate(-196.448 331.182)"/><use xlink:href="#a" transform="translate(0 186.29)"/><use xlink:href="#a" transform="translate(0 278.285)"/><use xlink:href="#a" transform="translate(83.754 373.155)"/><use xlink:href="#a" transform="translate(0 373.155)"/><use xlink:href="#a" transform="translate(-83.754 373.155)"/><path d="M246.966 153.863h21.333v85.333h-21.333z" transform="rotate(36.9)"/><path d="M158.974 122.672h21.333v96h-21.333z" transform="rotate(9.635)"/><path d="M136.668-210.731h21.333v53.333h-21.333z" transform="rotate(85.37)"/><path d="M234.071 51.791h21.333v53.333h-21.333z" /><path d="M142.866-306.143h21.333v53.333h-21.333z" transform="rotate(84.011)"/><path d="M318.294 170.379h21.333v85.333h-21.333z" transform="rotate(-6.034)"/><path d="M317.001-371.542h21.333v74.667h-21.333z" transform="rotate(74.352)"/><path d="M234.071 147.103h21.333v53.333h-21.333zM234.071 237.144h21.333v53.333h-21.333zM234.071 327.183h21.333v53.333h-21.333z" /><path d="M396.539-218.417h21.333v42.667h-21.333z" transform="rotate(89.074)"/><path d="M403.528-291.713h21.333v42.667h-21.333z" transform="rotate(87.767)"/><rect width="21.333" height="53.333" x="317.825" y="421.176" ry="9.583" /><rect width="21.333" height="53.333" x="150.317" y="421.176" ry="9.583" /></svg>';

const sortAlphabeticalSVG = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 511.626 511.627" fill="currentColor"><path d="M215.232,401.991h-54.818V9.136c0-2.663-0.854-4.856-2.568-6.567C156.133,0.859,153.946,0,151.279,0H96.461 c-2.663,0-4.856,0.855-6.567,2.568c-1.709,1.715-2.568,3.905-2.568,6.567v392.855H32.507c-4.184,0-7.039,1.902-8.563,5.708 c-1.525,3.621-0.856,6.95,1.997,9.996l91.361,91.365c2.096,1.707,4.281,2.562,6.567,2.562c2.474,0,4.664-0.855,6.567-2.562 l91.076-91.078c1.906-2.279,2.856-4.571,2.856-6.844c0-2.676-0.854-4.859-2.568-6.584 C220.086,402.847,217.9,401.991,215.232,401.991z"/><path d="M428.511,479.082h-70.808c-3.997,0-6.852,0.191-8.559,0.568l-4.001,0.571v-0.571l3.142-3.142 c2.848-3.419,4.853-5.896,5.996-7.409l105.344-151.331v-25.406H297.744v65.377h34.263v-32.832h66.236 c3.422,0,6.283-0.288,8.555-0.855c0.572,0,1.287-0.048,2.143-0.145c0.853-0.085,1.475-0.144,1.852-0.144v0.855l-3.142,2.574 c-1.704,1.711-3.713,4.273-5.995,7.706L296.31,485.934v25.693h166.734v-66.521h-34.54v33.976H428.511z"/><path d="M468.475,189.008L402.807,0h-46.25l-65.664,189.008h-19.979v30.264h81.933v-30.264h-21.409l13.419-41.112h69.381 l13.415,41.112H406.25v30.264h82.228v-30.264H468.475z M354.278,116.487l20.841-62.241c0.76-2.285,1.479-5.046,2.143-8.28 c0.66-3.236,0.996-4.949,0.996-5.139l0.855-5.708h1.143c0,0.761,0.191,2.664,0.562,5.708l3.433,13.418l20.554,62.241H354.278z"/></svg>';

const sortAlphabeticalReverseSVG = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 511.626 511.627" fill="currentColor"><path d="M215.232,401.991h-54.818V9.136c0-2.663-0.854-4.856-2.568-6.567C156.133,0.859,153.946,0,151.279,0H96.461 c-2.663,0-4.856,0.855-6.567,2.568c-1.709,1.715-2.568,3.905-2.568,6.567v392.855H32.507c-4.184,0-7.039,1.902-8.563,5.708 c-1.525,3.621-0.856,6.95,1.997,9.996l91.361,91.365c2.096,1.707,4.281,2.562,6.567,2.562c2.474,0,4.664-0.855,6.567-2.562 l91.076-91.078c1.906-2.279,2.856-4.571,2.856-6.844c0-2.676-0.854-4.859-2.568-6.584 C220.086,402.847,217.9,401.991,215.232,401.991z"/><path d="M468.475,481.361l-65.664-189.01h-46.25L290.9,481.364H270.92v30.263h81.934v-30.266h-21.412l13.418-41.11h69.381 l13.415,41.11H406.25v30.266h82.228v-30.266H468.475z M354.278,408.846l20.841-62.242c0.76-2.283,1.479-5.045,2.143-8.278 c0.66-3.234,0.996-4.948,0.996-5.137l0.855-5.715h1.143c0,0.767,0.191,2.669,0.562,5.715l3.433,13.415l20.554,62.242H354.278z"/><path d="M463.055,152.745h-34.537v33.975H357.71c-4.001,0-6.852,0.097-8.556,0.288l-4.004,0.854v-0.854l3.142-2.858 c2.851-3.422,4.853-5.896,5.996-7.421L459.632,25.41V0H297.754v65.387h34.259V32.552h66.232c3.426,0,6.283-0.288,8.56-0.859 c0.571,0,1.286-0.048,2.142-0.144c0.855-0.094,1.476-0.144,1.854-0.144v0.855l-3.141,2.568c-1.708,1.713-3.71,4.283-5.996,7.71 L296.32,193.569v25.697h166.735V152.745z"/></svg>';

const sprintSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m216-160-56-56 384-384H440v80h-80v-160h233q16 0 31 6t26 17l120 119q27 27 66 42t84 16v80q-62 0-112.5-19T718-476l-40-42-88 88 90 90-262 151-40-69 172-99-68-68-266 265Zm-96-280v-80h200v80H120ZM40-560v-80h200v80H40Zm739-80q-33 0-57-23.5T698-720q0-33 24-56.5t57-23.5q33 0 57 23.5t24 56.5q0 33-24 56.5T779-640Zm-659-40v-80h200v80H120Z"/></svg>';

const tableRowsSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M760-200v-120H200v120h560Zm0-200v-160H200v160h560Zm0-240v-120H200v120h560ZM200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Z"/></svg>';

const textDecreaseSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="m40-200 210-560h100l210 560h-96l-51-143H187l-51 143H40Zm176-224h168l-82-232h-4l-82 232Zm384-16v-80h320v80H600Z"/></svg>';

const textIncreaseSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="m40-200 210-560h100l210 560h-96l-51-143H187l-51 143H40Zm176-224h168l-82-232h-4l-82 232Zm504 104v-120H600v-80h120v-120h80v120h120v80H800v120h-80Z"/></svg>';

const uploadSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M440-320v-326L336-542l-56-58 200-200 200 200-56 58-104-104v326h-80ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z"/></svg>';

const viewColumnSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M121-280v-400q0-33 23.5-56.5T201-760h559q33 0 56.5 23.5T840-680v400q0 33-23.5 56.5T760-200H201q-33 0-56.5-23.5T121-280Zm79 0h133v-400H200v400Zm213 0h133v-400H413v400Zm213 0h133v-400H626v400Z"/></svg>';

const viewInArSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M440-181 240-296q-19-11-29.5-29T200-365v-230q0-22 10.5-40t29.5-29l200-115q19-11 40-11t40 11l200 115q19 11 29.5 29t10.5 40v230q0 22-10.5 40T720-296L520-181q-19 11-40 11t-40-11Zm0-92v-184l-160-93v185l160 92Zm80 0 160-92v-185l-160 93v184ZM80-680v-120q0-33 23.5-56.5T160-880h120v80H160v120H80ZM280-80H160q-33 0-56.5-23.5T80-160v-120h80v120h120v80Zm400 0v-80h120v-120h80v120q0 33-23.5 56.5T800-80H680Zm120-600v-120H680v-80h120q33 0 56.5 23.5T880-800v120h-80ZM480-526l158-93-158-91-158 91 158 93Zm0 45Zm0-45Zm40 69Zm-80 0Z"/></svg>';

const viewTimelineSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M240-280h240v-80H240v80Zm120-160h240v-80H360v80Zm120-160h240v-80H480v80ZM200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm0-560v560-560Z"/></svg>';

const visibilityOffSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0zm0 0h24v24H0zm0 0h24v24H0zm0 0h24v24H0z" fill="none"/><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>';

const visibilityOnSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0z" fill="none"/><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>';

const walkSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m280-40 112-564-72 28v136h-80v-188l202-86q14-6 29.5-7t29.5 4q14 5 26.5 14t20.5 23l40 64q26 42 70.5 69T760-520v80q-70 0-125-29t-94-74l-25 123 84 80v300h-80v-260l-84-64-72 324h-84Zm260-700q-33 0-56.5-23.5T460-820q0-33 23.5-56.5T540-900q33 0 56.5 23.5T620-820q0 33-23.5 56.5T540-740Z"/></svg>';

const warningSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m40-120 440-760 440 760H40Zm138-80h604L480-720 178-200Zm302-40q17 0 28.5-11.5T520-280q0-17-11.5-28.5T480-320q-17 0-28.5 11.5T440-280q0 17 11.5 28.5T480-240Zm-40-120h80v-200h-80v200Zm40-100Z"/></svg>';

const zoomInSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Zm-40-60v-80h-80v-80h80v-80h80v80h80v80h-80v80h-80Z"/></svg>';

const zoomOutSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400ZM280-540v-80h200v80H280Z"/></svg>';

var index = /*#__PURE__*/Object.freeze({
    __proto__: null,
    arrowDownwardAltSVG: arrowDownwardAltSVG,
    arrowLeftAltSVG: arrowLeftAltSVG,
    arrowRightAltSVG: arrowRightAltSVG,
    arrowUpwardAltSVG: arrowUpwardAltSVG,
    bookmarksPlainSVG: bookmarksPlainSVG,
    borderClearSVG: borderClearSVG,
    brickLayoutSVG: brickLayoutSVG,
    bugReportSVG: bugReportSVG,
    checkCircleSVG: checkCircleSVG,
    checkOutlineSVG: checkOutlineSVG,
    checkSVG: checkSVG,
    closeSVG: closeSVG,
    contentCopySVG: contentCopySVG,
    cropPortraitSVG: cropPortraitSVG,
    cycleSVG: cycleSVG,
    dangerousSVG: dangerousSVG,
    dashboardSVG: dashboardSVG,
    downloadSVG: downloadSVG,
    dragPanSVG: dragPanSVG,
    errorSVG: errorSVG,
    favoriteSVG: favoriteSVG,
    fileExportSVG: fileExportSVG,
    fireSVG: fireSVG,
    flexWrapSVG: flexWrapSVG,
    folderOpenSVG: folderOpenSVG,
    folderSVG: folderSVG,
    gridOffSVG: gridOffSVG,
    gridOffsetSVG: gridOffsetSVG,
    gridOnSVG: gridOnSVG,
    gridRegularSVG: gridRegularSVG,
    helpSVG: helpSVG,
    infoSVG: infoSVG,
    lapsSVG: lapsSVG,
    lockOpenRightSVG: lockOpenRightSVG,
    lockOpenSVG: lockOpenSVG,
    lockSVG: lockSVG,
    mailSVG: mailSVG,
    manageAccountsSVG: manageAccountsSVG,
    manufacturingSVG: manufacturingSVG,
    moreHorizSVG: moreHorizSVG,
    openInNewSVG: openInNewSVG,
    openWithSVG: openWithSVG,
    overscanSVG: overscanSVG,
    panZoomSVG: panZoomSVG,
    patreonLogoSVG: patreonLogoSVG,
    pauseSVG: pauseSVG,
    personSVG: personSVG,
    photoCameraSVG: photoCameraSVG,
    playSVG: playSVG,
    playlistAddSVG: playlistAddSVG,
    print3dSVG: print3dSVG,
    questionMarkSVG: questionMarkSVG,
    repeatOnSVG: repeatOnSVG,
    repeatOneOnSVG: repeatOneOnSVG,
    repeatOneSVG: repeatOneSVG,
    repeatSVG: repeatSVG,
    restartSVG: restartSVG,
    rotate360SVG: rotate360SVG,
    rotateLeftSVG: rotateLeftSVG,
    rotateRightSVG: rotateRightSVG,
    rotateSVG: rotateSVG,
    runSVG: runSVG,
    sentimentExcitedSVG: sentimentExcitedSVG,
    settingsSVG: settingsSVG,
    sfmLogoSVG: sfmLogoSVG,
    shareSVG: shareSVG,
    shoppingCartSVG: shoppingCartSVG,
    skeletonSVG: skeletonSVG,
    sortAlphabeticalReverseSVG: sortAlphabeticalReverseSVG,
    sortAlphabeticalSVG: sortAlphabeticalSVG,
    sprintSVG: sprintSVG,
    tableRowsSVG: tableRowsSVG,
    textDecreaseSVG: textDecreaseSVG,
    textIncreaseSVG: textIncreaseSVG,
    uploadSVG: uploadSVG,
    viewColumnSVG: viewColumnSVG,
    viewInArSVG: viewInArSVG,
    viewTimelineSVG: viewTimelineSVG,
    visibilityOffSVG: visibilityOffSVG,
    visibilityOnSVG: visibilityOnSVG,
    walkSVG: walkSVG,
    warningSVG: warningSVG,
    zoomInSVG: zoomInSVG,
    zoomOutSVG: zoomOutSVG
});

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
            $contextmenu: (event) => this.#onContextMenu(event),
        });
    }
    get htmlHeader() {
        return this.#header;
    }
    getGroup() {
        return this.#group;
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
    #onContextMenu(event) {
        this.dispatchEvent(new CustomEvent('contextmenu', { detail: { tab: this, originalEvent: event } }));
    }
    scrollIntoView() {
        this.#header.scrollIntoView();
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

var tabGroupCSS = ":host,\nharmony-tab-group {\n\twidth: 100%;\n\theight: 100%;\n\tdisplay: flex;\n\tflex-direction: column;\n\tposition: relative;\n}\n\n.harmony-tab-group-header {\n\tbackground-color: var(--main-bg-color-bright);\n\tdisplay: flex;\n\toverflow: auto hidden;\n\twidth: 100%;\n\tscrollbar-width: none;\n}\n\n.harmony-tab-group-content {\n\tflex: 1;\n\tbackground-color: var(--main-bg-color-dark);\n\toverflow: auto;\n\twidth: 100%;\n}\n";

var tabCSS = "harmony-tab {\n\tdisplay: block;\n\theight: 100%;\n\toverflow: auto;\n}\n\nharmony-tab::first-letter {\n\ttext-transform: uppercase;\n}\n\n.tab {\n\tdisplay: inline-block;\n\tbackground-color: var(--main-bg-color-bright);\n\tpadding: 10px;\n\tborder: 1px solid var(--harmony-ui-text-primary);\n\tborder-top: 0px;\n\tposition: relative;\n\tcolor: var(--harmony-ui-text-primary);\n\tcursor: pointer;\n\tuser-select: none;\n\tpointer-events: all;\n\tflex: 0 0;\n\ttext-align: center;\n\twhite-space: nowrap;\n\tdisplay: flex;\n\talign-items: center;\n}\n\n.label.activated {\n\tbackground-color: var(--main-bg-color-dark);\n\tborder-bottom: 1px solid var(--main-bg-color-dark);\n\tborder-left: 1px solid white;\n\tz-index: 2;\n}\n";

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
            $wheel: (event) => this.#header.scrollLeft += event.deltaY,
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
    getTabs() {
        return new Set(this.#tabs);
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
        setTimeout(() => {
            this.#activeTab?.scrollIntoView();
        }, 0);
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
    closeAllTabs() {
        for (const tab of this.#tabs) {
            tab.close();
        }
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

var treeCSS = ":host {\n\t--child-margin: var(--harmony-tree-child-margin, 1rem);\n\t--header-bg-color: var(--harmony-tree-header-bg-color, var(--main-bg-color-dark, black));\n\t--selected-bg-color: var(--harmony-tree-selected-bg-color, var(--accent-primary, rgb(26, 172, 201)));\n\tcolor: var(--main-text-color-dark2, white);\n}\n\n.item {\n\twidth: 100%;\n}\n\n.header {\n\twidth: 100%;\n\theight: 1rem;\n\tbackground-color: var(--header-bg-color);\n\tcursor: pointer;\n\tdisplay: flex;\n\tgap: 0.2rem;\n\talign-items: center;\n}\n\n.childs {\n\tmargin-left: var(--child-margin);\n}\n\n.root>.header {\n\tdisplay: var(--harmony-tree-display-root, none);\n}\n\n.root>.childs {\n\tmargin-left: unset;\n}\n\n.actions {\n\tdisplay: flex;\n}\n\n.header.selected {\n\tbackground-color: var(--selected-bg-color);\n}\n";

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
        return path.replace(/(\/)+/g, '/');
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
        const root = new TreeItem(options.rootName ?? '', { userData: options.rootUserData ?? options.userData, type: 'root' });
        const top = new element(root);
        for (const [path, perElementUserData] of paths.entries()) {
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
                    current.childs.set(s, new element(new TreeItem(s, { parent: parent, type: type, userData: perElementUserData != path ? perElementUserData : options.userData })));
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

export { AddI18nElement, HTMLHarmony2dManipulatorElement, HTMLHarmonyAccordionElement, HTMLHarmonyCircularProgressElement, HTMLHarmonyColorPickerElement, HTMLHarmonyCopyElement, HTMLHarmonyFileInputElement, HTMLHarmonyItemElement, HTMLHarmonyLabelPropertyElement, HTMLHarmonyMenuElement, HTMLHarmonyPaletteElement, HTMLHarmonyPanelElement, HTMLHarmonyRadioElement, HTMLHarmonySelectElement, HTMLHarmonySliderElement, HTMLHarmonySlideshowElement, HTMLHarmonySplitterElement, HTMLHarmonySwitchElement, HTMLHarmonyTabElement, HTMLHarmonyTabGroupElement, HTMLHarmonyToggleButtonElement, HTMLHarmonyTooltipElement, HTMLHarmonyTreeElement, index as HarmonySVG, I18n, I18nElements, I18nEvents, ManipulatorCorner, ManipulatorDirection, ManipulatorResizeOrigin, ManipulatorSide, ManipulatorUpdatedEventType, TreeItem, cloneEvent, createElement, createElementNS, createShadowRoot, defineHarmony2dManipulator, defineHarmonyAccordion, defineHarmonyCircularProgress, defineHarmonyColorPicker, defineHarmonyCopy, defineHarmonyFileInput, defineHarmonyItem, defineHarmonyLabelProperty, defineHarmonyMenu, defineHarmonyPalette, defineHarmonyPanel, defineHarmonyRadio, defineHarmonySelect, defineHarmonySlider, defineHarmonySlideshow, defineHarmonySplitter, defineHarmonySwitch, defineHarmonyTab, defineHarmonyTabGroup, defineHarmonyToggleButton, defineHarmonyTooltip, defineHarmonyTree, display, documentStyle, documentStyleSync, hide, isVisible, shadowRootStyle, shadowRootStyleSync, show, styleInject, toggle, updateElement, visible };
