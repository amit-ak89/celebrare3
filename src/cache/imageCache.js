const imageMetadataCache = new Map();

export function getImageFromMemoryCache(id) {
  if (!imageMetadataCache.has(id)) {
    return null;
  }

  console.log('Loaded from Memory Cache');
  return imageMetadataCache.get(id);
}

export function setImageInMemoryCache(image) {
  imageMetadataCache.set(image.id, image);
  return image;
}

export function getOrCacheImageMetadata(image) {
  return getImageFromMemoryCache(image.id) || setImageInMemoryCache(image);
}

export function primeImageMemoryCache(images) {
  images.forEach((image) => {
    if (!imageMetadataCache.has(image.id)) {
      imageMetadataCache.set(image.id, image);
    }
  });
}
