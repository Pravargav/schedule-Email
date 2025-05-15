import { Handle, Position } from 'reactflow';

export default function LeadSourceNode({ data }) {
  return (
    <div className="custom-node lead-source-node">
      <Handle type="target" position={Position.Top} />
      <div className="node-header">
        <div className="node-title">{data.label}</div>
      </div>
      <div className="node-content">
        {data.fromEmail ? (
          <div className="node-detail">
            <strong>From:</strong> {data.fromEmail}
          </div>
        ) : (
          <div className="node-empty-state">Click to select email</div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}