import React from 'react';
import { FolderOpen, Plus } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  icon
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-surface-card border border-surface-border rounded-xl my-4">
      <div className="p-4 bg-surface-bg rounded-full border border-surface-border text-acpb-yellow mb-4">
        {icon || <FolderOpen className="w-8 h-8" />}
      </div>
      <h3 className="text-lg font-semibold text-white mb-2 font-heading">{title}</h3>
      <p className="text-sm text-text-secondary max-w-md mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} leftIcon={<Plus className="w-4 h-4" />}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
