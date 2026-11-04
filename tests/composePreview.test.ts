import { describe, expect, it } from 'vitest';
import { cardPreviewModel, labelPreviewModel, previewIdentity } from '../src/lib/composePreview';

const phone = { type: 'phone' as const, value: '9647701234567', display: '+964 770 123 4567' };
const username = { type: 'username' as const, value: 'ahmad', display: '@ahmad' };

describe('compose preview models', () => {
  it('formats phone and username identities', () => {
    expect(previewIdentity(phone)).toEqual({ name: '+964 770 123 4567', handle: '+9647701234567' });
    expect(previewIdentity(username)).toEqual({ name: '@ahmad', handle: '@ahmad' });
    expect(previewIdentity(null)).toEqual({ name: '', handle: '' });
  });

  it('builds card and label previews without leaking full long messages', () => {
    const card = cardPreviewModel(phone, 'شخصي', 'x'.repeat(300));
    expect(card.workspaceName).toBe('شخصي');
    expect(card.message.length).toBe(140);
    expect(labelPreviewModel(phone, 'شخصي')).toMatchObject({ name: '+964 770 123 4567', workspaceName: 'شخصي' });
  });
});
