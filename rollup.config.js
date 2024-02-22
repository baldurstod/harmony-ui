import fs from 'fs';
import postcss from 'postcss';
import cssnano from 'cssnano';
import {elements} from './src/elements/.elements.js';
import image from '@rollup/plugin-image';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import css from 'rollup-plugin-import-css';

async function writeElement(elementName, elementClass, isBrowser = false) {
	let cssPath = `./src/css/${elementName}.css`;
	let input = fs.readFileSync(cssPath);
	let css = await postcss([cssnano()]).process(input, {from: undefined,});

	let fileContent = `import {${elementClass}, styleInject} from '${isBrowser ? '../../harmony-ui.browser.js' : '../harmony-ui.js'}';
import {InjectUiStyle} from './.inject-ui-style.js';
if (window.customElements) {
	styleInject(\`${css}\`);
	customElements.define('${elementName}', ${elementClass});
}`;

	fs.writeFile(`./dist/define/${isBrowser ? 'browser/' : ''}${elementName}.js`, Buffer.from(fileContent), async (err) => {if (err) throw err});
}

async function writeGlobal(isBrowser = false) {
	let cssPath = `./src/css/harmony-ui.css`;
	let input = fs.readFileSync(cssPath);
	let css = await postcss([cssnano()]).process(input, {from: undefined,});

	let fileContent = `import {styleInject} from '${isBrowser ? '../../harmony-ui.browser.js' : '../harmony-ui.js'}';
export const InjectUiStyle = (function () {
	styleInject(\`${css}\`);
}());`;

	fs.writeFile(`./dist/define/${isBrowser ? 'browser/' : ''}.inject-ui-style.js`, Buffer.from(fileContent), async (err) => {if (err) throw err});
}

fs.mkdirSync('./dist/define/', {recursive: true});
fs.mkdirSync('./dist/define/browser/', {recursive: true});

for (let elementName in elements) {
	let elementClass = elements[elementName];
	writeElement(elementName, elementClass);
}
writeGlobal();

for (let elementName in elements) {
	let elementClass = elements[elementName];
	writeElement(elementName, elementClass, true);
}
writeGlobal(true);

export default [
	{
		input: './src/index.js',
		output: {
			file: './dist/harmony-ui.js',
			format: 'esm'
		},
		plugins: [
			css(),
			image(),
		],
		external: [
			'harmony-svg',
		],
	},
	{
		input: './src/index.js',
		output: {
			file: './dist/harmony-ui.browser.js',
			format: 'esm'
		},
		plugins: [
			css(),
			image(),
			nodeResolve(),
		],
	},
];
