import { useQuery } from "@tanstack/react-query";
import { type Image } from "@shared/schema";
import { Card } from "@/components/ui/card";

export default function ImageGallery() {
  const { data: images, isLoading } = useQuery<Image[]>({
    queryKey: ["/api/images"],
  });

  if (isLoading) {
    return (
      <div className="text-center text-muted-foreground">
        Loading images...
      </div>
    );
  }

  if (!images?.length) {
    return (
      <div className="text-center text-muted-foreground">
        No images uploaded yet
      </div>
    );
  }

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
