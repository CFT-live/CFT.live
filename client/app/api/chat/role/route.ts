/**
 * Chat Role API Route
 *
 * Returns the role for a given wallet address.
 * Does not expose the actual admin address to the client.
 */

const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS?.toLowerCase();
const SYSTEM_ADDRESS = "0x0000000000000000000000000000000000000000";

type MessageRole = "USER" | "ADMIN" | "SYSTEM";

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

export async function POST(request: Request) {
  try {
    const body: { address?: string } = await request.json();

    if (!body.address || typeof body.address !== "string") {
      return new Response(
        JSON.stringify({ error: "Address is required", role: "USER" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Validate address format (basic Ethereum address check)
    if (!/^0x[a-fA-F0-9]{40}$/.test(body.address)) {
      return new Response(
        JSON.stringify({ error: "Invalid address format", role: "USER" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const role = determineRole(body.address);

    return new Response(
      JSON.stringify({ role }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in chat role API:", error);
    return new Response(
      JSON.stringify({ error: String(error), role: "USER" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
