import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WizardStep {
  id: string;
  title: string;
  description: string;
}

interface WizardProgressProps {
  steps: WizardStep[];
  currentStep: number;
  onStepClick: (index: number) => void;
  completedSteps: Set<number>;
}

export function WizardProgress({ steps, currentStep, onStepClick, completedSteps }: WizardProgressProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = completedSteps.has(index);
          const isClickable = isCompleted || index <= currentStep;

          return (
            <div key={step.id} className="flex-1 relative">
              <div className="flex flex-col items-center">
                {/* Step circle */}
                <button
                  onClick={() => isClickable && onStepClick(index)}
                  disabled={!isClickable}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200",
                    isActive && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                    isCompleted && !isActive && "bg-primary text-primary-foreground cursor-pointer hover:ring-2 hover:ring-primary/30",
                    !isActive && !isCompleted && "bg-muted text-muted-foreground",
                    isClickable && !isActive && "cursor-pointer"
                  )}
                >
                  {isCompleted && !isActive ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    index + 1
                  )}
                </button>
                
                {/* Step title */}
                <span className={cn(
                  "mt-2 text-sm font-medium text-center",
                  isActive && "text-primary",
                  !isActive && !isCompleted && "text-muted-foreground",
                  isCompleted && !isActive && "text-foreground"
                )}>
                  {step.title}
                </span>
                
                {/* Step description - only show on larger screens */}
                <span className="hidden md:block text-xs text-muted-foreground text-center mt-0.5">
                  {step.description}
                </span>
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="absolute top-5 left-[calc(50%+24px)] w-[calc(100%-48px)] h-0.5">
                  <div className={cn(
                    "h-full transition-colors duration-200",
                    completedSteps.has(index) ? "bg-primary" : "bg-muted"
                  )} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
