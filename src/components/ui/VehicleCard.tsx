import React from 'react';
import { PlateBadge } from './PlateBadge';
import { Badge } from './Badge';
import { convertArabicDigitsToEnglish } from '../../lib/utils';

export interface VehicleCardData {
  plate_display?: string;
  driver_name?: string;
  phone?: string;
  visits_count?: number;
  notes?: string;
  [key: string]: any;
}

interface VehicleCardProps {
  vehicle: VehicleCardData;
  badge?: React.ReactNode;
  line3Text?: React.ReactNode;
  action?: React.ReactNode;
  size?: 'sm' | 'md';
  className?: string;
  onClick?: () => void;
}

export const VehicleCard: React.FC<VehicleCardProps> = ({
  vehicle,
  badge,
  line3Text,
  action,
  size = 'md',
  className = '',
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`p-3.5 rounded-xl border border-slate-200/80 bg-white shadow-2xs flex items-center justify-between gap-3 ${
        onClick ? 'hover:bg-slate-50/80 hover:border-blue-200 cursor-pointer transition-all' : ''
      } ${className}`}
    >
      <div className="flex flex-col gap-1.5 min-w-0">
        {/* السطر الأول: رقم السيارة وبجواره الشارة */}
        <div className="flex items-center gap-2 flex-wrap">
          <PlateBadge plateDisplay={vehicle.plate_display || 'س ب ج 1234'} size={size === 'sm' ? 'sm' : 'md'} />
          {badge !== undefined ? (
            badge
          ) : vehicle.visits_count !== undefined ? (
            <Badge variant="blue" size="sm">
              {vehicle.visits_count || 0} زيارة
            </Badge>
          ) : null}
        </div>

        {/* السطر الثاني: اسم العميل */}
        <div className="text-xs font-bold text-slate-900 flex items-center">
          <span className="text-slate-400 font-normal text-[11px] ml-1">اسم العميل:</span>
          <span>{vehicle.driver_name || 'غير محدد'}</span>
        </div>

        {/* السطر الثالث: رقم الهاتف / الملاحظات */}
        <div className="text-[11px] text-slate-600 font-medium flex items-center gap-3 flex-wrap">
          {line3Text !== undefined ? (
            line3Text
          ) : (
            <>
              {vehicle.phone && (
                <div>
                  <span className="text-slate-400 font-normal ml-1">رقم الهاتف:</span>
                  <span className="font-mono">{convertArabicDigitsToEnglish(vehicle.phone)}</span>
                </div>
              )}
              {vehicle.notes && (
                <span className="text-blue-700 font-medium">📝 {vehicle.notes}</span>
              )}
            </>
          )}
        </div>
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};
