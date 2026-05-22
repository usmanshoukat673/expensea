import {
  Briefcase,
  Circle,
  Layers,
  Plane,
  Tv,
  Utensils,
  Wifi,
  Zap,
  type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  utensils: Utensils,
  plane: Plane,
  briefcase: Briefcase,
  wifi: Wifi,
  zap: Zap,
  tv: Tv,
  layers: Layers,
  circle: Circle,
};

export function getCategoryIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? Circle;
}

export const CATEGORY_ICON_OPTIONS = Object.keys(ICON_MAP);
