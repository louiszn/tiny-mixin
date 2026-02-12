/**
 * Represents a class constructor.
 *
 * @template T - The instance type produced by the constructor.
 * @template Args - The argument tuple accepted by the constructor.
 */
export type Constructor<T = any, Args extends any[] = any[]> = new (...args: Args) => T;

/**
 * Represents an abstract class constructor.
 *
 * @template T - The instance type produced by the constructor.
 * @template Args - The argument tuple accepted by the constructor.
 */
export type AbstractConstructor<T = any, Args extends any[] = any[]> = abstract new (
	...args: Args
) => T;

/**
 * Represents a constructor, either a regular or abstract constructor.
 *
 * @template T - The instance type produced by the constructor.
 * @template Args - The argument tuple accepted by the constructor.
 */
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
export type Mixin<
	TBase extends ConstructorLike = ConstructorLike,
	TResult extends TBase = TBase,
> = (base: TBase) => TResult;

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
export type ApplyMixins<TBase extends ConstructorLike, TMixins extends Mixin[]> = TMixins extends [
	infer First,
	...infer Rest,
]
	? First extends Mixin<any, any>
		? Rest extends Mixin<any, any>[]
			? TBase & ApplyMixins<ReturnType<First>, Rest>
			: TBase
		: TBase
	: TBase;

const mixinCache = new WeakMap<ConstructorLike, WeakMap<Mixin, ConstructorLike>>();

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
export function createMixin<TBase extends ConstructorLike, TResult extends TBase>(
	mixin: Mixin<TBase, TResult>,
) {
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
export function applyMixins<TBase extends ConstructorLike, const TMixins extends Mixin[]>(
	base: TBase,
	mixins: TMixins,
): ApplyMixins<TBase, TMixins> {
	let currentBase: ConstructorLike = base;

	for (const mixin of mixins) {
		let appliedMixins = mixinCache.get(currentBase);

		if (!appliedMixins) {
			appliedMixins = new Map();
			mixinCache.set(currentBase, appliedMixins);
		}

		let mixinConstructor = appliedMixins.get(mixin);

		if (!mixinConstructor) {
			mixinConstructor = mixin(currentBase);
			appliedMixins.set(mixin, mixinConstructor);
		}

		currentBase = mixinConstructor;
	}

	return currentBase as ApplyMixins<TBase, TMixins>;
}
