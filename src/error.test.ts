import { describe, expect, test } from "bun:test";
import { BaseError } from "./error";

enum TestErrorCode {
	InvalidInput = "TEST-1000",
	Conflict = "TEST-1001",
}

class TestError extends BaseError<TestErrorCode> {
	readonly type = "TestError" as const;

	static readonly messages = {
		[TestErrorCode.InvalidInput]: "The provided input is invalid",
		[TestErrorCode.Conflict]: "The resource is in a conflicting state",
	} as const satisfies Record<TestErrorCode, string>;
}

describe.concurrent("BaseError", () => {
	test("uses the subclass message map when no message override is provided", () => {
		const error = new TestError(TestErrorCode.InvalidInput);

		expect(error).toBeInstanceOf(Error);
		expect(error).toBeInstanceOf(TestError);
		expect(error.name).toBe("TestError");
		expect(error.type).toBe("TestError");
		expect(error.code).toBe(TestErrorCode.InvalidInput);
		expect(error.message).toBe("The provided input is invalid");
		expect(error.meta).toBeUndefined();
		expect(error.cause).toBeUndefined();
	});

	test("supports overriding the default message", () => {
		const error = new TestError(TestErrorCode.Conflict, {
			message: "Custom conflict message",
		});

		expect(error.code).toBe(TestErrorCode.Conflict);
		expect(error.message).toBe("Custom conflict message");
	});

	test("stores cause and structured metadata", () => {
		const cause = new Error("database unavailable");
		const meta = { userID: "usr_123", field: "username" };

		const error = new TestError(TestErrorCode.Conflict, {
			cause,
			meta,
		});

		expect(error.cause).toBe(cause);
		expect(error.meta).toEqual(meta);
		expect(Object.getPrototypeOf(error)).toBe(TestError.prototype);
	});
});
