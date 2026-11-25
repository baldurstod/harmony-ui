import { CompoundElement, createElement } from '../harmony-html';

export interface CreateTextInputOptions {
	label: string;
	class?: string;
	placeholder?: string;
	defaultValue?: string;
	$input?: (event: InputEvent) => void,
	$change?: (event: InputEvent) => void,
}

export interface CompoundInputElement extends CompoundElement {
	input: HTMLInputElement;
}

export function createTextInput(options: CreateTextInputOptions): CompoundInputElement {
	let input: HTMLInputElement;
	const parent = createElement('label', {
		class: options.class,
		childs: [
			createElement('span', {
				i18n: options.label,
			}),
			input = createElement('input', {
				i18n: {
					placeholder: options.placeholder,
				},
				value: options.defaultValue ?? '',
				$input: options.$input,
				$change: options.$change,
			}),
		]
	});
	return { parent, input };
}
