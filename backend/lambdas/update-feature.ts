import { upsertFeature } from "./dynamo.helpers";
import { validateUpdateFeatureParams } from "./validateParams";

export const handler = async (event: any) => {
  /**
   * POST /features/update
   */
  try {
    const params = event?.body ? JSON.parse(event.body) : {};
    const paramsValidation = validateUpdateFeatureParams(params);
    if (!paramsValidation.success) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: paramsValidation.error.flatten().fieldErrors,
        }),
      };
    }

    const id = paramsValidation.data.id;

    const saved = await upsertFeature({
      id,
      name: paramsValidation.data.name,
      description: paramsValidation.data.description,
      category: paramsValidation.data.category,
      total_tokens_reward: paramsValidation.data.total_tokens_reward,
      status: paramsValidation.data.status,
      created_by_id: paramsValidation.data.created_by_id,
      discussions_url: paramsValidation.data.discussions_url,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ feature: saved }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify(err),
    };
  }
};
