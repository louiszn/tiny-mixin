# Tiny Mixin

Tiny Mixin is a utility for creating and applying mixins to classes in TypeScript. It aims to provide a simple and efficient way to do prototype composition as an alternative to multiple inheritance.

## Why Tiny Mixin?

There are many mixin patterns in TypeScript - from manual class wrapping to complex helper types. Tiny Mixin focuses on doing one thing well:

- Fully typed - Preserves constructor and instance types across mixin chains.
- Supports abstract classes - Works seamlessly with both abstract and concrete base classes.
- Deterministic order - Mixins are applied left-to-right with predictable override behavior.
- Cached results - Reuses previously applied (Base, Mixin) pairs using WeakMap, avoiding redundant class generation.
- Tiny & dependency-free - Minimal runtime footprint with zero external dependencies.

Tiny Mixin is designed for cases where you want clean prototype composition without the complexity of multiple inheritance or heavyweight frameworks.

## Installation

It works perfectly in Node.js and browsers. You can install it using npm or your package manager of choice:

```bash
npm install tiny-mixin
pnpm add tiny-mixin
yarn add tiny-mixin
bun add tiny-mixin
```

## Usage

In this example, we will try to create multiple animal classes with different behaviors.

### Creating a base class

```ts
abstract class Animal {
	constructor(public name: string, public age: number) {}
}
```

### Creating mixins

Since animal can have different behaviors, we will create mixins for each behavior to reuse them for different animal classes.

```ts
import { createMixin } from "tiny-mixin";

const FlyableAnimalMixin = createMixin((base) => {
	class FlyableAnimal extends base {
		public fly() {
			// makes the animal fly	
		}
	}

	return FlyableAnimal;
});

const SwimmableAnimalMixin = createMixin((base) => {
	class SwimmableAnimal extends base {
		public swim() {
			// makes the animal swim
		}
	}

	return SwimmableAnimal;
});

const WalkableAnimalMixin = createMixin((base) => {
	class WalkableAnimal extends base {
		public walk() {
			// makes the animal walk
		}
	}

	return WalkableAnimal;
});
```

If you need to reference the base class to an existing class, you can do this:

```ts
import { createMixin, type ConstructorLike } from "tiny-mixin";

abstract class Animal { ... }

const FlyableAnimalMixin = createMixin((base: ConstructorLike<Animal>) => {
	// Make it abstract like the base so it can be used as a mixin
	abstract class FlyableAnimal extends base {
		public fly() {
			console.log(`${this.name} is flying`);
		}
	}

	return FlyableAnimal;
});
```

### Using mixins

After creating the mixins, we can use them to create animal classes with different behaviors.

```ts
import { createMixin, applyMixins } from "tiny-mixin";

const FlyableAnimalMixin = createMixin((base) => ...);
const SwimmableAnimalMixin = createMixin((base) => ...);
const WalkableAnimalMixin = createMixin((base) => ...);

class Duck extends applyMixins(Animal, [FlyableAnimalMixin, SwimmableAnimalMixin, WalkableAnimalMixin]) {
	// ...
}

const duck = new Duck("Duck", 2);

// Now you can do these
duck.fly();
duck.swim();
duck.walk();

console.log(`${duck.name} is ${duck.age} years old`);
```

## Notes

Mixins are applied in the order they appear in the array, so the first mixin will be applied first, followed by the second mixin, and so on. This is useful for creating a composition-like behavior. 

The mixin result will also be cached to avoid re-applying the same mixin multiple times.

```ts
applyMixins(Base, [A, B])
// is equivalent to:
B(A(Base))
```

```ts
const Duck1 = applyMixins(Animal, [FlyableAnimalMixin, SwimmableAnimalMixin, WalkableAnimalMixin]);
const Duck2 = applyMixins(Animal, [FlyableAnimalMixin, SwimmableAnimalMixin, WalkableAnimalMixin]);

console.log(Duck1 === Duck2); // true
```

```ts
const Duck1 = applyMixins(Animal, [FlyableAnimalMixin, SwimmableAnimalMixin, WalkableAnimalMixin]);
const Duck2 = applyMixins(Animal, [FlyableAnimalMixin, WalkableAnimalMixin, SwimmableAnimalMixin]);

console.log(Duck1 === Duck2); // false
```

It is also important to check for mixin conflicts, as they can cause unexpected behavior.

## Contributing

Contributions are always welcome! If you find a bug or have a suggestion, please open an [issue](https://github.com/louiszn/tiny-mixin/issues) or [pull request](https://github.com/louiszn/tiny-mixin/pulls).

## Support

If you like this project and want to support its development, you can buy me a coffee:

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/louiszn)
