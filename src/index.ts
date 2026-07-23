/**
 * Represents a class constructor.
 *
 * @template T - The instance type produced by the constructor.
 * @template Args - The argument tuple accepted by the constructor.
 */
// biome-ignore lint/suspicious/noExplicitAny: Accept various types
export type Constructor<T = any, Args extends any[] = any[]> = new (...args: Args) => T;

/**
 * Represents an abstract class constructor.
 *
 * @template T - The instance type produced by the constructor.
 * @template Args - The argument tuple accepted by the constructor.
 */
// biome-ignore lint/suspicious/noExplicitAny: Accept various types
export type AbstractConstructor<T = any, Args extends any[] = any[]> = abstract new (...args: Args) => T;

/**
 * Represents a constructor, either a regular or abstract constructor.
 *
 * @template T - The instance type produced by the constructor.
 * @template Args - The argument tuple accepted by the constructor.
 */
// biome-ignore lint/suspicious/noExplicitAny: Accept various types
export type ConstructorLike<T = any, Args extends any[] = any[]> =
	| Constructor<T, Args>
	| AbstractConstructor<T, Args>;

/**
 * Represents a mixin function.
 *
 * A mixin receives a base constructor and returns a new constructor
 * extending that base. The returned constructor must be assignable
 * to the original base type.
 *
 * @template TBase - The base constructor type the mixin can extend.
 * @template TResult - The resulting constructor type.
 */
export type Mixin<TBase extends ConstructorLike = ConstructorLike, TResult extends TBase = TBase> = (
	base: TBase,
) => TResult;

/**
 * Represents any mixin regardless of its base and result types.
 *
 * This is used internally when storing or iterating over heterogeneous
 * mixins without requiring each mixin to accept every ConstructorLike.
 */
// biome-ignore lint/suspicious/noExplicitAny: Accept various mixin signatures
export type AnyMixin = Mixin<any, ConstructorLike>;

/**
 * Recursively applies a tuple of mixins at the type level.
 *
 * This type models the resulting constructor after sequentially
 * applying each mixin in the provided tuple.
 *
 * The mixins are applied in order.
 *
 * @template TBase - The initial base constructor.
 * @template TMixins - A tuple of mixin functions.
 */
// biome-ignore-start lint/suspicious/noExplicitAny: Accept various types
export type ApplyMixins<
	TBase extends ConstructorLike,
	TMixins extends readonly AnyMixin[],
> = TMixins extends readonly [infer First extends AnyMixin, ...infer Rest extends readonly AnyMixin[]]
	? TBase & ApplyMixins<ReturnType<First>, Rest>
	: TBase;
// biome-ignore-end lint/suspicious/noExplicitAny: Accept various types

const MIXINS_SYMBOL = Symbol("mixins");

const EMPTY_SET: ReadonlySet<AnyMixin> = new Set();

const mixinCache = new WeakMap<ConstructorLike, WeakMap<AnyMixin, ConstructorLike>>();

/**
 * Creates a typed mixin function.
 *
 * This is primarily a helper for preserving type inference when
 * defining mixins. It does not modify runtime behavior.
 *
 * @template TBase - The initial base constructor.
 * @template TResult - The resulting constructor type.
 *
 * @param mixin - The mixin function.
 * @returns The same mixin function, with preserved generics.
 */
export function createMixin<const TMixin extends AnyMixin>(mixin: TMixin): TMixin {
	return mixin;
}

/**
 * Applies a sequence of mixins to a base constructor.
 *
 * Mixins are applied in the order they appear in the array.
 *
 * This function memoizes intermediate results using a WeakMap,
 * ensuring:
 * - Each (Base, Mixin) pair is only evaluated once.
 * - Repeated applications reuse previously generated constructors.
 * - No memory leaks occur due to garbage collection of unused constructors.
 *
 * @template TBase - The initial base constructor.
 * @template TMixins - A tuple of mixin functions.
 *
 * @param base - The base constructor to extend.
 * @param mixins - An ordered tuple of mixin functions.
 *
 * @returns The final constructor after applying all mixins.
 */
export function applyMixins<TBase extends ConstructorLike, const TMixins extends readonly AnyMixin[]>(
	base: TBase,
	mixins: TMixins,
): ApplyMixins<TBase, TMixins> {
	let currentBase: ConstructorLike = base;

	for (const mixin of mixins) {
		if (hasMixin(currentBase, mixin)) {
			continue;
		}

		let appliedMixins = mixinCache.get(currentBase);

		if (!appliedMixins) {
			appliedMixins = new WeakMap();
			mixinCache.set(currentBase, appliedMixins);
		}

		let mixinConstructor = appliedMixins.get(mixin);

		if (!mixinConstructor) {
			mixinConstructor = mixin(currentBase);

			appliedMixins.set(mixin, mixinConstructor);

			const parentSet = getMixins(currentBase);

			const newSet = new Set(parentSet);

			newSet.add(mixin);
			freezeSet(newSet);

			Object.defineProperty(mixinConstructor, MIXINS_SYMBOL, {
				value: newSet,
				enumerable: false,
				configurable: false,
				writable: false,
			});
		}

		currentBase = mixinConstructor;
	}

	return currentBase as ApplyMixins<TBase, TMixins>;
}

/**
 * Gets the set of mixins applied to a base constructor.
 *
 * @param base - The base constructor.
 * @returns The set of mixins.
 */
export function getMixins(base: ConstructorLike): ReadonlySet<AnyMixin> {
	// biome-ignore lint/suspicious/noExplicitAny: Internal symbol field access
	return (base as any)[MIXINS_SYMBOL] ?? EMPTY_SET;
}

/**
 * Checks if a mixin has been applied to a base constructor.
 *
 * @param base - The base constructor.
 * @param mixin - The mixin function.
 * @returns `true` if the mixin has been applied, `false` otherwise.
 */
export function hasMixin<TBase extends ConstructorLike, TMixin extends AnyMixin>(
	base: TBase,
	mixin: TMixin,
): base is ApplyMixins<TBase, readonly [TMixin]> {
	return getMixins(base).has(mixin);
}

function freezeSet<T>(set: Set<T>): ReadonlySet<T> {
	// biome-ignore lint/suspicious/noExplicitAny: Bypass types to enforce the methods
	const anySet = set as any;

	const fn = () => {
		throw new Error("Set is frozen");
	};

	anySet.add = fn;
	anySet.delete = fn;
	anySet.clear = fn;

	return Object.freeze(set);
}
