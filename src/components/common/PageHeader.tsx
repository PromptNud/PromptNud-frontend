import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <header className="bg-primary px-6 pt-12 pb-8 rounded-b-3xl shadow-lg relative z-10">
      <div className="text-center">
        {subtitle && (
          <p className="text-white/80 text-sm font-medium uppercase tracking-wider mb-1">
            {subtitle}
          </p>
        )}
        <h1 className="text-white text-2xl font-bold">{title}</h1>
      </div>
      {children}
    </header>
  );
}
