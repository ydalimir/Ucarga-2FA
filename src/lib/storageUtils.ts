'use client';

import { ref, deleteObject, type Storage } from "firebase/storage";
import { errorEmitter } from './error-emitter';
import { StoragePermissionError } from './errors';

/**
 * Deletes a file from Firebase Storage given its full path.
 * This is a client-side utility and requires the storage instance to be passed in.
 * @param storage - The Firebase Storage instance.
 * @param storagePath - The full path to the file in the bucket (e.g., 'profile_pictures/user_id/image.jpg').
 */
export async function deleteFileByPath(storage: Storage, storagePath: string) {
    const fileRef = ref(storage, storagePath);
    try {
        await deleteObject(fileRef);
    } catch (error: any) {
        if (error.code === 'storage/unauthorized') {
            const permissionError = new StoragePermissionError({
                path: storagePath,
                operation: 'deleteObject'
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        console.error(`Failed to delete file at ${storagePath}:`, error);
        throw error; // Re-throw to allow UI to handle it.
    }
}
