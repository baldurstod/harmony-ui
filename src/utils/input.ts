import { createElement } from '../harmony-html';

export interface CreateTextInputOptions {
	label: string;
	class?: string;
	placeholder?: string;
	defaultValue?: string;
	$input?: (event: InputEvent) => void,
	$change?: (event: InputEvent) => void,
}

export function createTextInput(options: CreateTextInputOptions): HTMLLabelElement {
	return createElement('label', {
		class: options.class,
		childs: [
			createElement('span', {
				i18n: options.label,
			}),
			createElement('input', {
				i18n: {
					placeholder: options.placeholder,
				},
				value: options.defaultValue ?? '',
				$input: options.$input,
				$change: options.$change,
			}),
		]
	});

}
