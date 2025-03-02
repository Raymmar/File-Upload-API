import ImageUploader from "@/components/ImageUploader";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight">Image Upload</h1>
          <p className="text-muted-foreground mt-2">
            Drag and drop or click to upload your images
          </p>
        </div>
        <ImageUploader />
      </div>
    </div>
  );
}
