export const runtime = "edge";

export async function POST(request: Request) {
  void request;
  return new Response(
    "Deprecated endpoint: PR links are represented via contribution submissions.",
    { status: 410 }
  );
}
