import { approveContribution, getTask, putTask } from "./dynamo.helpers";
import { validateApproveContributionParams } from "./validateParams";

export const handler = async (event: any) => {
  /**
   * POST /contributions/approve
   */
  try {
    const params = event?.body ? JSON.parse(event.body) : {};
    const paramsValidation = validateApproveContributionParams(params);
    if (!paramsValidation.success) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: paramsValidation.error.flatten().fieldErrors,
        }),
      };
    }

    const contribution = await approveContribution({
      contribution_id: paramsValidation.data.contribution_id,
      approver_id: paramsValidation.data.approver_id,
      status: paramsValidation.data.status,
      cp_awarded: paramsValidation.data.cp_awarded,
      approval_notes: paramsValidation.data.approval_notes,
    });

    // Keep task lifecycle in sync with contribution review status.
    try {
      const task = await getTask(contribution.task_id);
      if (task) {
        if (contribution.status === "APPROVED") {
          await putTask({ ...task, status: "DONE" });
        } else if (contribution.status === "CHANGES_REQUESTED") {
          await putTask({ ...task, status: "CHANGES_REQUESTED" });
        } else if (contribution.status === "REJECTED") {
          await putTask({
            ...task,
            status: "OPEN",
            claimed_by_id: null,
            claimed_date: null,
          });
        } else if (contribution.status === "SUBMITTED") {
          await putTask({ ...task, status: "IN_REVIEW" });
        }
      }
    } catch {
      // Best-effort only; contribution record is source of truth for review.
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ contribution }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify(err) };
  }
};
