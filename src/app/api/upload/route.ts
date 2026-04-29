import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
const configureCloudinary = () => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret || cloudName === 'TU_CLOUD_NAME_AQUI') {
        console.warn('Cloudinary credentials are not fully set in .env.local.');
        return false;
    }

    cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
    });
    return true;
};

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { path, dataUrl } = body;

        if (!path || !dataUrl) {
            return NextResponse.json({ error: 'Missing path or dataUrl' }, { status: 400 });
        }

        const isConfigured = configureCloudinary();
        if (!isConfigured) {
            return NextResponse.json({ error: 'Cloudinary is not configured' }, { status: 500 });
        }

        const isPdf = path.toLowerCase().endsWith('.pdf');
        const uploadOptions: any = {
            public_id: path,
            unique_filename: false,
            overwrite: true,
        };

        if (isPdf) {
            uploadOptions.resource_type = 'raw';
        }

        const uploadResult = await cloudinary.uploader.upload(dataUrl, uploadOptions);

        return NextResponse.json({ url: uploadResult.secure_url });
    } catch (error: any) {
        console.error("API Upload Error:", error);
        return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
    }
}
