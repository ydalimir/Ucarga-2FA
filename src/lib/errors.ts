'use client';

// A union type for all possible permission errors
// This will allow us to handle different permission errors in a type-safe way
// and ensure we have the correct context for each type of error.
export type PermissionError = FirestorePermissionError | StoragePermissionError;


// Firestore-specific permission error
// ==================================
export type FirestoreSecurityRuleContext = {
    path: string;
    operation: 'get' | 'list' | 'create' | 'update' | 'delete';
    requestResourceData?: any;
};

export class FirestorePermissionError extends Error {
    context: FirestoreSecurityRuleContext;

    constructor(context: FirestoreSecurityRuleContext) {
        const message = `FirestoreError: Missing or insufficient permissions: The following request was denied by Firestore Security Rules:\n${JSON.stringify({
            operation: context.operation,
            path: context.path,
            request: {
                resource: {
                    data: context.requestResourceData,
                }
            }
        }, null, 2)}`;
        super(message);
        this.name = 'FirestorePermissionError';
        this.context = context;
    }
}

// Storage-specific permission error
// ==================================
export type StorageSecurityRuleContext = {
    path: string;
    operation: 'uploadBytes' | 'deleteObject' | 'getDownloadURL';
};

export class StoragePermissionError extends Error {
    context: StorageSecurityRuleContext;

    constructor(context: StorageSecurityRuleContext) {
        const message = `Firebase Storage Permission Error: User does not have permission to access '${context.path}'. Operation: '${context.operation}'.`;
        super(message);
        this.name = 'StoragePermissionError';
        this.context = context;
    }
}
