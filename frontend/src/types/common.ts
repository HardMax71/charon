export type IconComponent = React.ComponentType<{ className?: string }>;

export interface SectionHeaderProps {
  icon: IconComponent;
  label: string;
}

export interface MetricBoxProps {
  label: string;
  value: string | number;
  desc: string;
}

export interface AlertBoxProps {
  type: 'critical' | 'warning';
  title: string;
  desc: string;
}

export interface FormatOptionProps {
  label: string;
  icon: IconComponent;
  onClick: () => void;
  loading?: boolean;
}
