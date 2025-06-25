interface SetConstructor {
  new(): Set<never>
}

interface WeakSetConstructor {
  new(): WeakSet<never>
}

interface MapConstructor {
  new(): Map<never, never>;
}

interface WeakMapConstructor {
  new(): WeakMap<never, never>;
}
