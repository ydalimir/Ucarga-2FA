
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, doc, Timestamp, query, orderBy, deleteDoc, where, getDoc, Unsubscribe, collectionGroup, getDocs, limit, writeBatch, runTransaction } from 'firebase/firestore';
import type { Trip, Bid, ChatMessage, CarrierProfileData, Rating } from '@/lib/types';
import { onAuthStateChanged, User } from 'firebase/auth';
import { errorEmitter } from '@/lib/error-emitter';
import { StoragePermissionError, FirestorePermissionError, type FirestoreSecurityRuleContext } from '@/lib/errors';
import { useToast } from '@/hooks/use-toast';


interface TripsContextType {
  trips: Trip[];
  loading: boolean;
  addTrip: (trip: Omit<Trip, 'id' | 'createdAt'>) => Promise<string>;
  updateTrip: (updatedTrip: Partial<Trip> & { id: string }) => Promise<void>;
  deleteTrip: (tripId: string) => Promise<void>;
  getTripById: (tripId: string) => Promise<Trip | undefined>;
  updateUserProfile: (userId: string, data: Partial<CarrierProfileData>) => Promise<void>;
  getUserProfile: (userId: string) => Promise<CarrierProfileData | null>;
  addBid: (tripId: string, carrierId: string, carrierName: string, carrierPhotoUrl: string | undefined, bidData: Partial<Bid>) => Promise<string>;
  updateBid: (tripId: string, bidId: string, bidData: Partial<Bid>) => Promise<void>;
  deleteBid: (tripId: string, bidId: string) => Promise<void>;
  getCarrierBidForTrip: (tripId: string, carrierId: string) => Promise<Bid | null>;
  getBidsForTrip: (tripId: string, callback: (bids: Bid[]) => void) => Unsubscribe;
  getBidsForCarrier: (carrierId: string, callback: (bids: Bid[]) => void) => Unsubscribe;
  getBidsForCompany: (companyId: string, callback: (bids: Bid[]) => void) => Unsubscribe;
  getAssignedTripsForCarrier: (carrierId: string, callback: (trips: Trip[]) => void) => Unsubscribe;
  acceptBid: (tripId: string, bid: Bid) => Promise<void>;
  getChatMessages: (tripId: string, participantId: string, callback: (messages: ChatMessage[]) => void) => Unsubscribe;
  sendChatMessage: (tripId: string, participantId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => Promise<void>;
  markMessagesAsRead: (tripId: string, participantId: string, currentUserId: string) => Promise<void>;
  getUnreadMessagesCountForCompany: (tripId: string, participantId: string, callback: (count: number) => void) => Unsubscribe;
  getUnreadMessagesCountForCarrier: (tripId: string, participantId: string, callback: (count: number) => void) => Unsubscribe;
  startTrip: (tripId: string) => Promise<void>;
  finishTrip: (tripId: string) => Promise<void>;
  markTripAsPaid: (tripId: string) => Promise<void>;
  confirmPaymentAndCompleteTrip: (tripId: string) => Promise<void>;
  submitRating: (ratingData: Omit<Rating, 'id' | 'createdAt'>) => Promise<void>;
  getRatingsForCarrier: (carrierId: string, callback: (ratings: Rating[]) => void) => Unsubscribe;
  toggleTripStatus: (tripId: string, currentStatus: Trip['status']) => Promise<void>;
}

const TripsContext = createContext<TripsContextType | undefined>(undefined);

// Helper function to remove undefined values from an object
const removeUndefined = (obj: any) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    Object.keys(obj).forEach(key => {
        if (obj[key] === undefined) {
            delete obj[key];
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            removeUndefined(obj[key]);
        }
    });
    return obj;
}

// Helper function to generate a consistent chat ID for two participants
const getChatId = (userId1: string, userId2: string): string => {
    return [userId1, userId2].sort().join('_');
};

export function TripsProvider({ children }: { children: ReactNode }) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribeAuth();
  }, []);

  const pauseOldTrips = (tripsToUpdate: Trip[]) => {
    const now = new Date();
    const batch = writeBatch(db);
    let updatesMade = false;

    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

    tripsToUpdate.forEach(trip => {
      // LÓGICA DE PAUSA AUTOMÁTICA: 
      // 1. Si la fecha de carga (pickupDate) ya pasó.
      // 2. Si han pasado más de 3 días desde su creación y sigue Pendiente.
      
      let shouldPause = false;

      // Check pickup date
      if (trip.status === 'Pendiente' && trip.pickupDate) {
        try {
          const pickupDate = new Date(trip.pickupDate);
          if (!isNaN(pickupDate.getTime()) && now.getTime() > pickupDate.getTime()) {
            shouldPause = true;
          }
        } catch (e) {
          console.error("Error parsing pickupDate for auto-pause:", e);
        }
      }

      // Check 3-day inactivity (from createdAt)
      if (!shouldPause && trip.status === 'Pendiente' && trip.createdAt) {
        try {
          const createdAtDate = trip.createdAt.toDate();
          if (now.getTime() - createdAtDate.getTime() > THREE_DAYS_MS) {
            shouldPause = true;
          }
        } catch (e) {
          console.error("Error parsing createdAt for auto-pause:", e);
        }
      }

      if (shouldPause) {
        const tripRef = doc(db, 'trips', trip.id);
        batch.update(tripRef, { status: 'Pausado' });
        updatesMade = true;
      }
    });

    if (updatesMade) {
      batch.commit().catch(error => console.error("Error auto-pausing expired trips:", error));
    }
  };


  useEffect(() => {
    if (!user) {
      setTrips([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const tripsCollection = collection(db, 'trips');
    
    const q = query(tripsCollection, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const tripsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Trip)).filter(trip => {
            // Rule 1: Always show completed or paused trips to their creator
            if ((trip.status === 'Completado' || trip.status === 'Pausado') && trip.creatorId === user.uid) return true;
            // Rule 2: Show a user trips they created (if not completed/paused, already covered)
            if (trip.creatorId === user.uid) return true;
            // Rule 3: Show a user trips assigned to them
            if (trip.assignedCarrierId === user.uid) return true;
            // Rule 4: If none of the above, only show if it's still pending (available to bid on)
            if (trip.status === 'Pendiente') return true;
            
            return false;
        });

        // Check for expired pickup dates
        if (user) {
            pauseOldTrips(tripsData.filter(t => t.creatorId === user.uid));
        }

        setTrips(tripsData);
        setLoading(false);
    }, (error) => {
        const permissionError = new FirestorePermissionError({
            path: 'trips',
            operation: 'list',
        } satisfies FirestoreSecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const addTrip = async (trip: Omit<Trip, 'id' | 'createdAt'>): Promise<string> => {
    if (!user) throw new Error("User not authenticated");
    
    const newTripData = {
        ...trip,
        creatorId: user.uid,
        createdAt: Timestamp.now()
    };
    
    const tripsCollection = collection(db, 'trips');

    // Return the promise chain
    return addDoc(tripsCollection, removeUndefined(newTripData)).then(docRef => docRef.id).catch(error => {
       if (error.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: tripsCollection.path,
                operation: 'create',
                requestResourceData: newTripData
            } satisfies FirestoreSecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
       }
       console.error("Error creating trip document:", error);
       throw error;
    });
  };

  const updateTrip = async (updatedTrip: Partial<Trip> & { id: string }) => {
    const { id, ...dataToUpdate } = updatedTrip;
    const tripDocRef = doc(db, 'trips', id);
    updateDoc(tripDocRef, removeUndefined(dataToUpdate)).catch((error) => {
        if (error.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: tripDocRef.path,
                operation: 'update',
                requestResourceData: dataToUpdate
            } satisfies FirestoreSecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        }
    });
  };
  
  const toggleTripStatus = async (tripId: string, currentStatus: Trip['status']) => {
      const newStatus = currentStatus === 'Pausado' ? 'Pendiente' : 'Pausado';
      const updateData: { status: Trip['status'], createdAt?: Timestamp } = { status: newStatus };
      
      if (newStatus === 'Pendiente') {
        // Refresh the createdAt timestamp to keep it relevant in lists
        updateData.createdAt = Timestamp.now();
      }

      await updateTrip({ id: tripId, ...updateData });

      toast({
        title: `Viaje ${newStatus === 'Pausado' ? 'Pausado' : 'Reanudado'}`,
        description: `La publicación del viaje ha sido ${newStatus === 'Pausado' ? 'pausada' : 'reactivada'}.`,
      });
  };

  const updateUserProfile = async (userId: string, data: Partial<CarrierProfileData>) => {
    const userDocRef = doc(db, 'users', userId);
    const dataToUpdate = { ...data, updatedAt: Timestamp.now() };
    updateDoc(userDocRef, removeUndefined(dataToUpdate)).catch((error) => {
        if (error.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: userDocRef.path,
                operation: 'update',
                requestResourceData: dataToUpdate
            } satisfies FirestoreSecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        } else {
            console.error("Error updating user profile:", error);
        }
        throw error; // Re-throw to be caught by the UI if needed
    });
  }

  const getUserProfile = async (userId: string): Promise<CarrierProfileData | null> => {
    const userDocRef = doc(db, 'users', userId);
    try {
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
            return { uid: docSnap.id, ...docSnap.data() } as CarrierProfileData;
        }
        return null;
    } catch (error: any) {
        if (error.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({ path: userDocRef.path, operation: 'get' } satisfies FirestoreSecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        }
        console.error("Error fetching user profile:", error);
        return null;
    }
};

  const deleteTrip = async (tripId: string) => {
    const tripDocRef = doc(db, 'trips', tripId);
    
    deleteDoc(tripDocRef).catch((error) => {
      if (error.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
            path: tripDocRef.path,
            operation: 'delete'
        } satisfies FirestoreSecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      }
    });
  };
  
  const getTripById = useCallback(async (tripId: string): Promise<Trip | undefined> => {
      // First, try to find the trip in the local state
      const localTrip = trips.find(t => t.id === tripId);
      if (localTrip) {
          return localTrip;
      }
      // If not found, fetch from Firestore
      const tripDocRef = doc(db, 'trips', tripId);
      try {
        const docSnap = await getDoc(tripDocRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as Trip;
        }
      } catch (error: any) {
        if (error.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: tripDocRef.path,
                operation: 'get',
            } satisfies FirestoreSecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        }
      }
      return undefined;
  }, [trips]);

    const addBid = async (tripId: string, carrierId: string, carrierName: string, carrierPhotoUrl: string | undefined, bidData: Partial<Bid>): Promise<string> => {
        if (!user) throw new Error("User not authenticated for adding bid");

        const trip = await getTripById(tripId);
        if (!trip) {
            throw new Error("Trip not found");
        }
        
        const bidsCollection = collection(db, 'trips', tripId, 'bids');
        const newBidData = {
            ...bidData,
            tripId,
            carrierId,
            carrierName,
            carrierPhotoUrl,
            status: 'pending' as const,
            createdAt: Timestamp.now(),
            creatorId: trip.creatorId,
        };

        return addDoc(bidsCollection, removeUndefined(newBidData)).then(docRef => docRef.id).catch(error => {
            if (error.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({
                    path: bidsCollection.path,
                    operation: 'create',
                    requestResourceData: newBidData
                } satisfies FirestoreSecurityRuleContext);
                errorEmitter.emit('permission-error', permissionError);
            }
            throw error; // Re-throw
        });
    };

    const updateBid = async (tripId: string, bidId: string, bidData: Partial<Bid>) => {
        const bidDocRef = doc(db, 'trips', tripId, 'bids', bidId);
        updateDoc(bidDocRef, removeUndefined(bidData)).catch((error) => {
            if (error.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({
                    path: bidDocRef.path,
                    operation: 'update',
                    requestResourceData: bidData,
                } satisfies FirestoreSecurityRuleContext);
                errorEmitter.emit('permission-error', permissionError);
            }
        });
    };

  
  const deleteBid = async (tripId: string, bidId: string) => {
    const bidDocRef = doc(db, 'trips', tripId, 'bids', bidId);
    
    deleteDoc(bidDocRef).catch((error) => {
      if ((error as any).code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
          path: bidDocRef.path,
          operation: 'delete',
        } satisfies FirestoreSecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      } else {
        console.error("Error deleting bid:", error);
        throw error;
      }
    });
  };
  
  const getCarrierBidForTrip = useCallback(async (tripId: string, carrierId: string): Promise<Bid | null> => {
    const bidsCollection = collection(db, 'trips', tripId, 'bids');
    const q = query(bidsCollection, where('carrierId', '==', carrierId), limit(1));
    try {
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            return { id: doc.id, ...doc.data() } as Bid;
        }
    } catch(error: any) {
        if (error.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: `trips/${tripId}/bids`,
                operation: 'list',
            } satisfies FirestoreSecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        }
    }
    return null;
  }, []);


  const getBidsForTrip = (tripId: string, callback: (bids: Bid[]) => void): Unsubscribe => {
    const bidsCollection = collection(db, 'trips', tripId, 'bids');
    const q = query(bidsCollection, orderBy('amount', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const bidsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Bid));
        callback(bidsData);
    }, (error) => {
        const permissionError = new FirestorePermissionError({
            path: `trips/${tripId}/bids`,
            operation: 'list',
        } satisfies FirestoreSecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
    });

    return unsubscribe;
  }
  
  const getBidsForCarrier = (carrierId: string, callback: (bids: Bid[]) => void): Unsubscribe => {
    const bidsQuery = query(collectionGroup(db, 'bids'), where('carrierId', '==', carrierId), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(bidsQuery, (snapshot) => {
      const bidsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Bid));
      callback(bidsData);
    }, (error) => {
        if ((error as any).code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: 'bids',
                operation: 'list',
            } satisfies FirestoreSecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        } else {
            console.error("Error fetching carrier bids:", error);
        }
    });

    return unsubscribe;
  };

  const getBidsForCompany = (companyId: string, callback: (bids: Bid[]) => void): Unsubscribe => {
    const bidsQuery = query(
      collectionGroup(db, 'bids'),
      where('creatorId', '==', companyId),
      orderBy('createdAt', 'desc')
    );
  
    const unsubscribe = onSnapshot(bidsQuery, (snapshot) => {
      const bidsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Bid));
      callback(bidsData);
    }, (error) => {
      if ((error as any).code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
              path: `bids`,
              operation: 'list'
          } satisfies FirestoreSecurityRuleContext);
          errorEmitter.emit('permission-error', permissionError);
      } else {
          console.error("Error fetching bids for company:", error);
      }
    });
  
    return unsubscribe;
  };

    const getAssignedTripsForCarrier = (carrierId: string, callback: (trips: Trip[]) => void): Unsubscribe => {
        const tripsQuery = query(
            collection(db, 'trips'),
            where('assignedCarrierId', '==', carrierId),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(tripsQuery, (snapshot) => {
            const tripsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Trip));
            callback(tripsData);
        }, (error) => {
            console.error("Error fetching assigned trips:", error);
            // Optional: You could emit a permission error here too if needed
        });

        return unsubscribe;
    };
  
 const acceptBid = async (tripId: string, bid: Bid) => {
    const tripRef = doc(db, 'trips', tripId);
    const carrierRef = doc(db, 'users', bid.carrierId);
    const acceptedBidRef = doc(db, 'trips', tripId, 'bids', bid.id);
    const otherBidsQuery = query(collection(db, 'trips', tripId, 'bids'), where('status', '==', 'pending'));

    try {
        await runTransaction(db, async (transaction) => {
            const [carrierDoc, tripDoc] = await Promise.all([
              transaction.get(carrierRef),
              transaction.get(tripRef)
            ]);

            if (!carrierDoc.exists()) throw new Error("Carrier profile not found.");
            if (!tripDoc.exists()) throw new Error("Trip not found.");

            
            const currentTokenBalance = carrierDoc.data().tokenBalance || 0;
            if (currentTokenBalance < 1) {
                toast({
                    title: "El transportista no tiene suficientes tokens",
                    description: "No se puede asignar el viaje porque el transportista no tiene tokens.",
                    variant: "destructive",
                    duration: 7000
                });
                throw new Error("Insufficient tokens.");
            }
            
            transaction.update(carrierRef, { tokenBalance: currentTokenBalance - 1 });

            const tripUpdateData: Partial<Trip> = {
                status: 'Asignado',
                assignedCarrierId: bid.carrierId,
                assignedCarrierName: bid.carrierName,
                finalPrice: bid.amount,
                assignedDriverName: bid.selectedDriverName,
                assignedDriverPhotoUrl: bid.selectedDriverPhotoUrl,
                assignedVehicleInfo: bid.selectedVehicleInfo,
                assignedTrailerInfo: bid.selectedTrailerInfo,
            };
            transaction.update(tripRef, removeUndefined(tripUpdateData));
            
            transaction.update(acceptedBidRef, { status: 'accepted' });

            const otherBidsSnapshot = await getDocs(otherBidsQuery);
            otherBidsSnapshot.forEach((bidDoc) => {
                if (bidDoc.id !== bid.id) {
                    transaction.update(bidDoc.ref, { status: 'rejected' });
                }
            });
        });
    } catch (error: any) {
        if (error.code === 'permission-denied') {
             const permissionError = new FirestorePermissionError({
                path: tripRef.path,
                operation: 'update',
                requestResourceData: { tripId, acceptedBidId: bid.id, message: "Batch write to accept bid failed" },
            } satisfies FirestoreSecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        } else if (error.message !== "Insufficient tokens.") {
             console.error("Accept bid transaction failed:", error);
             throw error;
        }
    }
};

  const getChatMessages = (tripId: string, participantId: string, callback: (messages: ChatMessage[]) => void) => {
    if (!user) return () => {};

    const chatId = getChatId(user.uid, participantId);
    const chatCollectionPath = `trips/${tripId}/chats/${chatId}/messages`;
    const messagesRef = collection(db, chatCollectionPath);
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    return onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as ChatMessage));
        callback(messages);
    }, (error) => {
        if (error.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: chatCollectionPath,
                operation: 'list',
            } satisfies FirestoreSecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        }
    });
  };

  const sendChatMessage = async (tripId: string, participantId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    if (!user) throw new Error("Not authenticated");
    
    const chatId = getChatId(user.uid, participantId);
    const chatCollectionPath = `trips/${tripId}/chats/${chatId}/messages`;
    const messagesRef = collection(db, chatCollectionPath);

    const newMessage = {
        ...message,
        timestamp: Timestamp.now()
    };

    addDoc(messagesRef, newMessage).catch(error => {
        if (error.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: messagesRef.path,
                operation: 'create',
                requestResourceData: newMessage,
            } satisfies FirestoreSecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        }
    });
  };
  
  const markMessagesAsRead = async (tripId: string, participantId: string, currentUserId: string) => {
    if (!user) return;
    const chatId = getChatId(user.uid, participantId);
    const chatCollectionPath = `trips/${tripId}/chats/${chatId}/messages`;
    const messagesRef = collection(db, chatCollectionPath);
    const q = query(messagesRef, where('senderId', '!=', currentUserId), where('read', '==', false));
    
    try {
        const messagesSnapshot = await getDocs(q);
        if (messagesSnapshot.empty) return;

        const batch = writeBatch(db);
        messagesSnapshot.docs.forEach(doc => {
          batch.update(doc.ref, { read: true });
        });
        
        await batch.commit();
    } catch(error: any) {
        if (error.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: messagesRef.path,
                operation: 'update',
                requestResourceData: { read: true },
            } satisfies FirestoreSecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        }
    }
  };

  const getUnreadMessagesCount = (
    tripId: string,
    participantId: string,
    receiverId: string,
    callback: (count: number) => void
  ) => {
    const chatId = getChatId(receiverId, participantId);
    const chatCollectionPath = `trips/${tripId}/chats/${chatId}/messages`;
    const messagesRef = collection(db, chatCollectionPath);
    const q = query(messagesRef, where('senderId', '!=', receiverId), where('read', '==', false));

    return onSnapshot(q, (snapshot) => {
      callback(snapshot.size);
    }, (error) => {
      console.error("Error getting unread messages count:", error);
    });
  };

  const getUnreadMessagesCountForCompany = (
    tripId: string,
    participantId: string, // this is carrierId
    callback: (count: number) => void
  ) => {
    if (!user) return () => {};
    return getUnreadMessagesCount(tripId, participantId, user.uid, callback);
  };
  
  const getUnreadMessagesCountForCarrier = (
    tripId: string,
    participantId: string, // this is creatorId
    callback: (count: number) => void
  ) => {
     if (!user) return () => {};
    return getUnreadMessagesCount(tripId, participantId, user.uid, callback);
  };

  const startTrip = async (tripId: string) => {
    await updateTrip({ id: tripId, status: 'En Progreso' });
  };
  
  const finishTrip = async (tripId: string) => {
    await updateTrip({ id: tripId, status: 'En Espera de Pago' });
  };
  
  const markTripAsPaid = async (tripId: string) => {
    await updateTrip({ id: tripId, status: 'Pagado' });
  };
  
  const confirmPaymentAndCompleteTrip = async (tripId: string) => {
    await updateTrip({ id: tripId, status: 'Completado' });
  };

 const submitRating = async (ratingData: Omit<Rating, 'id' | 'createdAt'>) => {
    const carrierRef = doc(db, 'users', ratingData.carrierId);
    const tripRef = doc(db, 'trips', ratingData.tripId);
    const newRatingRef = doc(collection(db, 'ratings')); // Generates a new unique ID

    try {
        await runTransaction(db, async (transaction) => {
            const carrierDoc = await transaction.get(carrierRef);
            if (!carrierDoc.exists()) {
                throw new Error("Carrier document not found!");
            }
            
            const carrierData = carrierDoc.data();
            const oldRating = carrierData.rating || 0;
            const oldRatingCount = carrierData.ratingCount || 0;
            
            const newRatingCount = oldRatingCount + 1;
            const newTotalStars = (oldRating * oldRatingCount) + ratingData.stars;
            const newAverageRating = newTotalStars / newRatingCount;

            const carrierUpdate = {
                rating: newAverageRating,
                ratingCount: newRatingCount,
            };

            const newRatingDataWithTimestamp = {
                ...ratingData,
                createdAt: Timestamp.now(),
            };

            // Perform writes within the transaction
            transaction.set(newRatingRef, newRatingDataWithTimestamp);
            transaction.update(carrierRef, carrierUpdate);
            transaction.update(tripRef, { isRated: true });
        });
    } catch (error) {
        if (error instanceof Error && (error as any).code === 'permission-denied') {
             const permissionError = new FirestorePermissionError({
                path: carrierRef.path,
                operation: 'update',
                requestResourceData: { rating: '...', ratingCount: '...' }, // Placeholder data
            } satisfies FirestoreSecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        }
        console.error("Rating transaction failed: ", error);
        throw error;
    }
  };

  const getRatingsForCarrier = (carrierId: string, callback: (ratings: Rating[]) => void): Unsubscribe => {
    const ratingsQuery = query(collection(db, 'ratings'), where('carrierId', '==', carrierId), orderBy('createdAt', 'desc'), limit(10));
    
    const unsubscribe = onSnapshot(ratingsQuery, (snapshot) => {
        const ratingsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Rating));
        callback(ratingsData);
    }, (error) => {
        if ((error as any).code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: 'ratings',
                operation: 'list',
            } satisfies FirestoreSecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        } else {
            console.error("Error fetching ratings:", error);
        }
    });

    return unsubscribe;
  };


  return (
    <TripsContext.Provider value={{ 
        trips, loading, addTrip, updateTrip, deleteTrip, getTripById, updateUserProfile, getUserProfile, addBid, updateBid, deleteBid, 
        getCarrierBidForTrip, getBidsForTrip, getBidsForCarrier, getBidsForCompany, getAssignedTripsForCarrier, acceptBid, 
        getChatMessages, sendChatMessage, markMessagesAsRead, getUnreadMessagesCountForCompany, getUnreadMessagesCountForCarrier,
        startTrip, finishTrip, markTripAsPaid, confirmPaymentAndCompleteTrip, submitRating,
        getRatingsForCarrier, toggleTripStatus
    }}>
      {children}
    </TripsContext.Provider>
  );
}

export function useTrips() {
  const context = useContext(TripsContext);
  if (context === undefined) {
    throw new Error('useTrips must be used within a TripsProvider');
  }
  return context;
}
