'use client';

import { useState, useEffect } from 'react';
import { authApi } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { X, ChevronLeft, ChevronRight, Check, Sparkles } from 'lucide-react';

interface TourStep {
  title: string;
  description: string;
  target?: string; // CSS selector for the element to highlight
}

const tourSteps: TourStep[] = [
  {
    title: 'Welcome to NetHub! 🎉',
    description: 'Let\'s take a quick tour of your dashboard. This will only take a minute!',
  },
  {
    title: 'Analytics Dashboard',
    description: 'View key metrics, subscriber trends, and performance data at a glance. This is your command center.',
    target: '[href="/dashboard/analytics"]',
  },
  {
    title: 'Manage Agents',
    description: 'Add, edit, and track your sales agents. Monitor their performance and referral codes.',
    target: '[href="/dashboard/agents"]',
  },
  {
    title: 'Review Applications',
    description: 'Process new subscriber applications. Approve, deny, or request more information.',
    target: '[href="/dashboard/applications"]',
  },
  {
    title: 'Active Subscribers',
    description: 'View all active subscribers, their plans, and subscription details.',
    target: '[href="/dashboard/subscribers"]',
  },
  {
    title: 'Commission Management',
    description: 'Track and manage agent commissions. Mark payments as eligible or paid.',
    target: '[href="/dashboard/commissions"]',
  },
  {
    title: 'Calendar of Events',
    description: 'Schedule and manage company events, meetings, and important dates.',
    target: '[href="/dashboard/events"]',
  },
  {
    title: 'You\'re All Set! 🚀',
    description: 'You can replay this tour anytime from Settings > Appearance. Happy managing!',
  },
];

interface OnboardingTourProps {
  onComplete: () => void;
  onSkip?: () => void;
}

export default function OnboardingTour({ onComplete, onSkip }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const step = tourSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === tourSteps.length - 1;

  useEffect(() => {
    if (step.target) {
      const element = document.querySelector(step.target);
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);
        // Scroll element into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      setTargetRect(null);
    }
  }, [currentStep, step.target]);

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    try {
      setLoading(true);
      await authApi.completeOnboarding();
      toast.success('Onboarding completed!');
      onComplete();
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete onboarding');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    if (onSkip) {
      onSkip();
    } else {
      await handleComplete();
    }
  };

  return (
    <>
      {/* Dark Overlay with SVG Mask for cutout */}
      <svg className="fixed inset-0 z-[100] pointer-events-none" style={{ width: '100%', height: '100%' }}>
        <defs>
          <mask id="spotlight-mask">
            {/* White rectangle covers entire screen */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Black rectangle creates the cutout for highlighted element */}
            {targetRect && (
              <rect
                x={targetRect.left - 8}
                y={targetRect.top - 8}
                width={targetRect.width + 16}
                height={targetRect.height + 16}
                rx="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        {/* Apply mask to dark overlay */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.8)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* Glowing border around highlighted element */}
      {targetRect && (
        <>
          {/* Main glowing border */}
          <div
            className="fixed z-[101] rounded-lg pointer-events-none"
            style={{
              top: `${targetRect.top - 8}px`,
              left: `${targetRect.left - 8}px`,
              width: `${targetRect.width + 16}px`,
              height: `${targetRect.height + 16}px`,
              boxShadow: '0 0 0 3px rgba(0, 161, 145, 1), 0 0 20px 4px rgba(0, 161, 145, 0.6), 0 0 40px 8px rgba(0, 161, 145, 0.3)',
              border: '3px solid rgba(0, 161, 145, 0.8)',
            }}
          />
          {/* Animated pulse ring */}
          <div
            className="fixed z-[101] border-2 border-teal-400 rounded-lg pointer-events-none"
            style={{
              top: `${targetRect.top - 12}px`,
              left: `${targetRect.left - 12}px`,
              width: `${targetRect.width + 24}px`,
              height: `${targetRect.height + 24}px`,
              animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
              opacity: 0.75,
            }}
          />
        </>
      )}

      {/* Centered Modal */}
      <div className="fixed inset-0 z-[102] flex items-center justify-center p-4 pointer-events-none overflow-y-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full pointer-events-auto border-2 border-teal-500 my-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-teal-50 to-teal-100 dark:from-teal-900/30 dark:to-teal-800/30 rounded-t-2xl">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-teal-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <span className="text-xs sm:text-sm font-semibold text-teal-700 dark:text-teal-300">
                Step {currentStep + 1} of {tourSteps.length}
              </span>
            </div>
            <button
              onClick={handleSkip}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors flex-shrink-0"
              title="Skip tour"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-8">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">
              {step.title}
            </h3>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
              {step.description}
            </p>
          </div>

          {/* Progress bar */}
          <div className="px-4 sm:px-8 pb-4 sm:pb-6">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 sm:h-2.5">
              <div
                className="bg-teal-600 h-2 sm:h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / tourSteps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-b-2xl">
            <button
              onClick={handlePrevious}
              disabled={isFirstStep}
              className="flex items-center gap-1 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-base text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden xs:inline">Previous</span>
              <span className="xs:hidden">Prev</span>
            </button>

            <button
              onClick={handleNext}
              disabled={loading}
              className="flex items-center gap-1 sm:gap-2 px-4 sm:px-6 py-2 sm:py-2.5 text-sm sm:text-base bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg shadow-teal-600/30"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="hidden xs:inline">Completing...</span>
                  <span className="xs:hidden">Wait...</span>
                </>
              ) : isLastStep ? (
                <>
                  <span>Finish</span>
                  <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                </>
              ) : (
                <>
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
