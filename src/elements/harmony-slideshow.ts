import { I18n } from '../harmony-i18n';
import { createElement, hide, show, display, createShadowRoot } from '../harmony-html';
import slideshowCSS from '../css/harmony-slideshow.css';
import slideshowZoomCSS from '../css/harmony-slideshow-zoom.css';
import { shadowRootStyleSync } from '../harmony-css';
import { toBool } from '../utils/attributes';
import { injectGlobalCss } from '../utils/globalcss';

const resizeCallback = (entries: Array<ResizeObserverEntry>, observer: ResizeObserver) => {
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
	images?: Array<string>;
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
	#images: Array<HTMLImageElement> = [];
	#imgSet = new Set();
	#htmlZoomImage: HTMLImageElement;
	#resizeObserver = new ResizeObserver(resizeCallback);
	#autoPlay = false;
	#autoPlayDelay = 0;
	#smoothScroll = false;
	#smoothScrollTransitionTime = 0;
	#autoplayTimeout: number = 0;

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
				}) as HTMLElement,
				events: {
					mouseover: (event: MouseEvent) => this.#zoomImage(event),
					mousemove: (event: MouseEvent) => this.#zoomImage(event),
					mouseout: (event: MouseEvent) => this.#zoomImage(event),
				},
			}) as HTMLElement,
		}) as HTMLElement;

		createElement('div', {
			class: 'controls',
			parent: this.#shadowRoot,
			childs: [
				createElement('div', {
					class: 'previous-image',
					events: {
						click: (event: MouseEvent) => { this.previousImage(); this.setAutoPlay(false); },
					},
				}),
				createElement('div', {
					class: 'next-image',
					events: {
						click: (event: MouseEvent) => { this.nextImage(); this.setAutoPlay(false); },
					},
				}),
				this.#htmlPlayButton = createElement('div', {
					class: 'play',
					events: {
						click: () => this.play(true),
					},
				}) as HTMLElement,
				this.#htmlPauseButton = createElement('div', {
					class: 'pause',
					events: {
						click: () => this.play(false),
					},
				}) as HTMLElement,
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
		}) as HTMLElement;
	}

	previousImage() {
		if (this.#currentImage == 0) {
			this.setImage(this.#images.length - 1);
		} else {
			this.setImage(this.#currentImage - 1);
		}
	}

	nextImage() {
		if (this.#currentImage >= this.#images.length - 1) {
			this.setImage(0);
		} else {
			this.setImage(this.#currentImage + 1);
		}
	}

	setImage(imageId: number) {
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

	addImage(htmlImage: HTMLImageElement) {
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

				let htmlThumbnailImage = htmlImage.cloneNode();
				this.#htmlThumbnails.append(htmlThumbnailImage);
				htmlThumbnailImage.addEventListener('click', () => this.active = htmlImage);
			}
		}
	}

	removeAllImages() {
		this.#images = [];
		this.#imgSet = new Set();
		this.#htmlImagesInner.innerHTML = '';
		this.#htmlThumbnails.innerHTML = '';
		this.#activeImage = undefined;

		// Remove pending images
		let list = [];
		for (let child of this.children) {
			if (child.constructor.name == 'HTMLImageElement') {
				list.push(child);
			}
		}
		list.forEach(element => element.remove());
	}

	refresh() {
		for (let image of this.#images) {
			//image.style.display = (image ==  this.#activeImage) ? '' : 'none';
			image.style.display = '';
		}
	}

	#processOptions(options: HarmonySlideshowOptions = {}) {
		this.setAutoPlay(options.autoPlay ?? true);
		this.#autoPlayDelay = options.autoPlayDelay ?? DEFAULT_AUTO_PLAY_DELAY;
		this.#smoothScroll = options.smoothScroll ?? true;
		this.#smoothScrollTransitionTime = options.smoothScrollTransitionTime ?? DEFAULT_SCROLL_TRANSITION_TIME;

		if (options.images) {
			for (let image of options.images) {
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

	#processChilds() {
		//This is a 2 steps process cause we may change DOM
		const list: Array<HTMLImageElement> = [];
		for (let child of this.children) {
			list.push(child as HTMLImageElement);
		}
		list.forEach(element => this.addImage(element));
	}

	set active(htmlImage: HTMLImageElement) {
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

	setAutoPlay(autoPlay: boolean) {
		this.#autoPlay = autoPlay && this.#dynamic;
		if (autoPlay) {
			hide(this.#htmlPlayButton);
			show(this.#htmlPauseButton);
		} else {
			show(this.#htmlPlayButton);
			hide(this.#htmlPauseButton);
		}
	}

	play(autoPlay?: boolean) {
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
		let rect = this.#htmlImages.getBoundingClientRect();
		let widthRatio = 1.0;
		let heightRatio = 1.0;
		for (let image of this.#images) {
			this.checkImageSize(image, rect);
		}
	}

	checkImageSize(htmlImage: HTMLImageElement, rect = this.#htmlImages.getBoundingClientRect()) {
		if (this.#activeImage != htmlImage) {
			return;
		}
		let widthRatio = 1.0;
		let heightRatio = 1.0;

		let naturalWidth = htmlImage.naturalWidth;
		let naturalHeight = htmlImage.naturalHeight;

		if (naturalWidth > rect.width) {
			widthRatio = rect.width / naturalWidth;
		}
		if (naturalHeight > rect.height) {
			heightRatio = rect.height / naturalHeight;
		}

		let ratio = Math.min(widthRatio, heightRatio);

		let imageWidth = naturalWidth * ratio + 'px';
		let imageHeight = naturalHeight * ratio + 'px';
		this.#htmlImagesOuter.style.width = imageWidth;
		this.#htmlImagesOuter.style.height = imageHeight;
	}

	#zoomImage(event: MouseEvent) {
		let activeImage = this.#activeImage;
		switch (event.type) {
			case 'mouseover':
				if (activeImage) {
					this.#htmlZoomImage.src = activeImage.src;
					show(this.#zoomShadowRoot);
				}
				break;
			case 'mousemove':
				if (activeImage) {

					let deltaWidth = this.#zoomShadowRoot.host.clientWidth - this.#htmlZoomImage.clientWidth;
					let deltaHeight = this.#zoomShadowRoot.host.clientHeight - this.#htmlZoomImage.clientHeight;

					let mouseX = event.offsetX / activeImage.offsetWidth - 0.5;
					let mouseY = event.offsetY / activeImage.offsetHeight - 0.5;

					/*if (deltaWidth >= 0) {
						this.#htmlZoomImage.style.left = `${-mouseX * deltaWidth}px`;
					} else {

					}
					if (deltaHeight >= 0) {
						this.#htmlZoomImage.style.top = `${-mouseY * deltaHeight}px`;
					}*/
					//console.log(deltaWidth, deltaHeight);
					//console.log(mouseX, mouseY);
					this.#htmlZoomImage.style.left = `${Math.sign(deltaWidth) * mouseX * deltaWidth}px`;
					this.#htmlZoomImage.style.top = `${Math.sign(deltaHeight) * mouseY * deltaHeight}px`;



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

	#initObserver() {
		let config = { childList: true, subtree: true };
		const mutationCallback = (mutationsList: Array<MutationRecord>, observer: MutationObserver) => {
			for (const mutation of mutationsList) {
				for (let addedNode of mutation.addedNodes) {
					if (addedNode.parentNode == this) {
						this.addImage(addedNode as HTMLImageElement);
					}
				}
			}
		};

		let observer = new MutationObserver(mutationCallback);
		observer.observe(this, config);

	}

	attributeChangedCallback(name: string, oldValue: string, newValue: string) {
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
export function defineHarmonySlideshow() {
	if (window.customElements && !definedSlideshow) {
		customElements.define('harmony-slideshow', HTMLHarmonySlideshowElement);
		definedSlideshow = true;
		injectGlobalCss();
	}
}
