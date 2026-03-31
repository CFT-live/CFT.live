import { randomUUID } from "node:crypto";
import { requireAdminRole } from "./helpers";
import { createRewardQuestion } from "./dynamo/reward-questions";
import { getRewardDefinition } from "./dynamo/reward-definitions";
import { validateCreateRewardQuestionParams } from "./validateParams";

export const handler = async (event: any) => {
  try {
    const params = event?.body ? JSON.parse(event.body) : {};
    const validation = validateCreateRewardQuestionParams(params);
    if (!validation.success) {
      return { statusCode: 400, body: JSON.stringify({ error: validation.error.flatten().fieldErrors }) };
    }

    const adminCheck = await requireAdminRole(validation.data.created_by_id);
    if (adminCheck) return adminCheck;

    const definition = await getRewardDefinition(validation.data.reward_definition_id);
    if (!definition) {
      return { statusCode: 404, body: JSON.stringify({ error: "Reward definition not found" }) };
    }
    if (definition.action_type !== "QUESTION_ANSWER") {
      return { statusCode: 400, body: JSON.stringify({ error: "Reward definition must have action_type QUESTION_ANSWER" }) };
    }

    const question = await createRewardQuestion({ id: randomUUID(), ...validation.data });

    return { statusCode: 200, body: JSON.stringify({ question }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify(err) };
  }
};
