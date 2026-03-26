
'use server';

import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary with credentials from environment variables
// This is safe to do in a server action as this code only runs on the server.
const configureCloudinary = () => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret || cloudName === 'TU_CLOUD_NAME_AQUI') {
        console.warn('Cloudinary credentials are not fully set in .env.local. File uploads will not work.');
        return false;
    }

    cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
    });
    return true;
};


/**
 * Uploads a file to Cloudinary using a Server Action.
 * This function runs exclusively on the server.
 * @param path - The desired path/folder in Cloudinary. This is used in the public_id.
 * @param dataUrl - The file represented as a data URL (e.g., 'data:image/png;base64,iVBORw0KGgo...').
 * @returns A promise that resolves with the public secure URL of the uploaded file.
 */
export async function uploadFileToServer(path: string, dataUrl: string): Promise<string> {
    const isConfigured = configureCloudinary();
    if (!isConfigured) {
        throw new Error('File upload is not available. Cloudinary credentials are not configured on the server.');
    }

    try {
        const isPdf = path.toLowerCase().endsWith('.pdf');

        const uploadOptions: any = {
            public_id: path,
            unique_filename: false, // Set to false to respect the given path as public_id
            overwrite: true,
        };
        
        // If the file is a PDF, specify the resource_type as 'raw' or 'auto'.
        // 'raw' is safer for non-image files.
        if (isPdf) {
            uploadOptions.resource_type = 'raw';
        }

        const uploadResult = await cloudinary.uploader.upload(dataUrl, uploadOptions);

        // Return the secure URL of the uploaded file
        return uploadResult.secure_url;

    } catch (error: any) {
        console.error("Error uploading file to Cloudinary via Server Action:", error);
        // Throw a more user-friendly error to be caught by the UI.
        throw new Error(`Failed to upload file to Cloudinary: ${error.message}`);
    }
}
