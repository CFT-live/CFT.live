/**
 * Chat API Route
 *
 * Proxies requests to the chat-worker for message persistence.
 * Falls back to mock data for local development when CHAT_WORKER_URL is not set.
 */

const CHAT_WORKER_URL = process.env.CHAT_WORKER_URL;
const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS?.toLowerCase();
const SYSTEM_ADDRESS = "0x0000000000000000000000000000000000000000";

type MessageRole = "USER" | "ADMIN" | "SYSTEM";

interface ChatMessage {
  id: string;
  address: string;
  role: MessageRole;
  content: string;
  timestamp: number;
}

const MOCK_MESSAGES: ChatMessage[] = [
  {
    id: "mock-1",
    address: "SYSTEM",
    role: "SYSTEM",
    content: "Welcome to CFT.live chat! Connect your wallet to send messages.",
    timestamp: Date.now() - 60000,
  },
];

/**
 * Determine the role based on address (case-insensitive)
 */
function determineRole(address: string): MessageRole {
  const lowerAddress = address.toLowerCase();
  if (lowerAddress === SYSTEM_ADDRESS.toLowerCase()) {
    return "SYSTEM";
  }
  if (ADMIN_ADDRESS && lowerAddress === ADMIN_ADDRESS) {
    return "ADMIN";
  }
  return "USER";
}

/**
 * Check if address is admin (case-insensitive)
 */
function isAdminAddress(address: string): boolean {
  if (!ADMIN_ADDRESS) return false;
  return address.toLowerCase() === ADMIN_ADDRESS;
}

export async function GET() {
  try {
    // Check if CHAT_WORKER_URL is configured
    if (!CHAT_WORKER_URL) {
      // Fallback for local development
      return new Response(
        JSON.stringify({
          messages: MOCK_MESSAGES,
          localDev: true,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Forward request to chat worker
    const response = await fetch(`${CHAT_WORKER_URL}/messages`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in chat GET API:", error);
    return new Response(
      JSON.stringify({
        messages: [],
        error: String(error),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body: { address?: string; content?: string } = await request.json();

    // Check if CHAT_WORKER_URL is configured
    if (!CHAT_WORKER_URL) {
      // Fallback for local development - echo back a mock message
      const role = determineRole(body.address ?? "");
      let maskedAddress: string;
      if (role === "ADMIN") {
        maskedAddress = "ADMIN";
      } else if (role === "SYSTEM") {
        maskedAddress = "SYSTEM";
      } else {
        maskedAddress = body.address?.toLowerCase() ?? "0x0";
      }
      const mockMessage: ChatMessage = {
        id: `mock-${Date.now()}`,
        address: maskedAddress,
        role,
        content: body.content ?? "",
        timestamp: Date.now(),
      };
      return new Response(
        JSON.stringify({
          message: mockMessage,
          localDev: true,
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Forward request to chat worker
    const response = await fetch(`${CHAT_WORKER_URL}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in chat POST API:", error);
    return new Response(
      JSON.stringify({
        error: String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body: { messageId?: string; senderAddress?: string } = await request.json();

    // Verify admin authorization using sender's address (case-insensitive)
    if (!body.senderAddress || !isAdminAddress(body.senderAddress)) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Check if CHAT_WORKER_URL is configured
    if (!CHAT_WORKER_URL) {
      // Fallback for local development
      return new Response(
        JSON.stringify({
          success: true,
          deletedId: body.messageId,
          localDev: true,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Forward request to chat worker
    const response = await fetch(`${CHAT_WORKER_URL}/messages`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Address": body.senderAddress,
      },
      body: JSON.stringify({ messageId: body.messageId }),
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in chat DELETE API:", error);
    return new Response(
      JSON.stringify({
        error: String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
