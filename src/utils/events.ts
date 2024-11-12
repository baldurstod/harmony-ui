export function cloneEvent(event: Event): Event {
	return new (event.constructor as any)(event.type, event);
}
