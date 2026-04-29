/**
 * This function was originally a Next.js Server Action, but due to bugs in Netlify 
 * deployments where the server action hashes get mismatched or lost, we've 
 * migrated it to call a standard API Route instead.
 * 
 * @param path - The desired path/folder in Cloudinary. This is used in the public_id.
 * @param dataUrl - The file represented as a data URL (e.g., 'data:image/png;base64,iVBORw0KGgo...').
 * @returns A promise that resolves with the public secure URL of the uploaded file.
 */
export async function uploadFileToServer(path: string, dataUrl: string): Promise<string> {
    const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, dataUrl }),
    });
    
    if (!response.ok) {
        let errorMessage = 'Failed to upload file';
        try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
        } catch (e) {
            // Ignored, response is not JSON
        }
        throw new Error(`Upload API Error: ${errorMessage}`);
    }
    
    const data = await response.json();
    return data.url;
}
