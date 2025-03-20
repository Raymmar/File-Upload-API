import ImageUploader from "@/components/ImageUploader";
import ImageGallery from "@/components/ImageGallery";
import ApiKeyInput from "@/components/ApiKeyInput";

export default function Home() {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight">Image Upload</h1>
          <p className="text-muted-foreground mt-2">
            Drag and drop or click to upload your images
          </p>
        </div>

        <div className="grid gap-8">
          <div className="max-w-xl mx-auto w-full">
            <ApiKeyInput />
            <ImageUploader />
          </div>

          <div className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">Uploaded Images</h2>
            <ImageGallery />
          </div>
        </div>
      </div>
    </div>
  );
}