import { listRewardQuestions } from "./dynamo/reward-questions";
import { validateGetRewardQuestionsParams } from "./validateParams";

export const handler = async (event: any) => {
  try {
    const params = event?.body ? JSON.parse(event.body) : {};
    const validation = validateGetRewardQuestionsParams(params);
    if (!validation.success) {
      return { statusCode: 400, body: JSON.stringify({ error: validation.error.flatten().fieldErrors }) };
    }

    const questions = await listRewardQuestions(validation.data.filter);

    return { statusCode: 200, body: JSON.stringify({ questions }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify(err) };
  }
};
