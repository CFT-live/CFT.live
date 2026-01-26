import { validateUpdateContributorParams } from "./validateParams";
import { upsertContributor } from "./dynamo.helpers";

export const handler = async (event: any) => {
  try {
    const params = event?.body ? JSON.parse(event.body) : {};
    const paramsValidation = validateUpdateContributorParams(params);
    if (!paramsValidation.success) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: paramsValidation.error.flatten().fieldErrors,
        }),
      };
    }

    const saved = await upsertContributor({
      wallet_address: paramsValidation.data.wallet_address,
      username: paramsValidation.data.username,
      email: paramsValidation.data.email,
      github_username: paramsValidation.data.github_username,
      telegram_handle: paramsValidation.data.telegram_handle,
      bio: paramsValidation.data.bio,
      profile_image_url: paramsValidation.data.profile_image_url,
      roles: paramsValidation.data.roles,
      status: paramsValidation.data.status,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        contributor: saved,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify(err),
    };
  }
};
