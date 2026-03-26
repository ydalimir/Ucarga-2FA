
'use client';

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useTrips } from "@/context/trips-context";
import { TripCard } from "@/components/trips/trip-card";
import type { Trip } from "@/lib/types";
import { useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

export default function SearchPage() {
  const { trips, loading } = useTrips();
  const searchParams = useSearchParams();
  const role = searchParams.get('role');

  const [query, setQuery] = useState('');
  const [result, setResult] = useState<Trip | null | 'not-found' | 'idle'>('idle');
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleSearch = (searchQuery: string) => {
    if (!searchQuery) return;
    
    setShowSuggestions(false);
    setIsSearching(true);
    // Simulate a short delay for better UX
    setTimeout(() => {
        const foundTrip = trips.find(trip => trip.shipmentId.toLowerCase() === searchQuery.toLowerCase());
        setResult(foundTrip || 'not-found');
        setIsSearching(false);
    }, 500);
  };
  
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    setResult('idle');
    if (newQuery) {
        setShowSuggestions(true);
    } else {
        setShowSuggestions(false);
    }
  }

  const handleSuggestionClick = (suggestion: Trip) => {
      setQuery(suggestion.shipmentId);
      handleSearch(suggestion.shipmentId);
  }
  
  const suggestions = useMemo(() => {
    if (!query) return [];
    return trips.filter(trip => 
        trip.shipmentId.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5); // Limit suggestions
  }, [query, trips]);


  const renderContent = () => {
    if (isSearching) {
        return (
            <Card className="mt-6">
                <CardContent className="p-6 text-center text-muted-foreground flex items-center justify-center">
                   <Loader2 className="h-6 w-6 animate-spin mr-2" />
                   Buscando...
                </CardContent>
            </Card>
        );
    }

    switch(result) {
        case 'idle':
            return (
                <Card className="mt-6">
                    <CardContent className="p-6 text-center text-muted-foreground">
                    <p>Introduce un ID de embarque para ver los resultados.</p>
                    </CardContent>
                </Card>
            );
        case 'not-found':
            return (
                <Card className="mt-6">
                    <CardContent className="p-6 text-center text-destructive-foreground bg-destructive/80">
                    <p>No se encontró ningún embarque con el ID "{query}".</p>
                    </CardContent>
                </Card>
            );
        default:
            return (
                <div className="mt-6">
                    <h2 className="text-xl font-semibold mb-4">Resultado de la Búsqueda</h2>
                    <TripCard trip={result} role={role} />
                </div>
            );
    }
  }


  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="mb-6 text-3xl font-bold text-primary">Buscar Embarque</h1>
      <form onSubmit={handleFormSubmit}>
        <div className="relative">
            <div className="flex w-full items-center space-x-2">
                <Input 
                    type="text" 
                    placeholder="ID del embarque, ej: #845-GDL-MTY" 
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 100)} // Delay to allow click
                    disabled={loading}
                    autoComplete="off"
                />
                <Button type="submit" disabled={loading || isSearching}>
                <SearchIcon className="mr-2 h-4 w-4" /> Buscar
                </Button>
            </div>
            {showSuggestions && suggestions.length > 0 && (
                <Card className="absolute z-10 w-full mt-2 shadow-lg">
                    <CardContent className="p-2">
                        <ul>
                            {suggestions.map(trip => (
                                <li 
                                    key={trip.id} 
                                    className="p-2 hover:bg-muted rounded-md cursor-pointer text-sm"
                                    onClick={() => handleSuggestionClick(trip)}
                                >
                                    <span className="font-bold">{trip.shipmentId}</span> - {trip.origin} a {trip.destination}
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}
        </div>
      </form>
      
      {loading ? <Skeleton className="h-28 w-full mt-6" /> : renderContent()}
      
    </div>
  );
}
