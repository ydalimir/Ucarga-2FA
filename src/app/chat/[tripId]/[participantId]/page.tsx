
'use client';

import { useEffect, useState, useRef, Suspense, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useTrips } from '@/context/trips-context';
import { auth, db } from '@/lib/firebase';
import type { ChatMessage, Trip } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Loader2, Send, Archive, Paperclip, X, FileText, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { doc, getDoc } from 'firebase/firestore';
import { uploadFileToServer } from '@/lib/server-actions';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};


async function getParticipantInfo(userId: string): Promise<{name: string, image?: string}> {
    if (!userId) return { name: "Usuario" };
    
    const userDocRef = doc(db, 'users', userId);
    try {
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            const userData = userDoc.data();
            // Return companyName for 'empresa' or fullName for 'transportista'
            const name = userData.role === 'empresa' ? userData.companyName : userData.fullName;
            return {
                name: name || "Usuario",
                image: userData.photoURL
            };
        }
    } catch (error) {
        console.error("Error fetching participant name:", error);
    }
    return { name: "Usuario" };
}

function ChatPageContent() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [user, userLoading] = useAuthState(auth);
  const { getChatMessages, sendChatMessage, getTripById, markMessagesAsRead } = useTrips();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [partnerInfo, setPartnerInfo] = useState<{name: string, image?: string}>({name: 'Usuario'});
  
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const tripId = params.tripId as string;
  const participantId = params.participantId as string;

  const fetchChatData = useCallback(async () => {
    if (!tripId || !user || !participantId) {
        if (!userLoading) setLoading(false);
        return;
    }
    setLoading(true);

    const [tripData, info] = await Promise.all([
        getTripById(tripId),
        getParticipantInfo(participantId)
    ]);
    
    setTrip(tripData || null);
    setPartnerInfo(info);
    
    if (tripData) {
        const unsubscribe = getChatMessages(tripId, participantId, (newMessages) => {
            setMessages(newMessages);
            if (user?.uid) {
               markMessagesAsRead(tripId, participantId, user.uid);
            }
        });
        
        setLoading(false);
        return unsubscribe;
    } else {
        setLoading(false);
    }
  }, [tripId, participantId, user, userLoading, getTripById, getChatMessages, markMessagesAsRead]);


  useEffect(() => {
    const unsubscribePromise = fetchChatData();
    return () => {
        unsubscribePromise.then(unsubscribe => {
            if (unsubscribe) unsubscribe();
        });
    }
  }, [fetchChatData]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
        if (selectedFile.size > 5 * 1024 * 1024) { // 5MB limit
            toast({ title: "Archivo muy grande", description: "El archivo no debe exceder los 5MB.", variant: "destructive" });
            return;
        }
        setFile(selectedFile);
        if (selectedFile.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => setFilePreview(reader.result as string);
            reader.readAsDataURL(selectedFile);
        } else {
            setFilePreview(null);
        }
    }
  };
  
  const removeFile = () => {
      setFile(null);
      setFilePreview(null);
      if (fileInputRef.current) {
          fileInputRef.current.value = '';
      }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !trip) return;
    if (!newMessage.trim() && !file) return;
    
    setIsSubmitting(true);

    try {
        let filePayload: Partial<ChatMessage> = {};

        if (file) {
            const dataUrl = await fileToDataUrl(file);
            const path = `chat_files/${trip.id}/${user.uid}/${Date.now()}-${file.name}`;
            const uploadedUrl = await uploadFileToServer(path, dataUrl);
            
            filePayload = {
                fileUrl: uploadedUrl,
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size
            };
        }

        const messageData: Partial<ChatMessage> = {
            senderId: user.uid,
            text: newMessage.trim(),
            read: false,
            ...filePayload,
        };

        setNewMessage('');
        removeFile();
        await sendChatMessage(tripId, participantId, messageData);
        
    } catch (error) {
      console.error("Error sending message:", error);
      toast({ title: 'Error', description: 'No se pudo enviar el mensaje.', variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  };

  if (userLoading || loading) {
      return <div className="flex h-dvh items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  if (!user) {
    return (
        <div className="flex h-dvh items-center justify-center flex-col gap-4">
            <p>Debes iniciar sesión para acceder al chat.</p>
            <Button onClick={() => router.push('/auth')}>Iniciar Sesión</Button>
        </div>
    )
  }

  if (!trip) {
    return (
        <div className="flex h-dvh items-center justify-center flex-col gap-4">
            <p>No se pudo cargar la información del viaje.</p>
            <Button onClick={() => router.back()}>Volver</Button>
        </div>
    )
  }
  
  const isCompleted = trip.status === 'Completado';

  return (
    <div className="flex h-dvh flex-col bg-background">
      <header className="flex items-center gap-4 border-b bg-card p-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <Avatar>
            <AvatarImage src={partnerInfo.image} />
          <AvatarFallback>{partnerInfo.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="font-semibold">{partnerInfo.name}</h1>
          <p className="text-xs text-muted-foreground">{trip?.shipmentId}</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <div
            key={msg.id || index}
            className={cn(
              "flex items-end gap-2",
              msg.senderId === user?.uid ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-xs rounded-lg p-3 text-sm md:max-w-md",
                msg.senderId === user?.uid
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              )}
            >
              {msg.fileUrl && (
                  <div className="mb-2">
                      {msg.fileType?.startsWith('image/') ? (
                           <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">
                             <Image src={msg.fileUrl} alt={msg.fileName || 'Imagen adjunta'} width={250} height={250} className="rounded-md object-cover max-w-full" />
                           </a>
                      ) : (
                          <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className={cn("flex items-center gap-3 p-2 rounded-md", msg.senderId === user?.uid ? 'bg-primary-foreground/10 hover:bg-primary-foreground/20' : 'bg-background/50 hover:bg-background')}>
                              <FileText className="h-8 w-8 flex-shrink-0" />
                              <div className="flex-1">
                                  <p className="font-semibold break-all">{msg.fileName || 'Archivo adjunto'}</p>
                                  {msg.fileSize && <p className="text-xs opacity-80">{(msg.fileSize / 1024).toFixed(2)} KB</p>}
                              </div>
                          </a>
                      )}
                  </div>
              )}
              {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
              <p className={cn(
                  "text-xs mt-1 text-right",
                   msg.senderId === user?.uid ? "text-primary-foreground/70" : "text-muted-foreground"
                )}>
                  {msg.timestamp ? format(msg.timestamp.toDate(), 'p', { locale: es }) : ''}
              </p>
            </div>
          </div>
        ))}
         <div ref={messagesEndRef} />
      </main>

      <footer className="border-t bg-card p-4">
        {isCompleted ? (
            <div className="text-center text-muted-foreground p-3 bg-muted rounded-md text-sm flex items-center justify-center gap-2">
                <Archive className="h-4 w-4" />
                El chat ha sido archivado porque el viaje ha finalizado.
            </div>
        ) : (
             <form onSubmit={handleSendMessage} className="space-y-3">
                {file && (
                    <div className="relative p-2 border rounded-md max-w-xs">
                         {filePreview ? (
                            <Image src={filePreview} alt="Vista previa" width={80} height={80} className="rounded-md object-cover"/>
                        ) : (
                             <div className="flex items-center gap-2">
                                <FileText className="h-8 w-8 text-muted-foreground"/>
                                <p className="text-sm text-muted-foreground truncate">{file.name}</p>
                             </div>
                        )}
                        <Button variant="ghost" size="icon" className="absolute -top-3 -right-3 h-7 w-7 bg-muted rounded-full" onClick={removeFile}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                )}
                <div className="flex items-center gap-2">
                    <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Escribe un mensaje..."
                        autoComplete="off"
                        disabled={isSubmitting}
                    />
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,application/pdf" className="hidden"/>
                    <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isSubmitting}>
                      <Paperclip className="h-5 w-5" />
                    </Button>
                    <Button type="submit" size="icon" disabled={(!newMessage.trim() && !file) || isSubmitting}>
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                </div>
                 {isSubmitting && <Progress value={undefined} className="h-1" />}
            </form>
        )}
      </footer>
    </div>
  );
}

export default function ChatPage(){
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <ChatPageContent />
        </Suspense>
    )
}
