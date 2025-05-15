import { Handle, Position } from 'reactflow';

export default function ColdEmailNode({ data }) {
  return (
    <div className="custom-node cold-email-node">
      <Handle type="target" position={Position.Top} />
      <div className="node-header">
        <div className="node-title">{data.label}</div>
      </div>
      <div className="node-content">
        {data.subject ? (
          <>
            <div className="node-detail">
              <strong>Subject:</strong> {data.subject.length > 25 ? `${data.subject.substring(0, 25)}...` : data.subject}
            </div>
            <div className="node-detail">
              <strong>Body:</strong> {data.body ? (data.body.length > 40 ? `${data.body.substring(0, 40)}...` : data.body) : 'Not set'}
            </div>
          </>
        ) : (
          <div className="node-empty-state">Click to configure email</div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}