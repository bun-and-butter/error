type BaseErrorConstructor<Code extends string> = {
	messages: Record<Code, string>;
} & typeof BaseError;

/**
 * Configuration object for creating a {@link BaseError}.
 *
 * Use these options to attach context, preserve wrapped failures, or override
 * the default message derived from the subclass' static `messages` map.
 */
export interface BaseErrorOptions {
	/**
	 * The underlying cause of this error.
	 *
	 * Use this to preserve the original error when wrapping lower-level failures
	 * in a domain-specific error.
	 */
	cause?: unknown;
	/**
	 * Overrides the default message associated with the provided error code.
	 *
	 * If omitted, the message is resolved from the subclass' static `messages`
	 * mapping.
	 */
	message?: string;
	/**
	 * Optional structured metadata attached to the error.
	 *
	 * This can be used to include contextual information such as identifiers,
	 * field names, user input, or other diagnostic details.
	 */
	meta?: Record<string, unknown>;
}

/**
 * Base class for strongly typed application and domain errors.
 *
 * Extend this class to model domain-specific failures with:
 *
 * - expose a machine-readable error code
 * - support structured metadata
 * - preserve error causes
 * - resolve default messages from a static message map
 *
 * Subclasses must define:
 *
 * - a literal `type` property, used to keep TypeScript from collapsing custom
 *   errors into the broader `Error` type
 * - a static `messages` object mapping each error code to a default message
 *
 * Typical usage looks like this:
 *
 * ```ts
 * enum DemoErrorCode {
 *   InvalidID = "DEMO-1000",
 * }
 *
 * class DemoError extends BaseError<DemoErrorCode> {
 *   readonly type = "DemoError";
 *
 *   static readonly messages = {
 *     [DemoErrorCode.InvalidID]: "The provided identifier is invalid",
 *   } as const satisfies Record<DemoErrorCode, string>;
 * }
 * ```
 *
 * @typeParam Code - The set of valid error codes for the concrete error class.
 */
export abstract class BaseError<Code extends string> extends Error {
	/**
	 * Discriminator identifying the concrete error type.
	 *
	 * Subclasses should define this as a literal string, for example:
	 *
	 * ```ts
	 * readonly type = "DemoError";
	 * ```
	 *
	 * This helps TypeScript distinguish between different custom error classes
	 * during narrowing.
	 */
	abstract readonly type: string;
	/**
	 * Machine-readable error code for programmatic handling.
	 */
	readonly code: Code;
	/**
	 * Optional structured metadata associated with this error instance.
	 *
	 * This is useful for logging, debugging, and surfacing additional context
	 * without having to parse the error message.
	 */
	readonly meta?: Record<string, unknown>;

	/**
	 * Creates a new typed application error.
	 *
	 * The error message is resolved in the following order:
	 *
	 * 1. `options.message`, if provided
	 * 2. the message from the subclass' static `messages` mapping
	 *
	 * @param code - The machine-readable error code.
	 * @param options - Optional error configuration such as message override,
	 *   cause, and metadata.
	 */
	constructor(code: Code, options?: BaseErrorOptions) {
		const ctor = new.target as BaseErrorConstructor<Code>;

		super(options?.message ?? ctor.messages[code], {
			cause: options?.cause,
		});

		this.name = new.target.name;
		this.code = code;
		this.meta = options?.meta;

		Object.setPrototypeOf(this, new.target.prototype);
	}
}
