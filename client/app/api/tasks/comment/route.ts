export const runtime = "edge";

export async function POST(request: Request) {
  void request;
  return new Response(
    "Deprecated endpoint: task comments are not supported in the current contribution schema.",
    { status: 410 }
  );
}
