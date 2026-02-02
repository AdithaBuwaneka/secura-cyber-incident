// ImageKit configuration
export const imagekitConfig = {
  urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || '',
  publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || '',
};

// Helper function to generate ImageKit URLs
export const getImageKitUrl = (filePath: string, transformations?: string) => {
  const baseUrl = imagekitConfig.urlEndpoint;
  
  if (transformations) {
    return `${baseUrl}/tr:${transformations}/${filePath}`;
  }
  
  return `${baseUrl}/${filePath}`;
};

// Helper to check if ImageKit is configured
export const isImageKitConfigured = () => {
  return !!(imagekitConfig.urlEndpoint && imagekitConfig.publicKey);
};