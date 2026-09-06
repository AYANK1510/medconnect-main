import React from 'react';

export interface PageContainerProps {
  children: React.ReactNode;
  maxWidth?: string;
  className?: string;
  header?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  banner?: React.ReactNode;
}

/**
 * Reusable Healthcare SaaS Page Container
 * Ensures consistent whitespace, responsive margins, and max-width constraints (Source Visual Authority)
 */
export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  maxWidth = 'max-w-7xl',
  className = '',
  header,
  breadcrumbs,
  banner,
}) => {
  return (
    <main className="flex-1 min-h-0 bg-slate-50/50">
      {banner && <div className="border-b border-slate-200/80 bg-white">{banner}</div>}

      <div className={`${maxWidth} mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 ${className}`}>
        {breadcrumbs && <div className="mb-4">{breadcrumbs}</div>}
        {header && <div className="mb-6">{header}</div>}
        {children}
      </div>
    </main>
  );
};

export default PageContainer;
