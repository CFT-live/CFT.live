import { DurableObject } from "cloudflare:workers";

const MAX_MESSAGES = 100;
const MESSAGES_KEY = "messages";

export type MessageRole = "USER" | "ADMIN" | "SYSTEM";

export interface ChatMessage {
	id: string;
	address: string;
	role: MessageRole;
	content: string;
	timestamp: number;
}

/**
 * Chat Durable Object
 * Persists the last 100 chat messages using Cloudflare Durable Object storage.
 */
export class Chat extends DurableObject {
	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
	}

	private async getMessages(): Promise<ChatMessage[]> {
		const messages = await this.ctx.storage.get<ChatMessage[]>(MESSAGES_KEY);
		return messages ?? [];
	}

	private async saveMessages(messages: ChatMessage[]): Promise<void> {
		// Keep only the most recent MAX_MESSAGES
		const trimmed = messages.slice(-MAX_MESSAGES);
		await this.ctx.storage.put(MESSAGES_KEY, trimmed);
	}

	async fetch(request: Request): Promise<Response> {
		if (request.method === "GET") {
			const messages = await this.getMessages();
			return new Response(JSON.stringify({ messages }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		}

		if (request.method === "POST") {
			try {
				const body: { address?: string; content?: string; role?: MessageRole } =
					await request.json();
				const { address, content, role } = body;

				if (!address || typeof address !== "string") {
					return new Response(
						JSON.stringify({ error: "Wallet address is required" }),
						{ status: 400, headers: { "Content-Type": "application/json" } }
					);
				}

				if (!content || typeof content !== "string") {
					return new Response(
						JSON.stringify({ error: "Message content is required" }),
						{ status: 400, headers: { "Content-Type": "application/json" } }
					);
				}

				// Validate role
				const validRole: MessageRole = role && ["USER", "ADMIN", "SYSTEM"].includes(role) ? role : "USER";

				// For USER role, validate address format (basic Ethereum address check)
				if (validRole === "USER" && !/^0x[a-fA-F0-9]{40}$/.test(address)) {
					return new Response(
						JSON.stringify({ error: "Invalid wallet address format" }),
						{ status: 400, headers: { "Content-Type": "application/json" } }
					);
				}

				// Limit content length
				const trimmedContent = content.trim().slice(0, 500);
				if (trimmedContent.length === 0) {
					return new Response(
						JSON.stringify({ error: "Message cannot be empty" }),
						{ status: 400, headers: { "Content-Type": "application/json" } }
					);
				}

				// Mask addresses for ADMIN and SYSTEM roles
				let storedAddress: string;
				if (validRole === "ADMIN") {
					storedAddress = "ADMIN";
				} else if (validRole === "SYSTEM") {
					storedAddress = "SYSTEM";
				} else {
					storedAddress = address.toLowerCase();
				}

				const newMessage: ChatMessage = {
					id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
					address: storedAddress,
					role: validRole,
					content: trimmedContent,
					timestamp: Date.now(),
				};

				const messages = await this.getMessages();
				messages.push(newMessage);
				await this.saveMessages(messages);

				return new Response(JSON.stringify({ message: newMessage }), {
					status: 201,
					headers: { "Content-Type": "application/json" },
				});
			} catch {
				return new Response(
					JSON.stringify({ error: "Invalid request body" }),
					{ status: 400, headers: { "Content-Type": "application/json" } }
				);
			}
		}

		if (request.method === "DELETE") {
			try {
				const body: { messageId?: string } = await request.json();
				const { messageId } = body;

				if (!messageId || typeof messageId !== "string") {
					return new Response(
						JSON.stringify({ error: "Message ID is required" }),
						{ status: 400, headers: { "Content-Type": "application/json" } }
					);
				}

				const messages = await this.getMessages();
				const filteredMessages = messages.filter((m) => m.id !== messageId);

				if (filteredMessages.length === messages.length) {
					return new Response(
						JSON.stringify({ error: "Message not found" }),
						{ status: 404, headers: { "Content-Type": "application/json" } }
					);
				}

				await this.saveMessages(filteredMessages);

				return new Response(
					JSON.stringify({ success: true, deletedId: messageId }),
					{ status: 200, headers: { "Content-Type": "application/json" } }
				);
			} catch {
				return new Response(
					JSON.stringify({ error: "Invalid request body" }),
					{ status: 400, headers: { "Content-Type": "application/json" } }
				);
			}
		}

		return new Response(JSON.stringify({ error: "Method not allowed" }), {
			status: 405,
			headers: { "Content-Type": "application/json" },
		});
	}
}

export interface Env {
	CHAT: DurableObjectNamespace;
	ALLOWED_ORIGINS: string;
	ADMIN_ADDRESS: string;
}
