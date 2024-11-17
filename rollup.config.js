import fs from 'fs';
import postcss from 'postcss';
import cssnano from 'cssnano';
import { elements } from './src/elements/.elements.js';
import image from '@rollup/plugin-image';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import css from 'rollup-plugin-import-css';
import child_process from 'child_process';

const TEMP_BUILD = './dist/dts/index.js';

async function writeElement(elementName, elementClass, injectCSS, isBrowser = false) {
	let cssPath = `./src/css/${elementName}.css`;
	let input = fs.readFileSync(cssPath);
	let css = await postcss([cssnano()]).process(input, { from: undefined, });

	let fileContent = `import {${elementClass}, styleInject} from '${isBrowser ? '../../harmony-ui.browser.js' : '../index.js'}';
import {InjectUiStyle} from './.inject-ui-style.js';
if (window.customElements) {
${injectCSS ? `	styleInject(\`${css}\`);` : ''}
	customElements.define('${elementName}', ${elementClass});
}`;

	fs.writeFile(`./dist/define/${isBrowser ? 'browser/' : ''}${elementName}.js`, Buffer.from(fileContent), async (err) => { if (err) throw err });
}

async function writeGlobal(isBrowser = false) {
	let cssPath = `./src/css/harmony-ui.css`;
	let input = fs.readFileSync(cssPath);
	let css = await postcss([cssnano()]).process(input, { from: undefined, });

	let fileContent = `import {styleInject} from '${isBrowser ? '../../harmony-ui.browser.js' : '../index.js'}';
export const InjectUiStyle = (function () {
	styleInject(\`${css}\`);
}());`;

	fs.writeFile(`./dist/define/${isBrowser ? 'browser/' : ''}.inject-ui-style.js`, Buffer.from(fileContent), async (err) => { if (err) throw err });
}
/*
async function writeDefines(isBrowser = false) {
	let fileContent = `import { styleInject } from '${isBrowser ? '../../harmony-ui.browser.js' : '../index.js'}';`;
	for (const element of elements) {
		let cssPath = `./src/css/${element.name}.css`;
		let input = fs.readFileSync(cssPath);
		let css = await postcss([cssnano()]).process(input, { from: undefined, });
		const name = element.name.replaceAll('-', '');
		fileContent += `
import { ${element.class} } from '${isBrowser ? '../../harmony-ui.browser.js' : '../index.js'}';
let defined${name} = false;
export function define${name}() {
	if (window.customElements && !defined${name}) {
${element.injectCSS ? `		styleInject(\`${css}\`);` : ''}
		customElements.define('${element.name}', ${element.class});
		defined${name} = true;
	}
}
`;
	}

	fs.writeFile(`./dist/define/${isBrowser ? 'browser/' : ''}defines.js`, Buffer.from(fileContent), async (err) => { if (err) throw err });
}*/

//fs.mkdirSync('./dist/define/', { recursive: true });
//fs.mkdirSync('./dist/define/browser/', { recursive: true });

//writeElements(false);
//writeElements(true);

function writeElements(isBrowser) {
	for (const element of elements) {
		writeElement(element.name, element.class, element.injectCSS, isBrowser);
	}
	writeGlobal(isBrowser);
	//writeDefines(isBrowser);
}

export default [
	{
		input: './src/index.ts',
		output: {
			file: TEMP_BUILD,
			format: 'esm'
		},
		plugins: [
			css(),
			image(),
			typescript({
				"declaration": true,
				"declarationMap": true,
				"declarationDir": "dist/dts",
			}),
			{
				name: 'postbuild-commands',
				closeBundle: async () => {
					await postBuildCommands()
				}
			},
		],
		external: [
			'harmony-svg',
		],
	},
	{
		input: './src/index.ts',
		output: {
			file: './dist/harmony-ui.browser.js',
			format: 'esm'
		},
		plugins: [
			css(),
			image(),
			typescript(),
			nodeResolve(),
		],
	},
];

async function postBuildCommands() {
	fs.copyFile(TEMP_BUILD, './dist/index.js', err => { if (err) throw err });
	return new Promise(resolve => child_process.exec(
		'api-extractor run --local --verbose --typescript-compiler-folder ./node_modules/typescript',
		(error, stdout, stderr) => {
			if (error) {
				console.log(error);
			}
			resolve("done")
		},
	));
}
