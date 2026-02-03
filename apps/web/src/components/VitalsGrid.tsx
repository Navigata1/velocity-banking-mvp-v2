'use client';

interface Vital {
  icon: string;
  label: string;
  value: string;
  sublabel?: string;
}

interface VitalsGridProps {
  vitals: Vital[];
}

export default function VitalsGrid({ vitals }: VitalsGridProps) {
  return (
    <div className="space-y-4">
      {vitals.map((vital, i) => (
        <div
          key={i}
          className="bg-slate-800/80 rounded-2xl p-5 border border-slate-700 hover:border-slate-600 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center text-2xl">
              {vital.icon}
            </div>
            <div>
              <p className="text-sm text-gray-400">{vital.label}</p>
              <p className="text-2xl font-bold text-white">{vital.value}</p>
              {vital.sublabel && (
                <p className="text-xs text-gray-500">{vital.sublabel}</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
