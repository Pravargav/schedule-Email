// src/components/WaitDelayNode.jsx
import { Handle, Position } from 'reactflow';

export default function WaitDelayNode({ data }) {
  const formatDuration = () => {
    if (!data.duration) return 'Not set';
    return `${data.duration} ${data.unit}`;
  };

  return (
    <div className="custom-node wait-delay-node">
      <Handle type="target" position={Position.Top} />
      <div className="node-header">
        <div className="node-title">{data.label}</div>
      </div>
      <div className="node-content">
        {data.duration ? (
          <div className="node-detail">
            <strong>Wait:</strong> {formatDuration()}
          </div>
        ) : (
          <div className="node-empty-state">Click to set wait time</div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}