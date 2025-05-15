// Define node types for the sidebar
export const nodeTypes = [
    { type: 'input', label: 'Input Node', className: 'bg-primary text-white' },
    { type: 'default', label: 'Default Node', className: 'bg-secondary text-white' },
    { type: 'output', label: 'Output Node', className: 'bg-success text-white' },
    { type: 'custom', label: 'Custom Node', className: 'bg-info text-dark' },
  ];
  
  export const initialNodes = [
    {
      id: '1',
      type: 'input',
      data: { label: 'Start Node' },
      position: { x: 250, y: 25 },
    },
    {
      id: '2',
      data: { label: 'Process Node' },
      position: { x: 100, y: 125 },
    },
    {
      id: '3',
      data: { label: 'Decision Node' },
      position: { x: 400, y: 125 },
    },
    {
      id: '4',
      type: 'output',
      data: { label: 'End Node' },
      position: { x: 250, y: 250 },
    },
  ];
  
  export const initialEdges = [
    { id: 'e1-2', source: '1', target: '2' },
    { id: 'e1-3', source: '1', target: '3' },
    { id: 'e2-4', source: '2', target: '4' },
    { id: 'e3-4', source: '3', target: '4' },
  ];