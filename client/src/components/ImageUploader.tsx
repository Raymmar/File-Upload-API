import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { ACCEPTED_IMAGE_TYPES, MAX_FILE_SIZE, type Image } from "@shared/schema";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export default function ImageUploader() {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file: File): Promise<ApiResponse<Image>> => {
      const formData = new FormData();
      formData.append("file", file);

      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.onprogress = (event) => {
        const progress = (event.loaded / event.total) * 100;
        setUploadProgress(progress);
      };

      // Wrap XHR in a promise
      const response = await new Promise<ApiResponse<Image>>((resolve, reject) => {
        xhr.open("POST", "/api/upload");
        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve(JSON.parse(xhr.response));
          } else {
            // Try to parse error response
            try {
              const errorResponse = JSON.parse(xhr.response);
              reject(new Error(errorResponse.error || xhr.statusText));
            } catch (parseError) {
              reject(new Error(`HTTP Error: ${xhr.status} ${xhr.statusText}`));
            }
          }
        };
        xhr.onerror = () => reject(new Error("Network error occurred. Please check your connection."));
        xhr.send(formData);
      });

      return response;
    },
    onSuccess: (response) => {
      if (!response.success || !response.data) {
        throw new Error(response.error || "Upload failed");
      }

      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });

      // Clear the preview after successful upload
      setPreview(null);
      setUploadProgress(0);

      // Invalidate images query to refresh the gallery
      queryClient.invalidateQueries({ queryKey: ["/api/images"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive",
      });
      setUploadProgress(0);
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];

    if (!file) return;

    // Check file type
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: `Please upload a valid image file. Accepted formats: ${ACCEPTED_IMAGE_TYPES.map(type => type.split('/')[1].toUpperCase()).join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = Math.round(MAX_FILE_SIZE / (1024 * 1024));
      toast({
        title: "File too large",
        description: `Image must be less than ${sizeMB}MB. Your file is ${Math.round(file.size / (1024 * 1024))}MB`,
        variant: "destructive",
      });
      return;
    }

    // Create temporary preview URL
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    uploadMutation.mutate(file);

    return () => URL.revokeObjectURL(objectUrl);
  }, [toast, uploadMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ACCEPTED_IMAGE_TYPES
    },
    maxSize: MAX_FILE_SIZE,
    multiple: false
  });

  return (
    <Card className="p-6">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"}`}
      >
        <input {...getInputProps()} />

        {preview ? (
          <div className="relative">
            <img
              src={preview}
              alt="Preview"
              className="max-h-64 mx-auto rounded-lg"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={(e) => {
                e.stopPropagation();
                setPreview(null);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {isDragActive
                ? "Drop the image here"
                : "Drag & drop an image here, or click to select"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Accepted formats: {ACCEPTED_IMAGE_TYPES.map(type => type.split('/')[1].toUpperCase()).join(', ')} 
              <br />
              Maximum size: {Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB
            </p>
          </div>
        )}
      </div>

      {uploadProgress > 0 && uploadProgress < 100 && (
        <div className="mt-4">
          <Progress value={uploadProgress} />
          <p className="text-sm text-muted-foreground text-center mt-2">
            Uploading... {Math.round(uploadProgress)}%
          </p>
        </div>
      )}
    </Card>
  );
}