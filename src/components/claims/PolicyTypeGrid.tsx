import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePolicyTypes } from "@/hooks/useClaims";
import { 
  Car, 
  Home, 
  Anchor, 
  Heart, 
  Settings, 
  Users, 
  Plus,
  FileText 
} from "lucide-react";

interface PolicyTypeGridProps {
  onPolicyTypeSelect: (policyTypeId: string) => void;
}

const policyTypeIcons = {
  "Motor": Car,
  "Property": Home, 
  "Marine": Anchor,
  "Life": Heart,
  "Engineering": Settings,
  "Fire": FileText,
  "Misc": Plus,
  "Client": Users,
  "Value Added Services": Plus,
} as const;

const policyTypeDescriptions = {
  "Motor": "Vehicle insurance claims",
  "Property": "Home & property claims", 
  "Marine": "Marine cargo claims",
  "Life": "Life insurance claims",
  "Engineering": "Engineering insurance claims",
  "Fire": "Fire insurance claims", 
  "Misc": "Miscellaneous claims",
  "Client": "Client-specific claims",
  "Value Added Services": "Additional service claims",
} as const;

export const PolicyTypeGrid = ({ onPolicyTypeSelect }: PolicyTypeGridProps) => {
  const { data: policyTypes, isLoading } = usePolicyTypes();
  
  // Get main policy types (no parent_id)
  const mainPolicyTypes = policyTypes?.filter(type => !type.parent_id) || [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-32 bg-muted rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {mainPolicyTypes.map((policyType) => {
        const Icon = policyTypeIcons[policyType.name as keyof typeof policyTypeIcons] || FileText;
        const description = policyTypeDescriptions[policyType.name as keyof typeof policyTypeDescriptions] || policyType.description;
        
        return (
          <Card 
            key={policyType.id}
            className="cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105 border-2 hover:border-primary/50 group"
            onClick={() => onPolicyTypeSelect(policyType.id)}
          >
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-8 h-8 text-primary" />
                </div>
              </div>
              <CardTitle className="text-lg font-semibold">{policyType.name}</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                {description}
              </CardDescription>
            </CardHeader>
          </Card>
        );
      })}
    </div>
  );
};