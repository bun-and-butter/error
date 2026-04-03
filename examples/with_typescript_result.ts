import { Result } from "typescript-result";
import { BaseError } from "../src/error";

// This example shows how `BaseError` from this package can
// be combined with `typescript-result`.
//
// The idea is:
// - we do not want to pass around loose `Error` objects
// - instead, we model domain failures as their own error class
// - and we return an explicit `Result` for both success and failure
//
// That makes it immediately visible to callers:
// - which success value comes back (`User`)
// - which error type can occur (`UserParseError`)
//
// Example inspired by the TypeScript Result docs:
// https://www.typescript-result.dev/

/**
 * Stable, machine-readable error codes for every failure case in this example.
 *
 * These codes are intentionally separate from the human-readable message:
 * programs can branch on the code, while logs and UIs can show the message.
 */
enum UserParseErrorCode {
	InvalidJSON = "USER-1000",
	InvalidPayload = "USER-1001",
	MissingUsername = "USER-1002",
	UsernameTooShort = "USER-1003",
}

/**
 * Concrete domain error for the user parsing flow.
 *
 * `BaseError` already provides:
 * - `message`
 * - `code`
 * - optional `meta`
 * - optional `cause`
 *
 * This subclass only needs to define its discriminator and default messages.
 */
class UserParseError extends BaseError<UserParseErrorCode> {
	/** Literal discriminator used for narrowing and matching this error class. */
	readonly type = "UserParseError" as const;

	/**
	 * Default message for each error code.
	 *
	 * `satisfies Record<...>` makes sure we do not forget a code
	 * and do not accidentally add an invalid key.
	 */
	static readonly messages = {
		[UserParseErrorCode.InvalidJSON]:
            "The provided string is not valid JSON",
		[UserParseErrorCode.InvalidPayload]:
			"The parsed value is not a valid user payload",
		[UserParseErrorCode.MissingUsername]:
			"The payload does not contain a username",
		[UserParseErrorCode.UsernameTooShort]:
			"The username must be at least 3 characters long",
	} as const satisfies Record<UserParseErrorCode, string>;

	/**
	 * Creates an error for invalid JSON input.
	 *
	 * `cause` is especially useful when we want to translate a low-level error
	 * from `JSON.parse` into a domain error without losing the original failure.
	 */
	static invalidJSON(cause?: unknown): UserParseError {
		return new UserParseError(UserParseErrorCode.InvalidJSON, { cause });
	}

	/**
	 * Creates an error for values that are not valid user payload objects.
	 *
	 * The original input is stored in `meta` so it can be logged or inspected.
	 */
	static invalidPayload(input: unknown): UserParseError {
		return new UserParseError(UserParseErrorCode.InvalidPayload, {
			meta: { input },
		});
	}

	/**
	 * Creates an error for payloads that do not provide a usable username.
	 *
	 * The original input is preserved in `meta` for diagnostics.
	 */
	static missingUsername(input: unknown): UserParseError {
		return new UserParseError(UserParseErrorCode.MissingUsername, {
			meta: { input },
		});
	}

	/**
	 * Creates an error for usernames that violate the minimum length rule.
	 *
	 * The actual invalid username is stored in `meta`.
	 */
	static usernameTooShort(username: string): UserParseError {
		return new UserParseError(UserParseErrorCode.UsernameTooShort, {
			meta: { username },
		});
	}
}

/**
 * Successful output of the parser.
 *
 * If parsing and validation succeed, this is the value stored
 * in the `Ok` branch of the `Result`.
 */
type User = {
	username: string;
};

/**
 * Validates already parsed JSON against the domain rules for `User`.
 *
 * The return type `Result<User, UserParseError>` makes both branches explicit:
 * success returns a `User`, failure returns a `UserParseError`.
 */
function validateUser(value: unknown): Result<User, UserParseError> {
	// First, make sure we actually received an object.
	if (typeof value !== "object" || value === null) {
		return Result.error(UserParseError.invalidPayload(value));
	}

	// Then check whether the `username` field exists at all.
	if (!("username" in value)) {
		return Result.error(UserParseError.missingUsername(value));
	}

	// At this point TypeScript knows that `username` exists on the object.
	// But we still need to validate the runtime type of that field.
	const { username } = value;
	if (typeof username !== "string") {
		// In this example, we treat "not a string" the same as
		// "username missing". If needed, this could also become
		// its own dedicated error code such as "wrong type".
		return Result.error(UserParseError.missingUsername(value));
	}

	// Domain rule: usernames must be at least 3 characters long.
	if (username.length < 3) {
		return Result.error(UserParseError.usernameTooShort(username));
	}

	// If every check passes, we can build the success value.
	return Result.ok({ username });
}

/**
 * Parses a JSON string and validates that it contains a valid user payload.
 *
 * This version keeps the control flow explicit:
 * first we convert `JSON.parse` into a `Result`,
 * then we either return the parse error or validate the parsed value.
 */
function parseUserDocument(input: string): Result<User, UserParseError> {
	const parsedJson = Result.try(
		// `Result.try(...)` converts code that might throw exceptions
		// into a `Result`.
		() => JSON.parse(input) as unknown,
		// The second argument maps the thrown error
		// into our own domain error type.
		(error) => UserParseError.invalidJSON(error),
	);

	// If parsing failed, we return that error result directly.
	if (!parsedJson.ok) {
		return parsedJson;
	}

	// Otherwise we continue with domain validation of the parsed value.
	return validateUser(parsedJson.value);
}

/**
 * Runs the example flow and prints either the validated user
 * or a formatted error with its structured metadata.
 */
function printResult(input: string) {
	// The full parsing and validation flow returns exactly one `Result`.
	const result = parseUserDocument(input);

	// `result.ok` is the simplest branching point:
	// - `true`  => we may read `result.value`
	// - `false` => we may read `result.error`
	if (!result.ok) {
		const message = result
			.match()
			// `match()` allows a pattern-matching style of handling.
			// Here we say: if the error is a `UserParseError`,
			// format it using its code and message.
			.when(UserParseError, (error) => {
				return `[${error.code}] ${error.message}`;
			})
			.run();

		// Besides the readable message, we also print `meta`.
		// That is where our structured context lives,
		// such as the invalid input or the too-short username.
		console.error("error:", message);
		console.error("meta:", result.error.meta ?? null);
		return;
	}

	// On success, the validated user is available in `result.value`.
	console.log("user:", result.value);
}

// A few example calls for the demo:
// - valid user
// - username too short
// - field missing
// - invalid JSON
printResult('{"username":"butter"}');
printResult('{"username":"ab"}');
printResult('{"foo":"bar"}');
printResult("not json at all");
