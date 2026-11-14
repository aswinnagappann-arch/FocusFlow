import React from 'react';

interface SummaryCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBgClass: string;
  onClick?: () => void;
  footerDots?: boolean[];
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBgClass,
  onClick,
  footerDots,
}) => {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`w-full text-left rounded-2xl border border-gray-200 dark:border-[#1E232E] bg-white dark:bg-[#13161C] p-5 transition-colors ${
        onClick
          ? 'hover:border-gray-300 dark:hover:border-[#2E3546] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500'
          : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl shrink-0 ${iconBgClass}`}
        >
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-xs font-medium text-gray-500 dark:text-[#7C8496] truncate">
          {title}
        </span>
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight tabular-nums text-gray-900 dark:text-white">
          {value}
        </span>
        <span className="text-xs text-gray-500 dark:text-[#8E96A8] truncate">
          {subtitle}
        </span>
      </div>

      {footerDots && footerDots.length > 0 && (
        <div className="mt-3.5 grid grid-cols-10 gap-1" aria-hidden="true">
          {footerDots.map((active, idx) => (
            <span
              key={idx}
              className={`h-1.5 w-1.5 rounded-full ${
                active
                  ? 'bg-amber-500 dark:bg-amber-400'
                  : 'bg-gray-200 dark:bg-[#252A36]'
              }`}
            />
          ))}
        </div>
      )}
    </Wrapper>
  );
};
