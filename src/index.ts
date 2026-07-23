/** biome-ignore-all lint/suspicious/noExplicitAny: Accept various types */

/**
 * A concrete class constructor.
 *
 * @typeParam T - The instance type created by the constructor.
 * @typeParam Args - The constructor parameter tuple.
 */
export type Constructor<T = any, Args extends any[] = any[]> = new (...args: Args) => T;

/**
 * An abstract class constructor.
 *
 * @typeParam T - The instance type represented by the constructor.
 * @typeParam Args - The constructor parameter tuple.
 */
export type AbstractConstructor<T = any, Args extends any[] = any[]> = abstract new (
	...args: Args
) => T;

/**
 * A constructor that may represent either a concrete or abstract class.
 *
 * @typeParam T - The instance type represented by the constructor.
 * @typeParam Args - The constructor parameter tuple.
 */
export type ConstructorLike<T = any, Args extends any[] = any[]> =
	| Constructor<T, Args>
	| AbstractConstructor<T, Args>;

/**
 * A mixin factory that transforms one constructor into another.
 *
 * @typeParam TBase - The constructor accepted by the mixin.
 * @typeParam TResult - The constructor returned by the mixin.
 */
export type Mixin<
	TBase extends ConstructorLike = ConstructorLike,
	TResult extends ConstructorLike = ConstructorLike,
> = (base: TBase) => TResult;

/**
 * Represents any mixin factory.
 *
 * `any` is intentionally used for the base parameter so mixins with narrower
 * constructor constraints remain assignable to this common heterogeneous type.
 */
export type AnyMixin = (base: any) => ConstructorLike;

/**
 * Extracts the static members of a constructor without preserving its
 * construct signature or prototype property.
 *
 * This allows the constructor to be rebuilt with a different instance type
 * without introducing multiple construct signatures with different return
 * types.
 *
 * @typeParam TBase - The constructor whose static members should be preserved.
 */
type StaticMembers<TBase extends ConstructorLike> = {
	[K in keyof TBase as K extends "prototype" ? never : K]: TBase[K];
};

/**
 * Reconstructs a constructor with a different instance type while preserving
 * its constructor parameters and whether it is concrete or abstract.
 *
 * @typeParam TBase - The original constructor.
 * @typeParam TInstance - The replacement instance type.
 */
type RebindConstructor<TBase extends ConstructorLike, TInstance> =
	TBase extends Constructor<any, infer Args>
		? Constructor<TInstance, Args>
		: TBase extends AbstractConstructor<any, infer Args>
			? AbstractConstructor<TInstance, Args>
			: never;

/**
 * Extracts the instance type produced by a mixin.
 *
 * @typeParam TMixin - The mixin whose result should be inspected.
 */
type MixinInstance<TMixin extends AnyMixin> = InstanceType<ReturnType<TMixin>>;

/**
 * Extracts the public members introduced by a mixin.
 *
 * Members already present on the base instance are excluded. Private,
 * protected, and ECMAScript private members are naturally omitted because
 * they are not exposed through `keyof`.
 *
 * @typeParam TBase - The base constructor.
 * @typeParam TMixin - The applied mixin.
 */
type MixinMembers<TBase extends ConstructorLike, TMixin extends AnyMixin> = Pick<
	MixinInstance<TMixin>,
	Exclude<keyof MixinInstance<TMixin>, keyof InstanceType<TBase>>
>;

/**
 * Computes the constructor type produced by applying a single mixin.
 *
 * The resulting constructor preserves the constructor parameters and static
 * members of the base while extending its instance type with only the public
 * members introduced by the mixin.
 *
 * @typeParam TBase - The base constructor.
 * @typeParam TMixin - The mixin to apply.
 */
type ApplyMixin<TBase extends ConstructorLike, TMixin extends AnyMixin> = StaticMembers<TBase> &
	RebindConstructor<TBase, InstanceType<TBase> & MixinMembers<TBase, TMixin>>;

/**
 * Computes the constructor type produced by applying a sequence of mixins
 * from left to right.
 *
 * Applying `[A, B]` is equivalent to:
 *
 * ```ts
 * B(A(Base))
 * ```
 *
 * @typeParam TBase - The initial base constructor.
 * @typeParam TMixins - The tuple of mixins to apply.
 */
export type ApplyMixins<
	TBase extends ConstructorLike,
	TMixins extends readonly AnyMixin[],
> = TMixins extends readonly [
	infer First extends AnyMixin,
	...infer Rest extends readonly AnyMixin[],
]
	? ApplyMixins<ApplyMixin<TBase, First>, Rest>
	: TBase;

/**
 * Runtime metadata key containing the mixins applied to a constructor.
 */
const MIXINS_SYMBOL = Symbol("tiny-mixin:mixins");

/**
 * Shared empty set returned for constructors without any applied mixins.
 */
const EMPTY_SET: ReadonlySet<AnyMixin> = new Set();

/**
 * Caches generated constructors by base constructor and mixin.
 *
 * This ensures that applying the same mixin to the same base constructor
 * reuses the previously generated constructor.
 */
const mixinCache = new WeakMap<ConstructorLike, WeakMap<AnyMixin, ConstructorLike>>();

/**
 * Runtime metadata stored on constructors produced by `applyMixins`.
 */
interface MixinMetadata {
	readonly [MIXINS_SYMBOL]?: ReadonlySet<AnyMixin>;
}

/**
 * Creates a mixin while preserving its exact inferred function type.
 *
 * The provided function is returned unchanged at both runtime and type level.
 * This preserves generic base constraints and the exact constructor type
 * inferred from the mixin implementation.
 *
 * @param mixin - The mixin factory to create.
 * @returns The same mixin factory.
 */
export function createMixin<const TMixin extends AnyMixin>(mixin: TMixin): TMixin {
	return mixin;
}

/**
 * Applies a sequence of mixins to a base constructor from left to right.
 *
 * Applying `[A, B]` is equivalent to:
 *
 * ```ts
 * B(A(Base))
 * ```
 *
 * Mixins already present in the constructor hierarchy are skipped. Generated
 * constructors are cached, so applying the same mixin to the same constructor
 * reuses the previously generated constructor.
 *
 * At the type level, only the public members introduced by each mixin are
 * exposed through the resulting constructor.
 *
 * @param base - The initial base constructor.
 * @param mixins - The mixins to apply.
 * @returns The constructor produced by applying all requested mixins.
 */
export function applyMixins<
	TBase extends ConstructorLike,
	const TMixins extends readonly AnyMixin[],
>(base: TBase, mixins: TMixins): ApplyMixins<TBase, TMixins> {
	let current: ConstructorLike = base;

	for (const mixin of mixins) {
		if (hasMixin(current, mixin)) {
			continue;
		}

		let cache = mixinCache.get(current);

		if (!cache) {
			cache = new WeakMap();
			mixinCache.set(current, cache);
		}

		let next = cache.get(mixin);

		if (!next) {
			next = mixin(current);

			const appliedMixins = new Set(getMixins(current));
			appliedMixins.add(mixin);

			Object.defineProperty(next, MIXINS_SYMBOL, {
				value: appliedMixins,
				configurable: false,
				enumerable: false,
				writable: false,
			});

			cache.set(mixin, next);
		}

		current = next;
	}

	return current as ApplyMixins<TBase, TMixins>;
}

/**
 * Returns all mixins that have been applied to a constructor.
 *
 * The returned set also contains mixins inherited through previously composed
 * constructors.
 *
 * @param target - The constructor to inspect.
 * @returns A read-only set containing all applied mixins.
 */
export function getMixins(target: ConstructorLike): ReadonlySet<AnyMixin> {
	return (target as ConstructorLike & MixinMetadata)[MIXINS_SYMBOL] ?? EMPTY_SET;
}

/**
 * Checks whether a mixin has already been applied to a constructor.
 *
 * Mixins inherited through the constructor hierarchy are also considered.
 *
 * @param target - The constructor to inspect.
 * @param mixin - The mixin to look for.
 * @returns Whether the specified mixin has been applied.
 */
export function hasMixin<TMixin extends AnyMixin>(target: ConstructorLike, mixin: TMixin): boolean {
	return getMixins(target).has(mixin);
}
