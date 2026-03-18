import { randomUUID } from "crypto";
import { createContribution, getTask, putTask } from "./dynamo/dynamo.helpers";
import { validateSubmitContributionParams } from "./validateParams";

export const handler = async (event: any) => {
  /**
   * POST /contributions/submit
   */
  try {
    const params = event?.body ? JSON.parse(event.body) : {};
    const paramsValidation = validateSubmitContributionParams(params);
    if (!paramsValidation.success) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: paramsValidation.error.flatten().fieldErrors,
        }),
      };
    }

    const task = await getTask(paramsValidation.data.task_id);
    if (!task) {
      return { statusCode: 404, body: JSON.stringify({ error: "Task not found" }) };
    }

    const contributorId = paramsValidation.data.contributor_id.toLowerCase();

    const id = randomUUID();
    const contribution = await createContribution({
      id,
      task_id: paramsValidation.data.task_id,
      contributor_id: contributorId,
      submitted_work_url: paramsValidation.data.submitted_work_url,
      submission_notes: paramsValidation.data.submission_notes,
      github_pr_number: paramsValidation.data.github_pr_number,
    });

    // Move task into review after a successful submission.
    if (task.status !== "IN_REVIEW") {
      await putTask({
        ...task,
        status: "IN_REVIEW",
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ contribution }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify(err) };
  }
};
