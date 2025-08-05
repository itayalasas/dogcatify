/**
 * Generate QR code for medical history sharing
 */
export const generateQRCode = async (url: string, size: number = 200): Promise<string> => {
  try {
    // Use QR Server API for generating QR codes
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&format=png&margin=10`;
    
    return qrApiUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
};

/**
 * Generate QR code with custom styling for veterinary sharing
 */
export const generateVeterinaryQRCode = async (
  url: string, 
  petName: string,
  size: number = 300
): Promise<string> => {
  try {
    // Enhanced QR code with error correction and custom styling
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&format=png&margin=20&ecc=M&color=2D6A6F&bgcolor=FFFFFF`;
    
    return qrApiUrl;
  } catch (error) {
    console.error('Error generating veterinary QR code:', error);
    throw error;
  }
};

/**
 * Create shareable medical history URL for veterinarians
 */
export const createVeterinaryShareUrl = (petId: string, htmlUrl?: string): string => {
  const appDomain = process.env.EXPO_PUBLIC_APP_DOMAIN || process.env.EXPO_PUBLIC_APP_URL || 'https://app-dogcatify.netlify.app';
  let shareUrl = `${appDomain}/medical-history/${petId}`;
  
  if (htmlUrl) {
    shareUrl += `?html=${encodeURIComponent(htmlUrl)}`;
  }
  
  return shareUrl;
};

/**
 * Generate complete sharing package (HTML + QR)
 */
export const generateSharingPackage = async (
  petId: string, 
  petName: string, 
  shareUrl: string
): Promise<{
  shareUrl: string;
  qrCodeUrl: string;
  shortUrl: string;
}> => {
  try {
    const qrCodeUrl = await generateVeterinaryQRCode(shareUrl, petName);
    
    // Create a shorter, more readable URL for display
    const shortUrl = `dogcatify.com/vet/${petId.slice(-8)}`;
    
    return {
      shareUrl,
      qrCodeUrl,
      shortUrl
    };
  } catch (error) {
    console.error('Error generating sharing package:', error);
    throw error;
  }
};