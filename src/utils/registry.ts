const objects = new Map<string, object>();

export function isRegistered(name: string): boolean {
	return objects.has(name.toLowerCase());
}

export function registerObject(name: string, o: object): void {
	if (objects.has(name.toLowerCase())) {
		console.error(`${name.toLowerCase()} is already registered`);
	}
	objects.set(name.toLowerCase(), o);
}

export function getObject(name: string): object | undefined {
	return objects.get(name.toLowerCase());
}
