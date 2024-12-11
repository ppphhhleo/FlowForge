import OpenAI from "openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { useEffect } from "react";

const GenerateTaskFlows = async (task) => {
    const taskDescription = task.description;
    const taskFile = task.uploadedFile || null; // This variable is declared but not used

    const openai = new OpenAI({
        apiKey: import.meta.env.VITE_OPENAI_API_KEY,
        dangerouslyAllowBrowser: true,
    });

    const systemMessage =
        "You are an expert in management, analyzing tasks, workflow generation, task flow generation, and task decomposition. " +
        "You are tasked with generating task flows for a given task. " +
        "You are provided with a task description. " +
        "You need to generate 3 task flows for the given task, use different mindsets and strategies to solve the task" +
        "For each task flow, they are parallel to each other and solving the same provided task, \
        each task flow should have a unique id, name, description, and steps list. \
        For each task flow steps, split the task into distinct steps. \
        For each step, provide a brief name, a short label and a brief description.";

    const taskFlowSchema = z.object({
        taskFlows: z.array(
            z.object({
                taskFlowId: z.string(),
                taskFlowName: z.string(),
                taskFlowDescription: z.string(),
                taskFlowSteps: z.array(
                    z.object({
                        stepName: z.string(),
                        stepLabel: z.string(), // Short label for the step
                        stepDescription: z.string(), // Detailed description of the step
                    })
                ),
            })
        ),
    });

    try {
        const completion = await openai.beta.chat.completions.parse({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemMessage },
                { role: "user", content: taskDescription },
            ],
            response_format: zodResponseFormat(taskFlowSchema, "taskflow"),
        });

        const res = completion.choices[0].message.parsed;
        console.log("Task flows response:", res);
        return res;
    } catch (error) {
        console.error("Error generating task flows:", error);
        throw error;
    }
};

export default GenerateTaskFlows;
