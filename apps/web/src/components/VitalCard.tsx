'use client';

interface VitalCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
  color?: 'green' | 'blue' | 'amber' | 'red';
}

export default function VitalCard({ title, value, subtitle, icon, color = 'green' }: VitalCardProps) {
  const colorClasses = {
    green: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30',
    blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/30',
    amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/30',
    red: 'from-red-500/20 to-red-500/5 border-red-500/30',
  };

  const textColors = {
    green: 'text-emerald-400',
    blue: 'text-blue-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
  };

  return (
    <div className={`rounded-2xl bg-gradient-to-br ${colorClasses[color]} border p-6`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400 mb-1">{title}</p>
          <p className={`text-2xl font-bold ${textColors[color]}`}>{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        {icon && <div className={`${textColors[color]} opacity-60`}>{icon}</div>}
      </div>
    </div>
  );
}
