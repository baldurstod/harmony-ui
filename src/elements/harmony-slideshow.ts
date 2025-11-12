import slideshowZoomCSS from '../css/harmony-slideshow-zoom.css';
import slideshowCSS from '../css/harmony-slideshow.css';
import { shadowRootStyleSync } from '../harmony-css';
import { createElement, createShadowRoot, hide, show } from '../harmony-html';
import { I18n } from '../harmony-i18n';
import { toBool } from '../utils/attributes';
import { injectGlobalCss } from '../utils/globalcss';

const resizeCallback = (entries: ResizeObserverEntry[]): void => {
	entries.forEach(entry => {
		(entry.target as HTMLHarmonySlideshowElement).onResized();
	});
};

const DEFAULT_AUTO_PLAY_DELAY = 3000;
const DEFAULT_SCROLL_TRANSITION_TIME = 0.5;

export type HarmonySlideshowOptions = {
	autoPlay?: boolean;
	autoPlayDelay?: number;
	smoothScroll?: boolean;
	smoothScrollTransitionTime?: number;
	images?: string[];
	class?: string;
	id?: string;
}

export class HTMLHarmonySlideshowElement extends HTMLElement {
	#shadowRoot: ShadowRoot;
	#zoomShadowRoot: ShadowRoot;
	#activeImage?: HTMLImageElement;
	#currentImage = 0;
	#doOnce = true;
	#doOnceOptions: HarmonySlideshowOptions;
	#dynamic = true;
	#htmlImages: HTMLElement;
	#htmlImagesOuter: HTMLElement;
	#htmlImagesInner: HTMLElement;
	#htmlPauseButton: HTMLElement;
	#htmlPlayButton: HTMLElement;
	#htmlThumbnails: HTMLElement;
	#images: HTMLImageElement[] = [];
	#imgSet = new Set<HTMLImageElement>();
	#htmlZoomImage: HTMLImageElement;
	#resizeObserver = new ResizeObserver(resizeCallback);
	#autoPlay = false;
	#autoPlayDelay = 0;
	#smoothScroll = false;
	#smoothScrollTransitionTime = 0;
	#autoplayTimeout = 0;

	constructor(options: HarmonySlideshowOptions) {
		super();
		this.#doOnceOptions = options;
		this.#initObserver();

		this.#shadowRoot = this.attachShadow({ mode: 'closed' });
		I18n.observeElement(this.#shadowRoot);
		shadowRootStyleSync(this.#shadowRoot, slideshowCSS);// sync version is used to ensure style is loaded before computation occurs
		this.#htmlImages = createElement('div', {
			class: 'images',
			parent: this.#shadowRoot,
			child: this.#htmlImagesOuter = createElement('div', {
				class: 'images-outer',
				child: this.#htmlImagesInner = createElement('div', {
					class: 'images-inner',
				}),
				events: {
					mouseover: (event: MouseEvent) => this.#zoomImage(event),
					mousemove: (event: MouseEvent) => this.#zoomImage(event),
					mouseout: (event: MouseEvent) => this.#zoomImage(event),
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
						click: (): void => { this.previousImage(); this.setAutoPlay(false); },
					},
				}),
				createElement('div', {
					class: 'next-image',
					events: {
						click: (): void => { this.nextImage(); this.setAutoPlay(false); },
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
				mouseenter: (event: MouseEvent) => (event.target as HTMLElement).style.opacity = 'unset',
				mouseleave: (event: MouseEvent) => (event.target as HTMLElement).style.opacity = '0',
			},
		});

		this.#htmlZoomImage = createElement('img') as HTMLImageElement;
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

	previousImage(): void {
		if (this.#currentImage == 0) {
			this.setImage(this.#images.length - 1);
		} else {
			this.setImage(this.#currentImage - 1);
		}
	}

	nextImage(): void {
		if (this.#currentImage >= this.#images.length - 1) {
			this.setImage(0);
		} else {
			this.setImage(this.#currentImage + 1);
		}
	}

	setImage(imageId: number): void {
		this.#currentImage = imageId;
		this.active = this.#images[imageId];
	}

	connectedCallback(): void {
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

	disconnectedCallback(): void {
		if (this.#zoomShadowRoot) {
			this.#zoomShadowRoot.host.remove();
			hide(this.#zoomShadowRoot);
		}
	}

	addImage(htmlImage: HTMLImageElement): void {
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
				}).catch(() => { return })

				htmlImage.onload = (): void => this.checkImageSize(htmlImage);

				const htmlThumbnailImage = htmlImage.cloneNode();
				this.#htmlThumbnails.append(htmlThumbnailImage);
				htmlThumbnailImage.addEventListener('click', () => this.active = htmlImage);
			}
		}
	}

	removeAllImages(): void {
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

	refresh(): void {
		for (const image of this.#images) {
			//image.style.display = (image ==  this.#activeImage) ? '' : 'none';
			image.style.display = '';
		}
	}

	#processOptions(options: HarmonySlideshowOptions = {}): void {
		this.setAutoPlay(options.autoPlay ?? true);
		this.#autoPlayDelay = options.autoPlayDelay ?? DEFAULT_AUTO_PLAY_DELAY;
		this.#smoothScroll = options.smoothScroll ?? true;
		this.#smoothScrollTransitionTime = options.smoothScrollTransitionTime ?? DEFAULT_SCROLL_TRANSITION_TIME;

		if (options.images) {
			for (const image of options.images) {
				const htmlImage = createElement('img') as HTMLImageElement;
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

	#processChilds(): void {
		//This is a 2 steps process cause we may change DOM
		const list: HTMLImageElement[] = [];
		for (const child of this.children) {
			list.push(child as HTMLImageElement);
		}
		list.forEach(element => this.addImage(element));
	}

	set active(htmlImage: HTMLImageElement | undefined) {
		if (htmlImage) {
			this.#activeImage = htmlImage;
			this.refresh();
			this.checkImageSize(htmlImage);
			this.#htmlImagesInner.style.left = `-${htmlImage.offsetLeft}px`;
			this.play();
		}
	}

	set dynamic(dynamic: boolean) {
		this.#dynamic = dynamic;
		if (!dynamic) {
			this.setAutoPlay(false);
			this.setImage(0);
		}
		if (dynamic) {
			this.classList.add('dynamic');
		} else {
			this.classList.remove('dynamic');
		}
	}

	setAutoPlay(autoPlay: boolean): void {
		this.#autoPlay = autoPlay && this.#dynamic;
		if (autoPlay) {
			hide(this.#htmlPlayButton);
			show(this.#htmlPauseButton);
		} else {
			show(this.#htmlPlayButton);
			hide(this.#htmlPauseButton);
		}
	}

	play(autoPlay?: boolean): void {
		if (autoPlay !== undefined) {
			this.setAutoPlay(autoPlay);
		}

		clearTimeout(this.#autoplayTimeout);
		if (this.#autoPlay) {
			this.#autoplayTimeout = setTimeout(() => this.nextImage(), this.#autoPlayDelay);
		}
	}

	onResized(): void {
		this.checkImagesSize();
	}

	checkImagesSize(): void {
		const rect = this.#htmlImages.getBoundingClientRect();
		for (const image of this.#images) {
			this.checkImageSize(image, rect);
		}
	}

	checkImageSize(htmlImage: HTMLImageElement, rect = this.#htmlImages.getBoundingClientRect()): void {
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

	#zoomImage(event: MouseEvent): void {
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
			default:

		}
	}

	#initObserver(): void {
		const config = { childList: true, subtree: true };
		const mutationCallback = (mutationsList: MutationRecord[]): void => {
			for (const mutation of mutationsList) {
				for (const addedNode of mutation.addedNodes) {
					if (addedNode.parentNode == this) {
						this.addImage(addedNode as HTMLImageElement);
					}
				}
			}
		};

		const observer = new MutationObserver(mutationCallback);
		observer.observe(this, config);

	}

	attributeChangedCallback(name: string, oldValue: string, newValue: string): void {
		switch (name) {
			case 'dynamic':
				this.dynamic = toBool(newValue);
				break;
		}
	}

	static get observedAttributes(): string[] {
		return ['dynamic'];
	}
}

let definedSlideshow = false;
export function defineHarmonySlideshow(): void {
	if (window.customElements && !definedSlideshow) {
		customElements.define('harmony-slideshow', HTMLHarmonySlideshowElement);
		definedSlideshow = true;
		injectGlobalCss();
	}
}
