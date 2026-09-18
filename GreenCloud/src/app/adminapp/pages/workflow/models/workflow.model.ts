export interface WorkflowStage {
  _id?: string;
  workflowCode: string;
  stageCode: string;
  stageName: string;
  stageType: 'normal' | 'terminal' | 'reject' | 'hold';
  sequence: number;
  isInitial: boolean;
  isFinal: boolean;
  description?: string;
  isActive: boolean;
  actions?: WorkflowAction[];
}

export interface WorkflowAction {
  _id?: string;
  workflowCode: string;
  stageCode: string;
  actionCode: string;
  actionName: string;
  nextStageCode: string | null;
  rejectStageCode: string | null;
  buttonColor: string;
  allowedRoles: string[];
  requiresComment: boolean;
  requiresAttachment: boolean;
  mailRequired: boolean;
  mailRecipients: string;
  mailSubjectTemplate: string;
  mailBodyTemplate: string;
  displayOrder: number;
  isActive: boolean;
}

export interface WorkflowConfig {
  workflow: {
    _id: string;
    workflowCode: string;
    workflowName: string;
    entityType: string;
    version: number;
    isActive: boolean;
    description: string;
  };
  stages: WorkflowStage[];
}

// Diagram node used by the visual renderer
export interface DiagramNode {
  stage: WorkflowStage;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  bgColor: string;
  borderColor: string;
  shape: 'rect' | 'rounded' | 'oval' | 'circle';
}

export interface DiagramArrow {
  from: DiagramNode;
  to: DiagramNode;
  label: string;
  color: string;
  type: 'approve' | 'reject' | 'normal';
  path: string; // SVG path
}
