import { useQuery } from "@tanstack/react-query";
import { type Image } from "@shared/schema";
import { Card } from "@/components/ui/card";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export default function ImageGallery() {
  const { data: response, isLoading } = useQuery<ApiResponse<Image[]>>({
    queryKey: ["/api/images"],
    // Disable caching to always fetch fresh data
    staleTime: 0,
    cacheTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  if (isLoading) {
    return (
      <div className="text-center text-muted-foreground">
        Loading images...
      </div>
    );
  }

  if (!response?.success || !response.data?.length) {
    return (
      <div className="text-center text-muted-foreground">
        No images uploaded yet
      </div>
    );
  }

  // Sort images by extracting timestamp from filename and sorting in descending order
  const images = [...response.data].sort((a, b) => {
    const timestampA = parseInt(a.filename.split('/')[1].split('-')[0]);
    const timestampB = parseInt(b.filename.split('/')[1].split('-')[0]);
    return timestampB - timestampA;
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {images.map((image) => (
        <Card key={image.id} className="overflow-hidden">
          <img
            src={image.url}
            alt={image.filename}
            className="w-full h-48 object-cover"
          />
          <div className="p-4">
            <p className="text-sm text-muted-foreground truncate">
              {image.filename}
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}