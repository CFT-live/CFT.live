import { listRewardDefinitions } from "./dynamo/reward-definitions";
import { validateGetRewardDefinitionsParams } from "./validateParams";

export const handler = async (event: any) => {
  try {
    const params = event?.body ? JSON.parse(event.body) : {};
    const validation = validateGetRewardDefinitionsParams(params);
    if (!validation.success) {
      return { statusCode: 400, body: JSON.stringify({ error: validation.error.flatten().fieldErrors }) };
    }

    const definitions = await listRewardDefinitions(validation.data.filter);

    return { statusCode: 200, body: JSON.stringify({ definitions }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify(err) };
  }
};
