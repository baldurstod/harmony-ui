import { Color } from 'harmony-utils';

export declare function AddI18nElement(element: HTMLElement, descriptor: string | I18nDescriptor): void;

export declare function cloneEvent(event: Event): Event;

export declare function createElement(tagName: string, options?: any): HTMLElement;

export declare function createElementNS(namespaceURI: string, tagName: string, options: any): HTMLElement;

export declare function createShadowRoot(tagName: string, options?: any, mode?: 'open' | 'closed'): ShadowRoot;

export declare function defineHarmony2dManipulator(): void;

export declare function defineHarmonyAccordion(): void;

export declare function defineHarmonyColorPicker(): void;

export declare function defineHarmonyContextMenu(): void;

export declare function defineHarmonyCopy(): void;

export declare function defineHarmonyFileInput(): void;

export declare function defineHarmonyLabelProperty(): void;

export declare function defineHarmonyPalette(): void;

export declare function defineHarmonyPanel(): void;

export declare function defineHarmonyRadio(): void;

export declare function defineHarmonySelect(): void;

export declare function defineHarmonySlider(): void;

export declare function defineHarmonySlideshow(): void;

export declare function defineHarmonySplitter(): void;

export declare function defineHarmonySwitch(): void;

export declare function defineHarmonyTab(): void;

export declare function defineHarmonyTabGroup(): void;

export declare function defineHarmonyTooltip(): void;

export declare function defineToggleButton(): void;

export declare function display(htmlElement: HTMLElement | ShadowRoot | Array<HTMLElement | ShadowRoot> | undefined | null, visible: boolean): void;

export declare function documentStyle(cssText: string): Promise<void>;

export declare function documentStyleSync(cssText: string): void;

export declare type HarmonyContextMenuItem = {
    i18n?: string;
    name?: string;
    selected?: boolean;
    disabled?: boolean;
    submenu?: HarmonyContextMenuItems;
    cmd?: string;
    f?: (arg0: any) => void;
};

export declare type HarmonyContextMenuItems = Array<HarmonyContextMenuItem> | {
    [key: string]: HarmonyContextMenuItem | null;
};

export declare type HarmonySlideshowOptions = {
    autoPlay?: boolean;
    autoPlayDelay?: number;
    smoothScroll?: boolean;
    smoothScrollTransitionTime?: number;
    images?: Array<string>;
    class?: string;
    id?: string;
};

export declare function hide(htmlElement: HTMLElement | ShadowRoot | Array<HTMLElement | ShadowRoot> | undefined | null): void;

export declare class HTMLHarmony2dManipulatorElement extends HTMLElement {
    #private;
    constructor();
    setTopLeft(x: number, y: number): void;
    getTopLeft(): {
        x: number;
        y: number;
    } | null;
    getTopRight(): {
        x: number;
        y: number;
    } | null;
    getBottomLeft(): {
        x: number;
        y: number;
    } | null;
    getBottomRight(): {
        x: number;
        y: number;
    } | null;
    getCorner(i: ManipulatorCorner): {
        x: number;
        y: number;
    } | null;
    set(values: {
        rotation?: number;
        left?: number;
        top?: number;
        width?: number;
        height?: number;
    }): void;
    connectedCallback(): void;
    attributeChangedCallback(name: string, oldValue: string, newValue: string): void;
    static get observedAttributes(): string[];
    private convertToUnit;
}

export declare class HTMLHarmonyAccordionElement extends HTMLElement {
    #private;
    constructor();
    connectedCallback(): void;
    addItem(item: HTMLHarmonyItem): void;
    createItem(header: HTMLElement, content: HTMLElement): HTMLElement;
    clear(): void;
    expand(id: string): void;
    expandAll(): void;
    collapse(id: string): void;
    collapseAll(): void;
    set disabled(disabled: boolean);
    get disabled(): boolean;
    attributeChangedCallback(name: string, oldValue: string, newValue: string): void;
    static get observedAttributes(): string[];
}

export declare class HTMLHarmonyColorPickerElement extends HTMLElement {
    #private;
    constructor();
    connectedCallback(): void;
    adoptStyleSheet(styleSheet: CSSStyleSheet): void;
    getColor(): Color;
    setHex(hex: string): void;
}

export declare class HTMLHarmonyContextMenuElement extends HTMLElement {
    #private;
    constructor();
    show(items: HarmonyContextMenuItems, clientX: number, clientY: number, userData: any): void;
    close(): void;
    connectedCallback(): void;
    addItem(item: HarmonyContextMenuItem | null, userData: any): HTMLElement;
}

export declare class HTMLHarmonyCopyElement extends HTMLElement {
    #private;
    constructor();
    connectedCallback(): void;
}

declare class HTMLHarmonyElement extends HTMLElement {
    protected initialized: boolean;
    protected initElement(): void;
    protected createElement(): void;
    connectedCallback(): void;
    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void;
    onAttributeChanged(name: string, oldValue: string | null, newValue: string | null): void;
    static get observedAttributes(): string[];
}

export declare class HTMLHarmonyFileInputElement extends HTMLElement {
    #private;
    constructor();
    get files(): FileList | null;
    set accept(accept: string);
    get accept(): string;
    adoptStyleSheet(styleSheet: CSSStyleSheet): void;
    attributeChangedCallback(name: string, oldValue: string, newValue: string): void;
    static get observedAttributes(): string[];
}

declare class HTMLHarmonyItem extends HTMLElement {
    #private;
    constructor();
    getHeader(): HTMLSlotElement;
    getContent(): HTMLSlotElement;
    getId(): string;
    attributeChangedCallback(name: string, oldValue: string, newValue: string): void;
    static get observedAttributes(): string[];
}

export declare class HTMLHarmonyLabelPropertyElement extends HTMLElement {
    #private;
    constructor();
    set label(label: string);
    set property(property: string);
    connectedCallback(): void;
}

export declare class HTMLHarmonyPaletteElement extends HTMLElement {
    #private;
    constructor();
    connectedCallback(): void;
    adoptStyleSheet(styleSheet: CSSStyleSheet): void;
    clearColors(): void;
    addColor(color: string | Array<number>, tooltip: string): any;
    selectColor(color: string | Array<number>, selected?: boolean): void;
    toggleColor(color: string | Array<number>): void;
    attributeChangedCallback(name: string, oldValue: string, newValue: string): void;
    static get observedAttributes(): string[];
}

export declare class HTMLHarmonyPanelElement extends HTMLElement {
    #private;
    customPanelId: number;
    htmlTitle: HTMLElement;
    htmlContent: HTMLElement;
    constructor();
    connectedCallback(): void;
    append(): void;
    prepend(): void;
    get innerHTML(): string;
    set innerHTML(innerHTML: string);
    attributeChangedCallback(name: string, oldValue: string, newValue: string): void;
    static get observedAttributes(): string[];
    static set highlitPanel(panel: HTMLElement);
    set direction(direction: string);
    get direction(): string;
    set size(size: number);
    get size(): number;
    set isContainer(isContainer: boolean);
    set isMovable(isMovable: boolean);
    set collapsible(collapsible: boolean);
    set collapsed(collapsed: boolean);
    set title(title: string);
    set titleI18n(titleI18n: string);
    static get nextId(): string;
    static saveDisposition(): {
        panels: {
            [key: string]: any;
        };
        dummies: Array<any>;
    };
    static restoreDisposition(json: {
        [key: string]: any;
    }): void;
}

export declare class HTMLHarmonyRadioElement extends HTMLElement {
    #private;
    constructor();
    connectedCallback(): void;
    append(...params: Array<any>): void;
    select(value: string, select: boolean): void;
    isSelected(value: string): string | false;
    set disabled(disabled: boolean);
    get disabled(): boolean;
    attributeChangedCallback(name: string, oldValue: string, newValue: string): void;
    static get observedAttributes(): string[];
}

export declare class HTMLHarmonySelectElement extends HTMLElement {
    #private;
    constructor();
    connectedCallback(): void;
    attributeChangedCallback(name: string, oldValue: string, newValue: string): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
    addOption(value: string, text?: string): void;
    addOptions(values: Map<any, any>): void;
    setOptions(values: Map<any, any>): void;
    removeOption(value: any): void;
    removeAllOptions(): void;
    select(value: any): void;
    selectFirst(): void;
    unselect(value: any): void;
    unselectAll(): void;
    static get observedAttributes(): string[];
}

export declare class HTMLHarmonySliderElement extends HTMLHarmonyElement {
    #private;
    createElement(): void;
    get value(): number | number[];
    isRange(): boolean;
    setValue(value: number | Array<number>): void;
    onAttributeChanged(name: string, oldValue: string | null, newValue: string | null): void;
    static get observedAttributes(): string[];
}

export declare class HTMLHarmonySlideshowElement extends HTMLElement {
    #private;
    constructor(options: HarmonySlideshowOptions);
    previousImage(): void;
    nextImage(): void;
    setImage(imageId: number): void;
    connectedCallback(): void;
    disconnectedCallback(): void;
    addImage(htmlImage: HTMLImageElement): void;
    removeAllImages(): void;
    refresh(): void;
    set active(htmlImage: HTMLImageElement);
    set dynamic(dynamic: boolean);
    setAutoPlay(autoPlay: boolean): void;
    play(autoPlay?: boolean): void;
    onResized(): void;
    checkImagesSize(): void;
    checkImageSize(htmlImage: HTMLImageElement, rect?: DOMRect): void;
    attributeChangedCallback(name: string, oldValue: string, newValue: string): void;
    static get observedAttributes(): string[];
}

export declare class HTMLHarmonySplitterElement extends HTMLElement {
    #private;
    constructor();
    connectedCallback(): void;
    setOrientation(orientation: string): void;
    attributeChangedCallback(name: string, oldValue: string, newValue: string): void;
    static get observedAttributes(): string[];
}

export declare class HTMLHarmonySwitchElement extends HTMLElement {
    #private;
    constructor();
    connectedCallback(): void;
    set disabled(disabled: boolean);
    get disabled(): boolean;
    set state(state: boolean | undefined);
    get state(): boolean | undefined;
    set checked(checked: boolean | undefined);
    get checked(): boolean | undefined;
    set ternary(ternary: boolean);
    get ternary(): boolean;
    toggle(): void;
    attributeChangedCallback(name: string, oldValue: string, newValue: string): void;
    static get observedAttributes(): string[];
}

export declare class HTMLHarmonyTabElement extends HTMLElement {
    #private;
    constructor();
    get htmlHeader(): HTMLElement;
    connectedCallback(): void;
    attributeChangedCallback(name: string, oldValue: string, newValue: string): void;
    set disabled(disabled: boolean);
    get disabled(): boolean;
    activate(): void;
    /**
     * @deprecated use setActive() instead
     */
    set active(active: boolean);
    setActive(active: boolean): void;
    /**
     * @deprecated use isActive() instead
     */
    get active(): boolean;
    isActive(): boolean;
    static get observedAttributes(): string[];
}

export declare class HTMLHarmonyTabGroupElement extends HTMLElement {
    #private;
    constructor();
    connectedCallback(): void;
    adoptStyleSheet(styleSheet: CSSStyleSheet): void;
    addTab(tab: HTMLHarmonyTabElement): void;
    /**
     * @deprecated use activateTab() instead
     */
    set active(tab: HTMLHarmonyTabElement);
    activateTab(tab: HTMLHarmonyTabElement): void;
    clear(): void;
}

export declare class HTMLHarmonyToggleButtonElement extends HTMLElement {
    #private;
    constructor();
    connectedCallback(): void;
    attributeChangedCallback(name: string, oldValue: string, newValue: string): void;
    get state(): boolean;
    set state(state: boolean);
    adoptStyleSheet(styleSheet: CSSStyleSheet): void;
    static get observedAttributes(): string[];
}

export declare class HTMLHarmonyTooltipElement extends HTMLElement {
    #private;
    constructor();
    attributeChangedCallback(name: string, oldValue: string, newValue: string): void;
    static get observedAttributes(): string[];
}

export declare class I18n {
    #private;
    static start(): void;
    static setOptions(options: {
        translations: any;
    }): void;
    static addTranslation(translation: any): void;
    static observeElement(element: HTMLElement | ShadowRoot): void;
    static i18n(): void;
    static updateElement(htmlElement: HTMLElement | ShadowRoot): void;
    /**
     * @deprecated use setLang() instead
     */
    static set lang(lang: string);
    static setLang(lang: string): void;
    static addEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: AddEventListenerOptions | boolean): void;
    static getString(s: string): string;
    static formatString(s: string, values: any): string;
    /**
     * @deprecated use getAuthors() instead
     */
    static get authors(): void;
    static getAuthors(): any;
    static setValue(element: HTMLElement | undefined, name: string, value: any): void;
}

export declare type I18nDescriptor = {
    innerHTML?: string | null;
    innerText?: string | null;
    placeholder?: string | null;
    title?: string | null;
    label?: string | null;
    values?: {
        [key: string]: any;
    };
};

export declare const I18nElements: Map<HTMLElement, I18nDescriptor>;

export declare enum I18nEvents {
    LangChanged = "langchanged",
    TranslationsUpdated = "translationsupdated",
    Any = "*"
}

export declare function isVisible(htmlElement: HTMLElement): boolean;

export declare type LangChangedEvent = {
    detail: {
        oldLang: string;
        newLang: string;
    };
};

export declare enum ManipulatorCorner {
    None = -1,
    TopLeft = 0,
    TopRight = 1,
    BottomLeft = 2,
    BottomRight = 3
}

export declare enum ManipulatorDirection {
    All = "all",
    X = "x",
    Y = "y",
    None = "none"
}

export declare enum ManipulatorSide {
    None = -1,
    Top = 0,
    Bottom = 1,
    Left = 2,
    Right = 3
}

export declare type RadioChangedEventData = {
    value: string;
    state: boolean;
};

export declare function shadowRootStyle(shadowRoot: Document | ShadowRoot, cssText: string): Promise<void>;

export declare function shadowRootStyleSync(shadowRoot: Document | ShadowRoot, cssText: string): void;

export declare function show(htmlElement: HTMLElement | ShadowRoot | Array<HTMLElement | ShadowRoot> | undefined | null): void;

export declare function styleInject(css: string): void;

export declare function toggle(htmlElement: HTMLElement | ShadowRoot | undefined | null): void;

export declare function updateElement(element: HTMLElement | undefined, options: any): HTMLElement | undefined;

export declare const visible: typeof isVisible;

export { }
