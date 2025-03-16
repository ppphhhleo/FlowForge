import OpenAI from "openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";

import sampleTaskFlows from "../data/sample-taskflows.json";
import sampleTaskFlowsTravel from "../data/sample-tasksflows-travel.json";
import sampleTaskFlowsPodcast from "../data/sample-taskflows-podcast.json";
import sampleTaskFlowsReview from "../data/sample-taskflows-review.json";

import promptTaskflow from "../models/prompt-generate-taskflows.json";

const GenerateTaskFlows = async (task, runRealtime) => {
  let taskDescription = task.description;
  const taskFile = task.uploadedFile || null;
  // TODO: how to integrate the task file into the task description
  // I think this should work for passing to GPT - Nick

  function isTextFile(fileContent) {
    for (let i = 0; i < fileContent.length; i++) {
      const charCode = fileContent.charCodeAt(i);
      if (
        (charCode < 32 || charCode > 126) &&
        charCode !== 10 &&
        charCode !== 9
      ) {
        return false;
      }
    }
    return true;
  }

  if (taskFile) {
    const fileContent = await taskFile.text();
    if (isTextFile(fileContent)) {
      taskDescription += `\n\nAdditional materials that may be helpful: ${fileContent}`;
    }
  }

  const openai = new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true,
  });

  const systemMessage_schema = promptTaskflow.systemMessage_schema;
  const systemMessage = systemMessage_schema;

  const systemMessage_ideas = promptTaskflow.systemMessage_ideas.replace(
    "{{flow_num}}",
    3
  );
  const systemMessage_oneFlow = promptTaskflow.systemMessage_oneFlow;

  const ideasSchema = z.object({
    flowProposals: z.array(z.string()),
  });

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

  const oneTaskFlowSchema = z.object({
    taskFlowName: z.string(),
    taskFlowDescription: z.string(),
    taskFlowSteps: z.array(
      z.object({
        stepName: z.string(),
        stepLabel: z.string(), // Short label for the step
        stepDescription: z.string(), // Detailed description of the step
      })
    ),
  });

  // TODO: remove this after testing
  console.log("task", task);
  let sampleTaskFlowData;
  if (task.name === "Travel Planning") {
    sampleTaskFlowData = sampleTaskFlowsTravel;
  } else if (task.name === "Generate Presentation Script") {
    sampleTaskFlowData = sampleTaskFlows;
  } else if (task.name === "Generate Podcast Script") {
    sampleTaskFlowData = sampleTaskFlowsPodcast;
  } else if (task.name === "Review a Paper") {
    sampleTaskFlowData = sampleTaskFlowsReview;
  }

  try {
    // TODO: remove this after testing the patterns generation
    if (!runRealtime) {
      return sampleTaskFlowData;
    }

    // const taskFlows = [];
    // const completion = await openai.beta.chat.completions.parse({
    //     model: "gpt-4o-mini",
    //     messages: [
    //         { role: "system", content: systemMessage_ideas },
    //         { role: "user", content: taskDescription },
    //     ],
    //     response_format: zodResponseFormat(ideasSchema, "flowProposals"),
    // });
    // const flowProposals = completion.choices[0].message.parsed.flowProposals;
    // console.log("Task flows proposals formatted:", flowProposals);

    // for (let i = 0; i < flowProposals.length; i++) {
    //     const oneTaskFlow = await openai.beta.chat.completions.parse({
    //         model: "gpt-4o-mini",
    //         messages: [
    //             { role: "system", content: systemMessage_oneFlow },
    //             { role: "user", content: taskDescription },
    //             { role: "user", content: flowProposals[i] },
    //         ],
    //         response_format: zodResponseFormat(oneTaskFlowSchema, "taskflow"),
    //     });
    //     const res = oneTaskFlow.choices[0].message.parsed;
    //     console.log("One task flow response formatted:", res);
    //     taskFlows.push(res);
    // }
    // return {taskFlows: taskFlows};

    const completion = await openai.beta.chat.completions.parse({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: taskDescription },
      ],
      response_format: zodResponseFormat(taskFlowSchema, "taskflow"),
    });
    const res = completion.choices[0].message.parsed;
    console.log("Task flows response formatted:", res);
    return res;
  } catch (error) {
    console.error("Error generating task flows:", error);
    throw error;
  }
};

export default GenerateTaskFlows;
