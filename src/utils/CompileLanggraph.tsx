import { StateGraph } from "@langchain/langgraph/web";
import { Annotation } from "@langchain/langgraph/web";
import { BaseMessage } from "@langchain/core/messages";
import { START } from "@langchain/langgraph/web";

import { compileSingleAgent } from "../langgraph/compileSingleAgent";
import { compileReflection } from "../langgraph/compileReflection";
import { compileSupervision } from "../langgraph/compileSupervision";
import { compileDiscussion } from "../langgraph/compileDiscussion";
import { compileVoting } from "../langgraph/compileVoting";
import {compileParallel} from "../langgraph/compileParallel";
import { AgentsState } from "../langgraph/states";


const CompileLanggraph = async (reactflowConfig) => {
    let totalMaxRound = 0;
    // reactflowConfig = {
    //     stepMetadata: {},
    //     graph: {
    //         nodes: [],
    //         edges: [],
    //     },
    //     configId: "",
    // }

    const {stepMetadata, graph} = reactflowConfig[0];
    const startStep = stepMetadata["step-0"];
    const stepNum = Object.keys(stepMetadata);
    const {nodes, edges} = graph;

    stepNum.forEach((step) => {
        if (step === "step-0") {
            return;
        }
        AgentsState.spec[step.split("-").join("")] = Annotation<BaseMessage[]>({
            default: () => [],
            reducer: (x,y) => x.concat(y),
        });
    });
    // console.log("AgentsState", AgentsState);

    let compiledWorkflow = new StateGraph(AgentsState);

    console.log("reactflow to compile to langgraph", reactflowConfig);

    for (const key of Object.keys(stepMetadata)) {
        if (key === "step-0") {
            continue;
        }
        // console.log("key", key);
        const stepEdges = edges.filter(edge => edge.id.startsWith(key));
        const {inputNodes,  pattern, stepNodes, maxRound, runtime, nextSteps} = stepMetadata[key];
        const stepNodesInfo = stepNodes.map((id) => nodes.find((node) => node.id === id));
        totalMaxRound = Number(totalMaxRound) + Number(maxRound);

        // TODO: deal with total runtime here

        switch (pattern) {
            case "singleAgent":
                // handle single agent with tools or without tools
                compiledWorkflow = await compileSingleAgent(compiledWorkflow, stepNodesInfo, stepEdges, AgentsState);
                break;
            case "reflection":
                compiledWorkflow = await compileReflection(compiledWorkflow, stepNodesInfo, stepEdges, AgentsState, maxRound);
                break;
            case "supervision":
                compiledWorkflow = await compileSupervision(compiledWorkflow, stepNodesInfo, stepEdges, AgentsState, maxRound);
                break;
            case "discussion":
                compiledWorkflow = await compileDiscussion(compiledWorkflow, stepNodesInfo, stepEdges, AgentsState, maxRound);
                break;
            case "voting":
                compiledWorkflow = await compileVoting(compiledWorkflow, stepNodesInfo, stepEdges, AgentsState, maxRound);
                break;
            case "parallel":
                compiledWorkflow = await compileParallel(compiledWorkflow, stepNodesInfo, stepEdges, AgentsState);
                break;
            default:
                compiledWorkflow = await compileSingleAgent(compiledWorkflow, stepNodesInfo, stepEdges, AgentsState);
                console.log("pattern not supported", pattern);
                break;
        }

        // if (key === "step-1" && nextSteps[0] === "step-2" && inputNodes.length !== 0) {
        //     // console.log("adding edge from START to inputNode", inputNodes);
        //     inputNodes.forEach((inputNode) => {
        //         compiledWorkflow.addEdge(START, inputNode);
        //     });
        // } 
        // no need to add END edge for the last step because it is already added in the patterns
    }

    console.log("stepMetadata in langgraph", stepMetadata);

    // add start step

    console.log("startStep", startStep);
    const startStepEdges = edges.filter(edge => edge.id.startsWith("step-0"));
    startStepEdges.forEach((edge) => {
        compiledWorkflow.addEdge(START, edge.target);
    });


    const compiledLanggraph = compiledWorkflow.compile();
    console.log("final Workflow after compile", compiledLanggraph);
    return {compiledLanggraph, totalMaxRound: Number(totalMaxRound)};
}


export default CompileLanggraph;