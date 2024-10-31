function rgbToHsl(r: number, g: number, b: number) {
	const max = Math.max(r, g, b), min = Math.min(r, g, b);
	let h = 0, s, l = (max + min) / 2;

	if (max == min) {
		h = s = 0; // achromatic
	} else {
		var d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

		switch (max) {
			case r: h = (g - b) / d + (g < b ? 6 : 0); break;
			case g: h = (b - r) / d + 2; break;
			case b: h = (r - g) / d + 4; break;
		}

		h /= 6;
	}

	return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number) {
	var r, g, b;

	if (s == 0) {
		r = g = b = l; // achromatic
	} else {
		function hue2rgb(p: number, q: number, t: number) {
			if (t < 0) t += 1;
			if (t > 1) t -= 1;
			if (t < 1 / 6) return p + (q - p) * 6 * t;
			if (t < 1 / 2) return q;
			if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
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

export class Color {
	#rgba: Array<number> = [];
	constructor({ red = 0, green = 0, blue = 0, alpha = 1, hex = '' } = {}) {
		this.#rgba[0] = red;
		this.#rgba[1] = green;
		this.#rgba[2] = blue;
		this.#rgba[3] = alpha;

		if (hex) {
			this.setHex(hex);
		}
	}

	setHue(hue: number) {
		const hsl = rgbToHsl(this.#rgba[0], this.#rgba[1], this.#rgba[2]);


		const rgb = hslToRgb(hue, hsl[1], hsl[2]);

		this.#rgba[0] = rgb[0];
		this.#rgba[1] = rgb[1];
		this.#rgba[2] = rgb[2];
	}

	setSatLum(sat: number, lum: number) {
		const hsl = rgbToHsl(this.#rgba[0], this.#rgba[1], this.#rgba[2]);


		const rgb = hslToRgb(hsl[0], sat, lum);

		this.#rgba[0] = rgb[0];
		this.#rgba[1] = rgb[1];
		this.#rgba[2] = rgb[2];

	}

	setHex(hex: string) {
		hex = (hex.startsWith('#') ? hex.slice(1) : hex)
			.replace(/^(\w{3})$/, '$1F')                   //987      -> 987F
			.replace(/^(\w)(\w)(\w)(\w)$/, '$1$1$2$2$3$3$4$4')      //9876     -> 99887766
			.replace(/^(\w{6})$/, '$1FF');                 //987654   -> 987654FF

		if (!hex.match(/^([0-9a-fA-F]{8})$/)) {
			throw new Error('Unknown hex color; ' + hex);
		}

		const rgba = hex
			.match(/^(\w\w)(\w\w)(\w\w)(\w\w)$/)?.slice(1)  //98765432 -> 98 76 54 32
			.map(x => parseInt(x, 16));                    //Hex to decimal

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
}
