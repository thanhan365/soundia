// Default fallback handler for cover images
export const FALLBACK_COVER = '/fallback-cover.svg';

export const handleImgError = (e) => {
  if (e.target.src !== FALLBACK_COVER) {
    e.target.src = FALLBACK_COVER;
  }
};
