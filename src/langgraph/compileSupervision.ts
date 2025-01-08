import { createAgent, create_agent_node } from "./utils";
import { RunnableConfig } from "@langchain/core/runnables";
import { z } from "zod";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { MessagesPlaceholder } from "@langchain/core/prompts";

const compileSupervision = async (workflow, nodesInfo, stepEdges, AgentState) => {
    const edgesDict: Record<string, { id: string; source: string; target: string; type: string; label: string }[]> = {};
    
    let members = [] as const;
    let options = [] as const;

    const supervisor = nodesInfo.find(node => node.type === "supervisor");
    const agents = nodesInfo.filter(node => node.type !== "supervisor");

    for (const node of agents) {
        const createdAgent = async () => await createAgent({
                llmOption: node.data.llm,
                tools: node.data.tools,
                systemMessage: node.data.systemPrompt,
            });
            const agentNode = async (state:typeof AgentState.State, config?:RunnableConfig) => {
                return create_agent_node({
                    state: state,
                    agent: await createdAgent(),
                    name: node.label,
                    config: config,
            });
        }
        workflow.addNode(node.id, agentNode);
        edgesDict[node.id] = stepEdges.filter(edge => edge.source === node.id) || [];
    }

    edgesDict[supervisor.id] = stepEdges.filter(edge => edge.source === supervisor.id) || [];
    

    const selectNextFunction = {
        name: "selectNext",
        description: "Select the next agent to act",
        schema: z.object({
            next: z.enum(members),
        }),
    }

    const prompt = ChatPromptTemplate.fromMessages([
        ["system", supervisor.data.systemPrompt],
        new MessagesPlaceholder("messages"),
        ["system", "Given the conversation above, who should act next? \
            Or should we summarize the results and respond with FINISH? Select one of: {options}"],
    ]);


    const formattedPrompt = async () => {
        return await prompt.partial({
            options: options,
            members: members,
        })
    }

    const supervisor_llm_model = new ChatOpenAI({
        modelName: supervisor.data.llm,
        temperature: 0,
        apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    });

    const supervisorChain = async () => {
        const fp = await formattedPrompt();
        return fp
            .pipe(supervisor_llm_model.bindTools([selectNextFunction], {tool_choice: "selectNext"}))
            .pipe((data:any) => {return data})
            .pipe((aiMessage) => {if (aiMessage.tool_calls && aiMessage.tool_calls.length>0){
                const args = aiMessage.tool_calls[0].args;
                return args;
            } else {
                throw new Error("No tool calls found");
            }
        })
    }

    workflow.addNode(supervisor.id, supervisorChain);
    // TODO add supervisor edges 
    

    return workflow;
}

export { compileSupervision };