import type { Locale, Workspace } from '../types';

/**
 * Default workspaces are stored with Arabic display names; localize the two
 * built-in ones and fall back to the stored name for custom workspaces.
 */
export function workspaceDisplayName(
  workspace: Pick<Workspace, 'id' | 'name' | 'nameEn'> | null | undefined,
  t: (ar: string, en: string) => string,
  locale: Locale
): string {
  if (!workspace || workspace.id === 'personal') return t('شخصي', 'Personal');
  if (workspace.id === 'work') return t('عمل', 'Work');
  return locale === 'en' ? workspace.nameEn || workspace.name : workspace.name;
}
