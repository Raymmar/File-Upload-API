import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Key } from "lucide-react";

// localStorage key for saving the API key
const API_KEY_STORAGE_KEY = "image_upload_api_key";

export default function ApiKeyInput() {
  const [apiKey, setApiKey] = useState<string>("");
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const { toast } = useToast();

  // Load API key from localStorage on component mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (savedApiKey) {
      setApiKey(savedApiKey);
      setIsSaved(true);
    }
  }, []);

  const saveApiKey = () => {
    if (!apiKey.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter an API key",
        variant: "destructive",
      });
      return;
    }

    localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
    setIsSaved(true);
    
    toast({
      title: "API Key Saved",
      description: "Your API key has been saved to browser storage",
    });
  };

  const clearApiKey = () => {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
    setApiKey("");
    setIsSaved(false);
    setShowApiKey(false);
    
    toast({
      title: "API Key Removed",
      description: "Your API key has been removed from browser storage",
    });
  };

  // This function is for the XHR request interceptor to get the API key
  // It will be exposed on the window object
  useEffect(() => {
    // Define a getter function that the XHR interceptor will call
    const getApiKey = () => {
      return localStorage.getItem(API_KEY_STORAGE_KEY) || "";
    };
    
    // Expose the function to window so it can be called by XHR interceptor
    // @ts-ignore - Adding custom property to window
    window.getApiKey = getApiKey;
    
    // Clean up when component unmounts
    return () => {
      // @ts-ignore - Removing custom property from window
      delete window.getApiKey;
    };
  }, []);

  return (
    <Accordion type="single" collapsible className="mb-6">
      <AccordionItem value="api-key">
        <AccordionTrigger className="text-sm font-medium">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            <span>API Key Configuration</span>
            {isSaved && (
              <span className="text-xs text-green-500 font-normal bg-green-50 px-2 py-0.5 rounded-full">
                Saved
              </span>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <Card className="border-none shadow-none">
            <CardHeader className="p-0 pb-2">
              <CardDescription>
                Enter your API key to enable image uploads and management.
                The key will be stored in your browser's local storage.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 pb-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showApiKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter API key"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button onClick={saveApiKey} type="button">
                  Save
                </Button>
              </div>
            </CardContent>
            <CardFooter className="p-0 flex justify-between items-center">
              <div className="text-xs text-muted-foreground">
                {isSaved ? "API key is stored in your browser" : "No API key saved"}
              </div>
              {isSaved && (
                <Button variant="outline" size="sm" onClick={clearApiKey}>
                  Clear
                </Button>
              )}
            </CardFooter>
          </Card>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}