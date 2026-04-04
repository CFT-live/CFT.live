import { requireAdminRole } from "./helpers";
import { getRewardQuestion, updateRewardQuestion } from "./dynamo/reward-questions";
import { validateUpdateRewardQuestionParams } from "./validateParams";

export const handler = async (event: any) => {
  try {
    const params = event?.body ? JSON.parse(event.body) : {};

    const callerId: string | undefined = params?.caller_id;
    if (!callerId) {
      return { statusCode: 400, body: JSON.stringify({ error: "caller_id required" }) };
    }

    const adminCheck = await requireAdminRole(callerId);
    if (adminCheck) return adminCheck;

    const validation = validateUpdateRewardQuestionParams(params);
    if (!validation.success) {
      return { statusCode: 400, body: JSON.stringify({ error: validation.error.flatten().fieldErrors }) };
    }

    const existing = await getRewardQuestion(validation.data.id);
    if (!existing) {
      return { statusCode: 404, body: JSON.stringify({ error: "Reward question not found" }) };
    }

    const { id, ...updates } = validation.data;
    await updateRewardQuestion(id, updates);

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify(err) };
  }
};
