export function createElement(tagName, options) {
	let element = document.createElement(tagName);
	createElementOptions(element, options);
	return element;
}

export function createElementNS(namespaceURI, tagName, options) {
	let element = document.createElementNS(namespaceURI, tagName);
	createElementOptions(element, options);
	return element;
}

export function updateElement(element, options) {
	createElementOptions(element, options);
	return element;
}

function createElementOptions(element, options) {
	if (options) {
		for (let optionName in options) {
			let optionValue = options[optionName];
			switch (optionName) {
				case 'class':
					element.classList.add(...optionValue.split(' '));
					break;
				case 'i18n':
					element.setAttribute('data-i18n', optionValue);
					element.innerHTML = optionValue;
					element.classList.add('i18n');
					break;
				case 'i18n-title':
					element.setAttribute('data-i18n-title', optionValue);
					element.classList.add('i18n-title');
					break;
				case 'i18n-placeholder':
					element.setAttribute('data-i18n-placeholder', optionValue);
					element.classList.add('i18n-placeholder');
					break;
				case 'i18n-label':
					element.setAttribute('data-i18n-label', optionValue);
					element.classList.add('i18n-label');
					break;
				case 'parent':
					optionValue.append(element);
					break;
				case 'child':
					element.append(optionValue);
					break;
				case 'childs':
					element.append(...optionValue);
					break;
				case 'events':
					for (let eventType in optionValue) {
						let eventParams = optionValue[eventType];
						if (typeof eventParams === 'function') {
							element.addEventListener(eventType, eventParams);
						} else {
							element.addEventListener(eventType, eventParams.listener, eventParams.options);
						}
					}
					break;
				case 'hidden':
					if (optionValue) {
						hide(element);
					}
					break;
				case 'attributes':
					for (let attributeName in optionValue) {
						element.setAttribute(attributeName, optionValue[attributeName]);
					}
					break;
				case 'list':
					element.setAttribute(optionName, optionValue);
					break;
				default:
					if (optionName.startsWith('data-')) {
						element.setAttribute(optionName, optionValue);
					} else {
						element[optionName] = optionValue;
					}
					break;
			}
		}
	}
	return element;
}

export function display(htmlElement, visible) {
	if (htmlElement == undefined) return;

	if (visible) {
		htmlElement.style.display = '';
	} else {
		htmlElement.style.display = 'none';
	}
}

export function show(htmlElement) {
	display(htmlElement, true);
}

export function hide(htmlElement) {
	display(htmlElement, false);
}

export function toggle(htmlElement) {
	if (!(htmlElement instanceof HTMLElement)) {
		return;
	}
	if (htmlElement.style.display == 'none') {
		htmlElement.style.display = '';
	} else {
		htmlElement.style.display = 'none';
	}
}

export function visible(htmlElement) {
	return htmlElement.style.display == ''
}

export function styleInject(css) {
	document.head.append(createElement('style', {textContent: css}));
}
