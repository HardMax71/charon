import { Node } from '@/types/graph';
import { GraphFilters } from '@/stores/uiStore';

/**
 * Check if a node matches the current graph filters.
 * Used by both NodeMesh and EdgeMesh to determine visibility.
 */
export const nodeMatchesFilters = (
  node: Node,
  filters: GraphFilters,
  filtersActive: boolean
): boolean => {
  if (!filtersActive) return true;

  const { languages, services, statuses, thirdPartyOnly } = filters;

  if (thirdPartyOnly) {
    return node.type === 'third_party';
  }

  let matches = true;

  if (languages.length > 0) {
    matches = matches && (node.language ? languages.includes(node.language) : false);
  }

  if (services.length > 0) {
    matches = matches && (node.service ? services.includes(node.service) : false);
  }

  if (statuses.length > 0) {
    const nodeStatuses: string[] = [];
    if (node.metrics.is_hot_zone) nodeStatuses.push('hotZone');
    if (node.metrics.is_circular) nodeStatuses.push('circular');
    if (node.metrics.is_high_coupling) nodeStatuses.push('highCoupling');
    matches = matches && statuses.some(s => nodeStatuses.includes(s));
  }

  return matches;
};
