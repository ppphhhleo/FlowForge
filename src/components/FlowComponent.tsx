import React, { useEffect, useRef, useCallback, useState} from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    addEdge,
    useNodesState,
    useEdgesState,
    useReactFlow,
    type OnConnect,
    Panel,
  } from '@xyflow/react';
import { nodeTypes } from '../nodes';
import { edgeTypes } from '../edges';
import { getLayoutedNodesAndEdges } from '../utils/dagreUtils';
import { useDnD } from './DnDContext';
import '@xyflow/react/dist/style.css';
let nodeId = 0;

export function FlowPanelComponent(props) {
    const {screenToFlowPosition} = useReactFlow();
    const updateNodeData = props.updateNodeData;
    const [nodes, setNodes, onNodesChange] = useNodesState(props.graph.nodes || []);
    const [edges, setEdges, onEdgesChange] = useEdgesState(props.graph.edges || []);
    const [type] = useDnD();
    const [rfInstance, setRfInstance] = useState(null);

    const getId = (id: string) => `dndnode_${id}_${nodeId++}`;

    const onConnect: OnConnect = useCallback(
        (connection) => setEdges((edges) => addEdge(connection, edges)),
        [setEdges]
    );

    const onDragOver = useCallback((event: any) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback((event: any) => {
        event.preventDefault();
        if(!type) return;
    
        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
        const newNode = {
          id: getId(props.id),
          type,
          position,
          data: {label: `${type} node`},
        };
        setNodes((nds: any) => nds.concat(newNode));
    }, [type, screenToFlowPosition]);
    
    // const onSave = useCallback(() => {
    //     if (rfInstance) {
    //         const flow = rfInstance.toObject();
    //         // localStorage.setItem(`flow_${props.id}`, JSON.stringify(flow));
    //         setFlows((prev) => ({...prev, [props.id]: flow}));
    //     }
    // }, [rfInstance]);

     // Sync node updates with Jotai state
     const syncNodeChanges = (nodeId, key, value) => {
        updateNodeData(props.id, nodeId, key, value);
        setNodes((nds) =>
            nds.map((node) =>
                node.id === nodeId ? { ...node, data: { ...node.data, [key]: value } } : node
            )
        );
    };

    // Attach `updateNodeData` to each node before rendering
    const modifiedNodes = nodes.map((node) => ({
        ...node,
        data: {
            ...node.data,
            updateNode: syncNodeChanges,
        },
    }));

    useEffect(() => {
        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedNodesAndEdges(
          nodes,
          edges
        );
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
        // screenToFlowPosition.fitView();
    }, []);

    return (
            <div className="reactflow-wrapper" style={{width: "800px", height: "800px"}}>
                <ReactFlow
                id = {props.id}
                nodes={modifiedNodes}
                edges={edges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onInit={setRfInstance}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onDragOver={onDragOver}
                onDrop={onDrop}
                fitView
            >
                <Background />
                <Controls />
                <MiniMap />
                {/* <Panel position="top-right">
                    <button onClick={onSave}>Save</button>
                </Panel> */}
            </ReactFlow>
        </div>

    )
}