export function cloneEvent(event: Event): Event {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
	return new (event.constructor as any)(event.type, event);
}
