import { getRewardQuestion } from "./dynamo/reward-questions";

export const handler = async (event: any) => {
  try {
    const params = event?.body ? JSON.parse(event.body) : {};
    const id: string | undefined = params?.id;
    if (!id) {
      return { statusCode: 400, body: JSON.stringify({ error: "id required" }) };
    }

    const question = await getRewardQuestion(id);
    if (!question) {
      return { statusCode: 404, body: JSON.stringify({ error: "Reward question not found" }) };
    }

    return { statusCode: 200, body: JSON.stringify({ question }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify(err) };
  }
};
