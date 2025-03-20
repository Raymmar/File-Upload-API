import { useState, createContext, useContext } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Key } from "lucide-react";

// Create a context for the API key to share it across components
type ApiKeyContextType = {
  apiKey: string;
  setApiKey: (key: string) => void;
};

export const ApiKeyContext = createContext<ApiKeyContextType>({
  apiKey: "",
  setApiKey: () => {},
});

// Custom hook to use the API key context
export const useApiKey = () => useContext(ApiKeyContext);

export default function ApiKeyInput() {
  const { apiKey, setApiKey } = useApiKey();
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [inputKey, setInputKey] = useState<string>(apiKey || "");
  const { toast } = useToast();

  const saveApiKey = () => {
    if (!inputKey.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter an API key",
        variant: "destructive",
      });
      return;
    }

    // Set API key in context (session only)
    setApiKey(inputKey);
    
    toast({
      title: "API Key Applied",
      description: "Your API key will be used for this session",
    });
  };

  const clearApiKey = () => {
    setApiKey("");
    setInputKey("");
    setShowApiKey(false);
    
    toast({
      title: "API Key Removed",
      description: "Your API key has been cleared from this session",
    });
  };

  const isKeyActive = apiKey.trim().length > 0;

  return (
    <Accordion type="single" collapsible className="mb-6">
      <AccordionItem value="api-key">
        <AccordionTrigger className="text-sm font-medium">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            <span>API Key Configuration</span>
            {isKeyActive && (
              <span className="text-xs text-green-500 font-normal bg-green-50 px-2 py-0.5 rounded-full">
                Active
              </span>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <Card className="border-none shadow-none">
            <CardContent className="p-0 pb-2 pt-2">
              <CardDescription className="mb-3">
                Enter your API key to enable image uploads and management.
                The key will only be stored for the current session.
              </CardDescription>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showApiKey ? "text" : "password"}
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
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
                  Apply
                </Button>
              </div>
            </CardContent>
            <CardFooter className="p-0 flex justify-between items-center">
              <div className="text-xs text-muted-foreground">
                {isKeyActive ? "API key is active for this session" : "No API key active"}
              </div>
              {isKeyActive && (
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