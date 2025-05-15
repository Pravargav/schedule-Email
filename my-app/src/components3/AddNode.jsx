import { Handle, Position } from 'reactflow';

export default function AddNode({ data }) {
  return (
    <div className="add-node">
      <Handle type="target" position={Position.Top} />
      <div className="plus-button">{data.label}</div>
    </div>
  );
}