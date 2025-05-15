// src/App.jsx
import { useState, useCallback } from "react";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
} from "reactflow";
import "reactflow/dist/style.css";
import { Button, Modal, Card, Navbar, Container, Form } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";

// Custom Node Types
import ColdEmailNode from "./components3/ColdEmailNode";
import WaitDelayNode from "./components3/WaitDelayNode";
import LeadSourceNode from "./components3/LeadSourceNode";
import AddNode from "./components3/AddNode";

import axios from "axios";

// Node type registration
const nodeTypes = {
  coldEmail: ColdEmailNode,
  waitDelay: WaitDelayNode,
  leadSource: LeadSourceNode,
  addNode: AddNode,
};

const initialNodes = [];

const initialEdges = [];

export default function App() {
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [showModal, setShowModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showNodeConfigModal, setShowNodeConfigModal] = useState(false);
  const [selectedAddNodeId, setSelectedAddNodeId] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [schedule, setSchedule] = useState({
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
    sunday: false,
  });

  // Connect nodes when they're added
  const onConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  // Handle node click
  const onNodeClick = useCallback((event, node) => {
    if (node.type === "addNode") {
      setSelectedAddNodeId(node.id);
      setShowModal(true);
    } else {
      // Configure existing node
      setSelectedNode(node);
      setShowNodeConfigModal(true);
    }
  }, []);

  // Update node data
  const updateNodeData = (data) => {
    if (!selectedNode) return;

    setNodes(
      nodes.map((node) => {
        if (node.id === selectedNode.id) {
          return {
            ...node,
            data: {
              ...node.data,
              ...data,
            },
          };
        }
        return node;
      })
    );

    setShowNodeConfigModal(false);
  };

  // Add a new node based on type selection
  const addNewNode = (type) => {
    // Get the position of the add node that was clicked
    const addNodeIndex = nodes.findIndex(
      (node) => node.id === selectedAddNodeId
    );
    const addNode = nodes[addNodeIndex];

    if (!addNode) return;

    // Generate new node IDs
    const newNodeId = `node_${Date.now()}`;
    const newAddNodeId = `add_${Date.now()}`;

    // Define initial data based on node type
    let initialData = { label: "" };
    let nodeType = "";

    switch (type) {
      case "A":
        nodeType = "coldEmail";
        initialData = {
          label: "Cold Email",
          subject: "",
          body: "",
          targetEmails: [], // Add this line
        };
        break;
      case "B":
        nodeType = "waitDelay";
        initialData = {
          label: "Wait/Delay",
          duration: 1,
          unit: "hours",
        };
        break;
      case "C":
        nodeType = "leadSource";
        initialData = {
          label: "Lead Source",
          fromEmail: "",
        };
        break;
    }

    // Create new node
    const newNode = {
      id: newNodeId,
      type: nodeType,
      position: {
        x: addNode.position.x,
        y: addNode.position.y + 100,
      },
      data: initialData,
    };

    // Create new add node
    const newAddNode = {
      id: newAddNodeId,
      type: "addNode",
      position: {
        x: addNode.position.x,
        y: addNode.position.y + 200,
      },
      data: { label: "+" },
    };

    // Create edge between previous node and new node
    const sourceNodeId = edges.find(
      (edge) => edge.target === selectedAddNodeId
    )?.source;

    const newEdges = [...edges];

    // If there's a source node, connect it to the new node
    if (sourceNodeId) {
      // Remove the edge to the add node
      const filteredEdges = edges.filter(
        (edge) => edge.target !== selectedAddNodeId
      );

      // Add edge from source to new node
      const sourceToNewEdge = {
        id: `e_${sourceNodeId}-${newNodeId}`,
        source: sourceNodeId,
        target: newNodeId,
      };

      newEdges.splice(0, newEdges.length, ...filteredEdges, sourceToNewEdge);
    }

    // Add edge from new node to new add node
    const newToAddEdge = {
      id: `e_${newNodeId}-${newAddNodeId}`,
      source: newNodeId,
      target: newAddNodeId,
    };

    // Update nodes and edges
    setNodes([
      ...nodes.filter((n) => n.id !== selectedAddNodeId),
      newNode,
      newAddNode,
    ]);
    setEdges([...newEdges, newToAddEdge]);

    // Close modal
    setShowModal(false);

    // Auto-select the new node for configuration
    setSelectedNode(newNode);
    setShowNodeConfigModal(true);
  };

  const resetFlow = () => {
    const startNode = {
      id: "1",
      type: "leadSource",
      position: { x: 250, y: 5 },
      data: {
        label: "Lead Source",
        fromEmail: "",
      },
    };

    const startAddNode = {
      id: "add_start",
      type: "addNode",
      position: { x: 250, y: 100 },
      data: { label: "+" },
    };

    const startEdge = {
      id: "e_1-add_start",
      source: "1",
      target: "add_start",
    };

    setNodes([startNode, startAddNode]);
    setEdges([startEdge]);
  };

  const handleScheduleChange = (day) => {
    setSchedule({
      ...schedule,
      [day]: !schedule[day],
    });
  };

  const saveSchedule = () => {
    setShowScheduleModal(false);
    // Here you would typically send this data to a backend
    console.log("Schedule saved:", schedule);
    alert("Schedule saved successfully!");
  };

  // Function to prepare and send flow data to backend
  const saveAndSendFlow = () => {
    // Structure the complete flow data
    const flowData = {
      nodes: prepareNodesForExport(nodes),
      edges: edges,
      schedule: schedule,
      name: "My Automation Flow", // You might want to add a state variable for this
      createdAt: new Date().toISOString(),
    };

    // Send to backend
    alert(JSON.stringify(flowData));

    sendFlowToBackend(flowData);
  };

  // Prepare nodes data by cleaning up ReactFlow-specific properties
  const prepareNodesForExport = (nodes) => {
    return nodes
      .map((node) => {
        // Remove any UI-specific properties that aren't needed for execution
        const { id, type, data } = node;

        // For each node type, extract only the relevant data
        switch (type) {
          case "coldEmail":
            return {
              id,
              type,
              data: {
                subject: data.subject,
                body: data.body,
                targetEmails: data.targetEmails || [], // Add this line
              },
            };
          case "waitDelay":
            return {
              id,
              type,
              data: {
                duration: data.duration,
                unit: data.unit,
              },
            };
          case "leadSource":
            return {
              id,
              type,
              data: {
                fromEmail: data.fromEmail,
              },
            };
          case "addNode":
            // Exclude addNodes from the final export
            return null;
          default:
            return { id, type, data };
        }
      })
      .filter((node) => node !== null); // Remove null entries
  };

  // Function to send data to your backend

  const sendFlowToBackend = async (flowData) => {
    try {
      // These should be declared in your component state:
      // const [isSaving, setIsSaving] = useState(false);
      // const [errorMessage, setErrorMessage] = useState(null);
      // const [successMessage, setSuccessMessage] = useState(null);

      setIsSaving(true);

      const response = await axios.post(
        "http://localhost:3000/api/sequences",
        flowData,
        {
          headers: {
            "Content-Type": "application/json",
            // Authorization: `Bearer ${yourAuthToken}`, // Uncomment if needed
          },
        }
      );

      setIsSaving(false);
      setSuccessMessage("Flow saved and scheduled successfully!");

      // Optional: Return the saved flow ID for reference
      return response.data.flowId;
    } catch (error) {
      setIsSaving(false);

      if (error.response) {
        // Server responded with a status code outside the 2xx range
        setErrorMessage(
          "Error saving flow: " + error.response.data?.message || "Server error"
        );
      } else if (error.request) {
        // No response was received
        setErrorMessage(
          "No response from server. Please check your connection."
        );
      } else {
        // Other errors
        setErrorMessage("Error saving flow: " + error.message);
      }

      console.error("Error saving flow:", error);
    }
  };

  // Node configuration components based on type
  const renderNodeConfig = () => {
    if (!selectedNode) return null;

    switch (selectedNode.type) {
      case "coldEmail":
        return (
          <>
            <Form.Group className="mb-3">
              <Form.Label>Subject</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter email subject"
                defaultValue={selectedNode.data.subject}
                onChange={(e) =>
                  setSelectedNode({
                    ...selectedNode,
                    data: { ...selectedNode.data, subject: e.target.value },
                  })
                }
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Body</Form.Label>
              <Form.Control
                as="textarea"
                rows={5}
                placeholder="Enter email body"
                defaultValue={selectedNode.data.body}
                onChange={(e) =>
                  setSelectedNode({
                    ...selectedNode,
                    data: { ...selectedNode.data, body: e.target.value },
                  })
                }
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Target Emails (comma separated)</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Enter target emails, separated by commas"
                defaultValue={selectedNode.data.targetEmails?.join(", ") || ""}
                onChange={(e) =>
                  setSelectedNode({
                    ...selectedNode,
                    data: {
                      ...selectedNode.data,
                      targetEmails: e.target.value
                        .split(",")
                        .map((email) => email.trim())
                        .filter((email) => email),
                    },
                  })
                }
              />
            </Form.Group>
          </>
        );
      case "waitDelay":
        return (
          <>
            <Form.Group className="mb-3">
              <Form.Label>Wait Duration</Form.Label>
              <div className="d-flex">
                <Form.Control
                  type="number"
                  min="1"
                  defaultValue={selectedNode.data.duration || 1}
                  onChange={(e) =>
                    setSelectedNode({
                      ...selectedNode,
                      data: {
                        ...selectedNode.data,
                        duration: parseInt(e.target.value),
                      },
                    })
                  }
                />
                <Form.Select
                  className="ms-2"
                  defaultValue={selectedNode.data.unit || "hours"}
                  onChange={(e) =>
                    setSelectedNode({
                      ...selectedNode,
                      data: { ...selectedNode.data, unit: e.target.value },
                    })
                  }
                >
                  <option value="seconds">Seconds</option>
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                </Form.Select>
              </div>
            </Form.Group>
          </>
        );
      case "leadSource":
        return (
          <>
            <Form.Group className="mb-3">
              <Form.Label>From Email</Form.Label>
              <Form.Select
                defaultValue={selectedNode.data.fromEmail}
                onChange={(e) =>
                  setSelectedNode({
                    ...selectedNode,
                    data: { ...selectedNode.data, fromEmail: e.target.value },
                  })
                }
              >
                <option value="">Select Email</option>
                <option value="pravargav24@gmail.com">
                  pravargav24@gmail.com
                </option>
                <option value="samj21032004@gmail.com">
                samj21032004@gmail.com
                </option>
              </Form.Select>
            </Form.Group>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="app-container" style={{ width: "100%", height: "100vh" }}>
      <Navbar bg="dark" variant="dark">
      <UserButton />
        <Container>
          <Navbar.Brand>Email Automation Flow Builder</Navbar.Brand>
          <div>
            <Button
              variant="outline-light"
              className="me-2"
              onClick={() => setShowScheduleModal(true)}
            >
              Schedule
            </Button>
            <Button
              variant="success"
              onClick={saveAndSendFlow}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Flow"}
            </Button>
          </div>
        </Container>
      </Navbar>
      {successMessage && (
        <div
          className="alert alert-success position-fixed top-0 end-0 m-3"
          style={{ zIndex: 1000 }}
        >
          {successMessage}
          <button
            type="button"
            className="btn-close"
            onClick={() => setSuccessMessage(null)}
          />
        </div>
      )}

      {errorMessage && (
        <div
          className="alert alert-danger position-fixed top-0 end-0 m-3"
          style={{ zIndex: 1000 }}
        >
          {errorMessage}
          <button
            type="button"
            className="btn-close"
            onClick={() => setErrorMessage(null)}
          />
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
      >
        <Controls />
        <MiniMap />
        <Background variant="dots" gap={12} size={1} />
        <Panel position="top-right">
          <Button variant="primary" onClick={resetFlow}>
            Reset Flow
          </Button>
        </Panel>
      </ReactFlow>

      {/* Node Type Selection Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Select Node Type</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="node-selection-grid">
            <Card
              className="node-selection-card"
              onClick={() => addNewNode("A")}
            >
              <Card.Body>
                <Card.Title>Cold Email</Card.Title>
                <div className="node-preview cold-email-preview"></div>
                <Card.Text className="mt-2">
                  Send an automated email to your leads
                </Card.Text>
              </Card.Body>
            </Card>

            <Card
              className="node-selection-card"
              onClick={() => addNewNode("B")}
            >
              <Card.Body>
                <Card.Title>Wait/Delay</Card.Title>
                <div className="node-preview wait-delay-preview"></div>
                <Card.Text className="mt-2">
                  Add a waiting period between actions
                </Card.Text>
              </Card.Body>
            </Card>

            <Card
              className="node-selection-card"
              onClick={() => addNewNode("C")}
            >
              <Card.Body>
                <Card.Title>Lead Source</Card.Title>
                <div className="node-preview lead-source-preview"></div>
                <Card.Text className="mt-2">
                  Specify which email account to use
                </Card.Text>
              </Card.Body>
            </Card>
          </div>
        </Modal.Body>
      </Modal>

      {/* Node Configuration Modal */}
      <Modal
        show={showNodeConfigModal}
        onHide={() => setShowNodeConfigModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Configure {selectedNode?.data?.label}</Modal.Title>
        </Modal.Header>
        <Modal.Body>{renderNodeConfig()}</Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowNodeConfigModal(false)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => updateNodeData(selectedNode?.data)}
          >
            Save
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Schedule Modal */}
      <Modal
        show={showScheduleModal}
        onHide={() => setShowScheduleModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Schedule Automation</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Select the days when this flow should run:</p>
          <div className="schedule-days">
            {Object.keys(schedule).map((day) => (
              <Form.Check
                key={day}
                type="checkbox"
                id={`schedule-${day}`}
                label={day.charAt(0).toUpperCase() + day.slice(1)}
                checked={schedule[day]}
                onChange={() => handleScheduleChange(day)}
                className="mb-2"
              />
            ))}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowScheduleModal(false)}
          >
            Cancel
          </Button>
          <Button variant="primary" onClick={saveSchedule}>
            Save Schedule
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
