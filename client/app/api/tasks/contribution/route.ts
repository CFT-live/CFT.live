export const runtime = "edge";

export async function POST(request: Request) {
  void request;
  return new Response(
    "Deprecated endpoint: task contribution shares are not supported in the current contribution schema.",
    { status: 410 }
  );
}
