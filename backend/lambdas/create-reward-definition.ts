import { randomUUID } from "node:crypto";
import { requireAdminRole } from "./helpers";
import { createRewardDefinition } from "./dynamo/reward-definitions";
import { validateCreateRewardDefinitionParams } from "./validateParams";

export const handler = async (event: any) => {
  try {
    const params = event?.body ? JSON.parse(event.body) : {};
    const validation = validateCreateRewardDefinitionParams(params);
    if (!validation.success) {
      return { statusCode: 400, body: JSON.stringify({ error: validation.error.flatten().fieldErrors }) };
    }

    const adminCheck = await requireAdminRole(validation.data.created_by_id);
    if (adminCheck) return adminCheck;

    const definition = await createRewardDefinition({
      id: randomUUID(),
      ...validation.data,
    });

    return { statusCode: 200, body: JSON.stringify({ definition }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify(err) };
  }
};
