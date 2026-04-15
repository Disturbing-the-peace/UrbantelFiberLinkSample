import Image from 'next/image';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeMap = {
    sm: 32,
    md: 48,
    lg: 64,
  };

  const dimension = sizeMap[size];

  return (
    <div className={`inline-block ${className}`}>
      <Image
        src="/test.png"
        alt="Loading..."
        width={dimension}
        height={dimension}
        className="object-contain animate-pulse-glow"
      />
      <style jsx>{`
        @keyframes pulse-glow {
          0%, 100% {
            opacity: 1;
            filter: drop-shadow(0 0 8px rgba(0, 161, 145, 0.6));
          }
          50% {
            opacity: 0.7;
            filter: drop-shadow(0 0 16px rgba(0, 161, 145, 0.9));
          }
        }
        :global(.animate-pulse-glow) {
          animation: pulse-glow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
