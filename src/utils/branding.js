export const UNITPRO_LOGO_URL = '/unitpro-logo.svg';
export const UNITPRO_WATERMARK_URL = '/unitpro-watermark.svg';

export const isFreeTier = (tier) => String(tier || 'free').toLowerCase() === 'free';

export const getTenantLogoUrl = (tier, settings = {}) => {
  if (isFreeTier(tier)) return UNITPRO_WATERMARK_URL;
  return settings?.logoUrl || UNITPRO_LOGO_URL;
};
