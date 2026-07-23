import { applyMixins, type Constructor, createMixin, getMixins, hasMixin } from "../src";

class Base {
	static readonly type = "base";

	public readonly name: string;

	protected readonly prefix = "hello";

	constructor(name: string) {
		this.name = name;
	}

	greet(): string {
		return `${this.prefix}, ${this.name}`;
	}
}

export const FooMixin = createMixin(<TBase extends Constructor<Base>>(base: TBase) => {
	return class Foo extends base {
		foo(): string {
			return `${this.name}:foo`;
		}

		protected fooProtected(): string {
			return "foo-protected";
		}

		private fooPrivate(): string {
			return "foo-private";
		}

		#fooNativePrivate(): string {
			return "foo-native-private";
		}

		testInternals(): string[] {
			return [this.fooProtected(), this.fooPrivate(), this.#fooNativePrivate()];
		}
	};
});

export const BarMixin = createMixin(<TBase extends Constructor<Base>>(base: TBase) => {
	return class Bar extends base {
		bar(): string {
			return `${this.name}:bar`;
		}
	};
});

export const MixedBase = applyMixins(Base, [FooMixin, BarMixin]);
export class Test extends MixedBase {
	baz(): string {
		return [this.greet(), this.foo(), this.bar()].join(" | ");
	}
}

const test = new Test("Louis");

console.log(test.greet());
console.log(test.foo());
console.log(test.bar());
console.log(test.baz());
console.log(test.testInternals());

console.log(Test.type);

console.log(hasMixin(Test, FooMixin));
console.log(hasMixin(Test, BarMixin));
console.log(getMixins(Test).size);

const MixedAgain = applyMixins(Base, [FooMixin, BarMixin]);

console.log(MixedAgain === MixedBase);

// Public mixin methods should exist.
test.foo();
test.bar();

// Private and protected members must not leak into the composed public type.

// @ts-expect-error protected member
test.fooProtected();

// @ts-expect-error private member
test.fooPrivate();

// @ts-expect-error protected base member
test.prefix;
