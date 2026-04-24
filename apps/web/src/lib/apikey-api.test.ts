import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGet, mockPost, mockDelete } = vi.hoisted(() => ({
	mockGet: vi.fn(),
	mockPost: vi.fn(),
	mockDelete: vi.fn(),
}));

vi.mock("./api-client", () => ({
	apiClient: {
		instance: {
			get: mockGet,
			post: mockPost,
			delete: mockDelete,
		},
	},
}));

import {
	apiKeysQueryOptions,
	createAPIKey,
	listAPIKeys,
	revokeAPIKey,
	type APIKey,
	type CreateAPIKeyResponse,
} from "./apikey-api";

describe("apikey-api", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const mockKey: APIKey = {
		id: "key-1",
		name: "My Key",
		key_prefix: "paca_abc",
		last_used_at: null,
		expires_at: null,
		created_at: "2026-01-01T00:00:00.000Z",
	};

	describe("listAPIKeys", () => {
		it("calls GET /users/me/api-keys and unwraps data", async () => {
			mockGet.mockResolvedValue({
				data: { data: [mockKey], error_code: null, message: "ok" },
			});

			await expect(listAPIKeys()).resolves.toEqual([mockKey]);
			expect(mockGet).toHaveBeenCalledWith("/users/me/api-keys");
		});
	});

	describe("createAPIKey", () => {
		it("calls POST /users/me/api-keys with payload and unwraps response", async () => {
			const created: CreateAPIKeyResponse = {
				...mockKey,
				key: "paca_abcdef1234567890",
			};
			mockPost.mockResolvedValue({
				data: { data: created, error_code: null, message: "ok" },
			});

			const payload = { name: "My Key" };
			await expect(createAPIKey(payload)).resolves.toEqual(created);
			expect(mockPost).toHaveBeenCalledWith("/users/me/api-keys", payload);
		});

		it("forwards optional expires_at field", async () => {
			const created: CreateAPIKeyResponse = {
				...mockKey,
				expires_at: "2027-01-01T00:00:00.000Z",
				key: "paca_xyz",
			};
			mockPost.mockResolvedValue({
				data: { data: created, error_code: null, message: "ok" },
			});

			const payload = { name: "Expiring Key", expires_at: "2027-01-01T00:00:00.000Z" };
			await expect(createAPIKey(payload)).resolves.toEqual(created);
			expect(mockPost).toHaveBeenCalledWith("/users/me/api-keys", payload);
		});
	});

	describe("revokeAPIKey", () => {
		it("calls DELETE /users/me/api-keys/:id", async () => {
			mockDelete.mockResolvedValue({});

			await expect(revokeAPIKey("key-1")).resolves.toBeUndefined();
			expect(mockDelete).toHaveBeenCalledWith("/users/me/api-keys/key-1");
		});
	});

	describe("apiKeysQueryOptions", () => {
		it("has the expected query key", () => {
			expect(apiKeysQueryOptions.queryKey).toEqual(["api-keys"]);
		});

		it("uses listAPIKeys as the query function", () => {
			expect(typeof apiKeysQueryOptions.queryFn).toBe("function");
		});
	});
});
