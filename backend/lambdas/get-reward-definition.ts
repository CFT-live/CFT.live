import { getRewardDefinition } from "./dynamo/reward-definitions";

export const handler = async (event: any) => {
  try {
    const params = event?.body ? JSON.parse(event.body) : {};
    const id: string | undefined = params?.id;
    if (!id) {
      return { statusCode: 400, body: JSON.stringify({ error: "id required" }) };
    }

    const definition = await getRewardDefinition(id);
    if (!definition) {
      return { statusCode: 404, body: JSON.stringify({ error: "Reward definition not found" }) };
    }

    return { statusCode: 200, body: JSON.stringify({ definition }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify(err) };
  }
};
