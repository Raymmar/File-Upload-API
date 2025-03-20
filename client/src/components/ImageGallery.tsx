import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Image } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Trash2 } from "lucide-react";
import { useApiKey } from "./ApiKeyInput";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export default function ImageGallery() {
  const { apiKey } = useApiKey();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [imageToDelete, setImageToDelete] = useState<Image | null>(null);
  
  const deleteMutation = useMutation({
    mutationFn: async (imageId: number) => {
      const headers: Record<string, string> = {};
      if (apiKey) {
        headers["x-api-key"] = apiKey;
      }
      return apiRequest<ApiResponse<{ success: boolean }>>(`/api/images/${imageId}`, {
        method: "DELETE",
        headers
      });
    },
    onSuccess: () => {
      toast({
        title: "Image deleted",
        description: "Image was successfully deleted",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/images"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete image",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setImageToDelete(null);
    }
  });
  
  const { 
    data: response, 
    isLoading, 
    error, 
    isError 
  } = useQuery({
    queryKey: ["/api/images", apiKey], // Include apiKey in queryKey to refetch when it changes
    // Set cache options
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 5, // 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      try {
        const headers: Record<string, string> = {};
        if (apiKey) {
          headers["x-api-key"] = apiKey;
        }
        return apiRequest<ApiResponse<Image[]>>("/api/images", { headers });
      } catch (err) {
        throw err;
      }
    }
  });

  if (isLoading) {
    return (
      <div className="text-center text-muted-foreground py-4">
        Loading images...
      </div>
    );
  }
  
  // Show error state
  if (isError) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error loading images</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : "An unknown error occurred while loading images"}
        </AlertDescription>
      </Alert>
    );
  }

  // Show API error state if response exists but has error
  if (response && !response.success) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {response.error || "Failed to fetch images"}
          {response.code && <span className="block text-xs mt-1">Error code: {response.code}</span>}
        </AlertDescription>
      </Alert>
    );
  }

  // Show empty state
  if (!response?.data?.length) {
    return (
      <div className="text-center text-muted-foreground py-8 border border-dashed rounded-lg">
        <p>No images uploaded yet</p>
        <p className="text-sm mt-2">Upload an image to get started</p>
      </div>
    );
  }

  // Sort images by extracting timestamp from filename and sorting in descending order
  const images = [...response.data].sort((a, b) => {
    try {
      const timestampA = parseInt(a.filename.split('/')[1].split('-')[0]);
      const timestampB = parseInt(b.filename.split('/')[1].split('-')[0]);
      return timestampB - timestampA;
    } catch (err) {
      // Fallback sort if filename format is unexpected
      return 0;
    }
  });

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {images.map((image) => (
          <Card key={image.id} className="overflow-hidden">
            <div className="relative h-48">
              <img
                src={image.url}
                alt={image.filename.split('/').pop() || 'Image'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Replace failed images with a placeholder
                  e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='18' height='18' x='3' y='3' rx='2' ry='2'/%3E%3Ccircle cx='9' cy='9' r='2'/%3E%3Cpath d='m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21'/%3E%3C/svg%3E";
                  e.currentTarget.style.padding = "40px";
                  e.currentTarget.style.background = "#f5f5f5";
                }}
              />
              <Button 
                variant="destructive" 
                size="icon" 
                className="absolute top-2 right-2 rounded-full w-8 h-8 opacity-90"
                onClick={() => setImageToDelete(image)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4">
              <p className="text-sm text-muted-foreground truncate">
                {image.filename.split('/').pop() || 'Image'} 
              </p>
              <p className="text-xs text-muted-foreground">
                {Math.round(image.size / 1024)} KB
              </p>
            </div>
          </Card>
        ))}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!imageToDelete} onOpenChange={(open) => !open && setImageToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete image</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this image? This action cannot be undone.
              {!apiKey && (
                <p className="text-destructive mt-2">
                  You need to provide an API key to delete images.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => imageToDelete && deleteMutation.mutate(imageToDelete.id)}
              disabled={deleteMutation.isPending || !apiKey}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}