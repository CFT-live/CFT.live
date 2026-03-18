import { z } from "zod";
import { getContributor, getTask, putContributor, upsertTask } from "./dynamo/dynamo.helpers";

const validateClaimTaskParams = (params: any) =>
  z
    .object({
      task_id: z.string().min(1),
      action: z.enum(["CLAIM", "UNCLAIM"]).default("CLAIM"),
      claimed_by_id: z.string().min(1),
    })
    .safeParse(params);

export const handler = async (event: any) => {
  /**
   * POST /tasks/claim
   */
  try {
    const params = event?.body ? JSON.parse(event.body) : {};
    const paramsValidation = validateClaimTaskParams(params);
    if (!paramsValidation.success) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: paramsValidation.error.flatten().fieldErrors,
        }),
      };
    }

    const existing = await getTask(paramsValidation.data.task_id);
    if (!existing) {
      return { statusCode: 404, body: JSON.stringify({ error: "Task not found" }) };
    }

    const actorId = paramsValidation.data.claimed_by_id;

    if (paramsValidation.data.action === "UNCLAIM") {
      // Only the current claimant can unclaim, and only while still CLAIMED.
      if (existing.status !== "CLAIMED") {
        return {
          statusCode: 409,
          body: JSON.stringify({ error: "Task cannot be unclaimed in its current status" }),
        };
      }
      if (!existing.claimed_by_id || existing.claimed_by_id !== actorId) {
        return {
          statusCode: 403,
          body: JSON.stringify({ error: "Only the current claimant can unclaim this task" }),
        };
      }

      const saved = await upsertTask({
        id: existing.id,
        feature_id: existing.feature_id,
        name: existing.name,
        description: existing.description,
        task_type: existing.task_type,
        acceptance_criteria: existing.acceptance_criteria,
        status: "OPEN",
        claimed_by_id: null,
        claimed_date: null,
        created_by_id: existing.created_by_id,
      });

      // Best-effort last_active_date update
      try {
        const contributor = await getContributor(actorId);
        if (contributor) {
          await putContributor({
            ...contributor,
            last_active_date: new Date().toISOString(),
          });
        }
      } catch {
        // ignore
      }

      return { statusCode: 200, body: JSON.stringify({ task: saved }) };
    }

    // CLAIM: enforce single-claimer semantics.
    if (existing.status !== "OPEN") {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: "Task is not open for claiming" }),
      };
    }
    if (existing.claimed_by_id) {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: "Task is already claimed" }),
      };
    }

    const claimed_date = new Date().toISOString();
    const saved = await upsertTask({
      id: existing.id,
      feature_id: existing.feature_id,
      name: existing.name,
      description: existing.description,
      task_type: existing.task_type,
      acceptance_criteria: existing.acceptance_criteria,
      status: "CLAIMED",
      claimed_by_id: actorId,
      claimed_date,
      created_by_id: existing.created_by_id,
    });

    // Best-effort last_active_date update
    try {
      const contributor = await getContributor(actorId);
      if (contributor) {
        await putContributor({
          ...contributor,
          last_active_date: new Date().toISOString(),
        });
      }
    } catch {
      // ignore
    }

    return { statusCode: 200, body: JSON.stringify({ task: saved }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify(err) };
  }
};
