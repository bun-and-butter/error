import { BaseError } from "../src/error";

// This example shows the "throwing" style of using `BaseError`.
//
// The idea is:
// - model domain failures as a dedicated error class
// - throw typed errors at validation boundaries
// - narrow back to the concrete error type with `instanceof`
//
// This keeps call sites readable while still giving us structured data like
// error codes, default messages, optional causes, and diagnostic metadata.

/**
 * Error codes used by the demo domain.
 */
export enum DemoErrorCode {
	/** The provided identifier is not a valid UUID v7. */
	InvalidID = "UE-1000",
	/** A username failed the package's demo validation rules. */
	InvalidUsername = "UE-1001",
}

/**
 * Discriminator literal used for narrowing this custom error class.
 */
export const DemoErrorType = "DemoError" as const;

/**
 * Example domain error built on top of {@link BaseError}.
 */
export class DemoError extends BaseError<DemoErrorCode> {
	/** Literal discriminator for this concrete error type. */
	readonly type = DemoErrorType;

	/** Default messages keyed by machine-readable error code. */
	static readonly messages = {
		[DemoErrorCode.InvalidID]:
			"The provided user identifier is not a valid UUID v7",
		[DemoErrorCode.InvalidUsername]:
			"The username must be between 3 and 20 characters long",
	} as const satisfies Record<DemoErrorCode, string>;

	/**
	 * Creates an error for invalid user identifiers.
	 */
	static invalidID(cause?: unknown): DemoError {
		return new DemoError(DemoErrorCode.InvalidID, { cause });
	}

	/**
	 * Creates an error for invalid usernames.
	 */
	static invalidUsername(username: string): DemoError {
		return new DemoError(DemoErrorCode.InvalidUsername, {
			meta: { username },
		});
	}
}

/**
 * Minimal example function that validates demo input and returns a typed error.
 */
export function parseDemoUser(input: {
	id: string;
	username: string;
}): DemoUser {
	// Validation errors are translated into typed domain errors.
	// Callers can catch `DemoError` and inspect `code`, `message`, or `meta`.
	if (!isUuidV7(input.id)) {
		throw DemoError.invalidID();
	}

	// The factory method keeps the call site small and stores the invalid value
	// in `meta`, which is useful for logs or debugging.
	if (input.username.length < 3 || input.username.length > 20) {
		throw DemoError.invalidUsername(input.username);
	}

	// If all checks pass, we return the validated domain object.
	return {
		id: input.id,
		username: input.username,
	};
}

/**
 * Example DTO returned by {@link parseDemoUser}.
 */
export interface DemoUser {
	id: string;
	username: string;
}

function isUuidV7(value: string): boolean {
	// This helper keeps the example focused on error handling rather than
	// inlining the UUID check into the main parsing function.
	return /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
		value,
	);
}

try {
	// This input fails validation on purpose so the example demonstrates
	// what a typed domain error looks like at runtime.
	parseDemoUser({
		id: "not-a-uuid",
		username: "ab",
	});
} catch (error) {
	// `instanceof` narrows the caught value back to our concrete error class.
	// From here on, TypeScript knows about `type`, `code`, `message`, and `meta`.
	if (error instanceof DemoError) {
		console.error(error.type, error.code, error.message, error.meta);
	}
}
