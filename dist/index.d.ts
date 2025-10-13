import { Color } from 'harmony-utils';
import { Radian } from 'harmony-types';

export declare function AddI18nElement(element: Element, descriptor: string | I18nDescriptor | null): void;

export declare function cloneEvent(event: Event): Event;

export declare function createElement(tagName: string, options?: CreateElementOptions): HTMLElement;

export declare type CreateElementChildOption = Element | ShadowRoot | string;

export declare function createElementNS(namespaceURI: string, tagName: string, options?: CreateElementOptions): Element;

export declare type CreateElementOptions = {
    id?: string;
    class?: string;
    i18n?: string | I18nDescriptor | null;
    parent?: Element | ShadowRoot;
    child?: CreateElementChildOption;
    childs?: Array<CreateElementChildOption>;
    events?: {
        [key: string]: any;
    };
    properties?: {
        [key: string]: any;
    };
    hidden?: boolean;
    innerHTML?: string | null;
    innerText?: string | null;
    attributes?: {
        [key: string]: any;
    };
    slot?: string;
    htmlFor?: string;
    adoptStyle?: string;
    adoptStyles?: Array<string>;
    style?: string;
    checked?: boolean;
    disabled?: boolean;
    help?: string;
    elementCreated?: (element: Element, root?: ShadowRoot) => void;
    [key: string]: any;
};

export declare function createShadowRoot(tagName: string, options?: CreateElementOptions, mode?: 'open' | 'closed'): ShadowRoot;

export declare function defineHarmony2dManipulator(): void;

export declare function defineHarmonyAccordion(): void;

export declare function defineHarmonyCircularProgress(): void;

export declare function defineHarmonyColorPicker(): void;

export declare function defineHarmonyCopy(): void;

export declare function defineHarmonyFileInput(): void;

export declare function defineHarmonyItem(): void;

export declare function defineHarmonyLabelProperty(): void;

export declare function defineHarmonyMenu(): void;

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

export declare function defineHarmonyToggleButton(): void;

export declare function defineHarmonyTooltip(): void;

export declare function defineHarmonyTree(): void;

export declare function display(htmlElement: HTMLElement | SVGElement | ShadowRoot | Array<HTMLElement | SVGElement | ShadowRoot> | undefined | null, visible: boolean): void;

export declare function documentStyle(cssText: string): Promise<void>;

export declare function documentStyleSync(cssText: string): void;

export declare type HarmonyMenuItem = {
    i18n?: string;
    name?: string;
    opened?: boolean;
    selected?: boolean;
    disabled?: boolean;
    submenu?: HarmonyMenuItems;
    cmd?: string;
    f?: (arg0: any) => void;
};

export declare type HarmonyMenuItems = HarmonyMenuItemsArray | HarmonyMenuItemsDict;

export declare type HarmonyMenuItemsArray = Array<HarmonyMenuItem>;

export declare type HarmonyMenuItemsDict = {
    [key: string]: HarmonyMenuItem | null;
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

export declare type HarmonySwitchChange = {
    /** State of the switch. Is undefined if switch is ternary and in undefined state */
    state: boolean | undefined;
    /** @deprecated use state instead */
    value: boolean | undefined;
};

export declare function hide(htmlElement: HTMLElement | SVGElement | ShadowRoot | Array<HTMLElement | SVGElement | ShadowRoot> | undefined | null): void;

export declare class HTMLHarmony2dManipulatorElement extends HTMLElement {
    #private;
    constructor();
    setTopLeft(x: number, y: number): void;
    getTopLeft(): v2;
    getTopRight(): v2;
    getBottomLeft(): v2;
    getBottomRight(): v2;
    getCorner(i: ManipulatorCorner): v2;
    set(values: {
        rotation?: number;
        left?: number;
        top?: number;
        width?: number;
        height?: number;
    }): void;
    setMode(values: {
        rotation?: boolean;
        translation?: ManipulatorDirection;
        resize?: ManipulatorDirection;
        resizeOrigin?: ManipulatorResizeOrigin;
        scale?: ManipulatorDirection;
    }): void;
    setMinWidth(minWidth: number): void;
    setMinHeight(minHeight: number): void;
    connectedCallback(): void;
    attributeChangedCallback(name: string, oldValue: string, newValue: string): void;
    static get observedAttributes(): string[];
    private convertToUnit;
    isDragging(): boolean;
    setRotation(rotation: Radian): void;
}

export declare class HTMLHarmonyAccordionElement extends HTMLElement {
    #private;
    constructor();
    connectedCallback(): void;
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

export declare class HTMLHarmonyCircularProgressElement extends HTMLHarmonyElement {
    #private;
    protected createElement(): void;
    setProgress(progress: number): void;
    protected onAttributeChanged(name: string, oldValue: string, newValue: string): void;
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
    protected onAttributeChanged(name: string, oldValue: string | null, newValue: string | null): void;
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

export declare class HTMLHarmonyItemElement extends HTMLElement {
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

export declare class HTMLHarmonyMenuElement extends HTMLElement {
    #private;
    constructor();
    show(items: HarmonyMenuItems, userData?: any): void;
    showContextual(items: HarmonyMenuItems, clientX: number, clientY: number, userData?: any): void;
    setContextual(contextual: boolean): void;
    close(): void;
    connectedCallback(): void;
    addItem(item: HarmonyMenuItem | null, userData: any): HTMLElement;
}

export declare class HTMLHarmonyPaletteElement extends HTMLElement {
    #private;
    constructor();
    connectedCallback(): void;
    adoptStyleSheet(styleSheet: CSSStyleSheet): void;
    clearColors(): void;
    addColor(color: string | Array<number>, tooltip: string): PaletteColor | undefined;
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
    select(value: string, select?: boolean): void;
    isSelected(value: string): string | false;
    set disabled(disabled: boolean);
    get disabled(): boolean;
    clear(): void;
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
    protected createElement(): void;
    get value(): number | number[];
    isRange(): boolean;
    setValue(value: number | Array<number>): void;
    protected onAttributeChanged(name: string, oldValue: string | null, newValue: string | null): void;
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

export declare class HTMLHarmonySwitchElement extends HTMLHarmonyElement {
    #private;
    protected createElement(): void;
    set disabled(disabled: boolean);
    get disabled(): boolean;
    set state(state: boolean | undefined);
    get state(): boolean | undefined;
    set checked(checked: boolean | undefined);
    get checked(): boolean | undefined;
    set ternary(ternary: boolean);
    get ternary(): boolean;
    toggle(): void;
    protected onAttributeChanged(name: string, oldValue: string, newValue: string): void;
    static get observedAttributes(): string[];
}

export declare class HTMLHarmonyTabElement extends HTMLElement {
    #private;
    constructor();
    get htmlHeader(): HTMLElement;
    getGroup(): HTMLHarmonyTabGroupElement | undefined;
    connectedCallback(): void;
    attributeChangedCallback(name: string, oldValue: string, newValue: string): void;
    set disabled(disabled: boolean);
    get disabled(): boolean;
    activate(): void;
    close(): boolean;
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
    isClosed(): boolean;
    scrollIntoView(): void;
    static get observedAttributes(): string[];
}

export declare class HTMLHarmonyTabGroupElement extends HTMLElement {
    #private;
    constructor();
    connectedCallback(): void;
    adoptStyleSheet(styleSheet: CSSStyleSheet): void;
    addTab(tab: HTMLHarmonyTabElement): void;
    getTabs(): Set<HTMLHarmonyTabElement>;
    /**
     * @deprecated use activateTab() instead
     */
    set active(tab: HTMLHarmonyTabElement);
    activateTab(tab: HTMLHarmonyTabElement): void;
    closeTab(tab: HTMLHarmonyTabElement): void;
    closeAllTabs(): void;
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

export declare class HTMLHarmonyTreeElement extends HTMLHarmonyElement {
    #private;
    protected createElement(): void;
    adoptStyle(css: string): void;
    setRoot(root?: TreeItem | null): void;
    expandItem(item: TreeItem): void;
    collapseItem(item: TreeItem): void;
    showItem(item: TreeItem): void;
    hideItem(item: TreeItem): void;
    selectItem(item: TreeItem | null, scrollIntoView?: boolean): void;
    addAction(name: string, img: HTMLElement | string, tooltip?: string): void;
    refreshActions(item: TreeItem): void;
    setFilter(filter?: TreeItemFilter): void;
    protected onAttributeChanged(name: string, oldValue: string, newValue: string): void;
    static get observedAttributes(): string[];
}

export declare class I18n {
    #private;
    static start(): void;
    static setOptions(options: {
        translations: Array<I18nTranslation>;
    }): void;
    static addTranslation(translation: I18nTranslation): void;
    static observeElement(element: HTMLElement | ShadowRoot): void;
    static i18n(): void;
    static updateElement(htmlElement: Element | ShadowRoot): void;
    /**
     * @deprecated use setLang() instead
     */
    static set lang(lang: string);
    static setLang(lang: string): void;
    static setDefaultLang(defaultLang: string): void;
    static addEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: AddEventListenerOptions | boolean): void;
    static getString(s: string): string;
    static formatString(s: string, values: {
        [key: string]: I18nValue;
    }): string;
    /**
     * @deprecated use getAuthors() instead
     */
    static get authors(): void;
    static getAuthors(): string[];
    static setValue(element: HTMLElement | undefined, name: string, value: I18nValue): void;
}

export declare type I18nDescriptor = {
    innerHTML?: string | null;
    innerText?: string | null;
    placeholder?: string | null;
    title?: string | null;
    label?: string | null;
    values?: {
        [key: string]: I18nValue;
    };
};

export declare const I18nElements: Map<Element, I18nDescriptor>;

export declare enum I18nEvents {
    LangChanged = "langchanged",
    TranslationsUpdated = "translationsupdated",
    Any = "*"
}

export declare type I18nTranslation = {
    lang: string;
    authors?: Array<string>;
    strings: {
        [key: string]: string;
    };
};

export declare type I18nValue = string | number | boolean | null | undefined;

export declare function isVisible(htmlElement: HTMLElement): boolean;

export declare type ItemActionEventData = {
    item: TreeItem;
    action: string;
};

export declare type ItemClickEventData = {
    item: TreeItem;
};

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

export declare enum ManipulatorResizeOrigin {
    OppositeCorner = 0,
    Center = 1
}

export declare enum ManipulatorSide {
    None = -1,
    Top = 0,
    Bottom = 1,
    Left = 2,
    Right = 3
}

export declare type ManipulatorUpdatedEventData = {
    type: ManipulatorUpdatedEventType;
    position: v2;
    width: number;
    height: number;
    rotation: number;
    topLeft: v2;
    topRight: v2;
    bottomLeft: v2;
    bottomRight: v2;
};

export declare enum ManipulatorUpdatedEventType {
    Position = "position",
    Size = "size",
    Rotation = "rotation"
}

export declare type PaletteColor = {
    r: number;
    g: number;
    b: number;
    h: string;
};

export declare type RadioChangedEventData = {
    value: string;
    state: boolean;
};

export declare function shadowRootStyle(shadowRoot: Document | ShadowRoot, cssText: string): Promise<void>;

export declare function shadowRootStyleSync(shadowRoot: Document | ShadowRoot, cssText: string): void;

export declare function show(htmlElement: HTMLElement | SVGElement | ShadowRoot | Array<HTMLElement | SVGElement | ShadowRoot> | undefined | null): void;

export declare function styleInject(css: string): void;

export declare type TabEventData = {
    tab: HTMLHarmonyTabElement;
    originalEvent?: Event;
};

export declare function toggle(htmlElement: HTMLElement | SVGElement | ShadowRoot | undefined | null): void;

export declare type TreeAction = {
    name: string;
    element?: HTMLElement;
    innerHTML?: string;
    tooltip?: string;
};

export declare type TreeContextMenuEventData = {
    item?: TreeItem;
    buildContextMenu: (menu: HarmonyMenuItems) => void;
};

export declare class TreeItem {
    #private;
    name: string;
    icon?: string;
    kind: TreeItemKind;
    parent?: TreeItem;
    childs: Set<TreeItem>;
    actions: Set<string>;
    userData?: any;
    constructor(name: string, options?: TreeItemOptions);
    addChild(child: TreeItem): void;
    getPath(separator?: string): string;
    getLevel(): number;
    addAction(action: string): void;
    addActions(actions: Array<string>): void;
    removeAction(action: string): void;
    static createFromPathList(paths: Set<string> | Map<string, any>, options?: {
        pathSeparator?: string;
        rootUserData?: any;
        userData?: any;
        rootName?: string;
    }): TreeItem;
    walk(filter?: TreeItemFilter): Generator<TreeItem, void, unknown>;
}

export declare type TreeItemFilter = {
    name?: string;
    kind?: TreeItemKind;
    kinds?: Array<TreeItemKind>;
};

export declare enum TreeItemKind {
    Root = "root",
    Directory = "directory",
    File = "file",
    Item = "item"
}

export declare type TreeItemOptions = {
    icon?: string;
    kind?: TreeItemKind;
    parent?: TreeItem;
    childs?: Array<TreeItem>;
    userData?: any;
};

export declare function updateElement(element: HTMLElement | undefined, options: CreateElementOptions): HTMLElement | undefined;

declare type v2 = {
    x: number;
    y: number;
};

export declare const visible: typeof isVisible;

export { }
