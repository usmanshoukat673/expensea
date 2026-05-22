import { getTeamData, getPublicTeamById, getPublicTeamBySlug } from '@/lib/data/dashboard';

export const teamService = {
  getTeamData,
  getPublicBySlug: getPublicTeamBySlug,
  getPublicById: getPublicTeamById,
};
