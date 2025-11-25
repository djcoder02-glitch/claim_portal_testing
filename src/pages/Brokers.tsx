import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogFooter } from "@/components/ui/dialog";
import { Edit, Plus } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Briefcase, 
  Loader2,
  Search,
  Mail,
  Phone,
  Building,
  Eye,
  FileText
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Broker {
  id: string;
  name: string;
  email: string | null;
  contact: string | null;
  company: string | null;
  created_at: string;
}

interface Claim {
  id: string;
  claim_number: string;
  title: string;
  status: string;
  created_at: string;
  broker_id: string | null;
  form_data: any;
  user_id: string;
  policy_types: { name: string } | null;
  user_email: string | null;
}


interface BrokerWithStats extends Broker {
  claimsCount: number;
  latestClaim: string | null;
  statuses: { [key: string]: number };
}

export const Brokers = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [viewClaimsDialog, setViewClaimsDialog] = useState<{
    open: boolean;
    brokerId: string | null;
    brokerName: string | null;
  }>({ open: false, brokerId: null, brokerName: null });

  const [editBrokerDialog, setEditBrokerDialog] = useState(false);
  const [selectedBroker, setSelectedBroker] = useState<Broker | null>(null);
  const [brokerFormData, setBrokerFormData] = useState({
    name: "",
    email: "",
    contact: "",
    company: "",
  });
  const queryClient = useQueryClient();


  // Fetch all brokers
  const { data: brokers = [], isLoading: brokersLoading } = useQuery({
    queryKey: ['all-brokers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brokers')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Broker[];
    },
  });

  // Fetch all claims to count broker usage
  const { data: claims = [], isLoading: claimsLoading } = useQuery({
  queryKey: ['claims-for-brokers'],
  queryFn: async () => {
    const { data: claimsData, error } = await supabase
      .from('claims')
      .select('id, claim_number, title, status, created_at, broker_id, form_data, policy_types(name), user_id')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    if (!claimsData) return [];

    // Fetch user emails
    const { data: emailsData } = await supabase.rpc('get_all_user_emails');
    
    // Create email map with proper typing
    const emailMap = new Map<string, string>();
    if (emailsData && Array.isArray(emailsData)) {
      emailsData.forEach((item: any) => {
        if (item.user_id && item.email) {
          emailMap.set(item.user_id, item.email);
        }
      });
    }
    
    // Map claims with user emails - cast to any first to avoid TypeScript errors
    return (claimsData as any[]).map((claim: any) => ({
      id: claim.id,
      claim_number: claim.claim_number,
      title: claim.title,
      status: claim.status,
      created_at: claim.created_at,
      broker_id: claim.broker_id,
      user_id: claim.user_id,
      form_data: claim.form_data,
      policy_types: claim.policy_types,
      user_email: emailMap.get(claim.user_id) || null,
    })) as Claim[];
  },
});


  // Calculate broker statistics
  const brokersWithStats: BrokerWithStats[] = useMemo(() => {
    return brokers.map(broker => {
      const brokerClaims = claims.filter(claim => claim.broker_id === broker.id);
      const statuses: { [key: string]: number } = {};
      
      brokerClaims.forEach(claim => {
        statuses[claim.status] = (statuses[claim.status] || 0) + 1;
      });

      const latestClaim = brokerClaims.length > 0 
        ? brokerClaims.reduce((latest, claim) => 
            new Date(claim.created_at) > new Date(latest.created_at) ? claim : latest
          ).created_at
        : null;

      return {
        ...broker,
        claimsCount: brokerClaims.length,
        latestClaim,
        statuses,
      };
    });
  }, [brokers, claims]);

  // Filter brokers based on search
  const filteredBrokers = brokersWithStats.filter(broker =>
    broker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    broker.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    broker.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    broker.contact?.includes(searchTerm)
  );

  // Get claims for specific broker
  const brokerClaims = useMemo(() => {
    if (!viewClaimsDialog.brokerId) return [];
    
    return claims.filter(claim => claim.broker_id === viewClaimsDialog.brokerId);
  }, [claims, viewClaimsDialog.brokerId]);

  const handleViewClaims = (brokerId: string, brokerName: string) => {
    setViewClaimsDialog({ open: true, brokerId, brokerName });
  };

  // Get status badge color
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved':
      case 'paid':
        return 'default';
      case 'rejected':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  // Update broker mutation
  const updateBrokerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof brokerFormData }) => {
      const { error } = await supabase
        .from('brokers')
        .update({
          name: data.name,
          email: data.email || null,
          contact: data.contact || null,
          company: data.company || null,
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-brokers'] });
      queryClient.invalidateQueries({ queryKey: ['claims-for-brokers'] });
      toast.success("Broker details updated successfully");
      setEditBrokerDialog(false);
      resetBrokerForm();
    },
    onError: (error: any) => {
      toast.error("Failed to update broker: " + error.message);
    },
  });

  
  const resetBrokerForm = () => {
    setBrokerFormData({
      name: "",
      email: "",
      contact: "",
      company: "",
    });
    setSelectedBroker(null);
  };

  const handleEditBroker = (broker: Broker) => {
    setSelectedBroker(broker);
    setBrokerFormData({
      name: broker.name,
      email: broker.email || "",
      contact: broker.contact || "",
      company: broker.company || "",
    });
    setEditBrokerDialog(true);
  };

  const handleUpdateBroker = async () => {
    if (!selectedBroker) return;
    
    if (!brokerFormData.name.trim()) {
      toast.error("Broker name is required");
      return;
    }

    try {
      await updateBrokerMutation.mutateAsync({
        id: selectedBroker.id,
        data: brokerFormData,
      });
    } catch (error) {
      console.error("Update broker error:", error);
    }
  };


  const isLoading = brokersLoading || claimsLoading;

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Agents and Brokers</h1>
        <p className="text-gray-600 mt-1">Manage broker and agent information</p>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search brokers by name, company, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Brokers Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Brokers ({filteredBrokers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : filteredBrokers.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {searchTerm ? "No brokers found" : "No brokers yet"}
              </h3>
              <p className="text-gray-600">
                {searchTerm 
                  ? "Try adjusting your search" 
                  : "Brokers will appear here once added to claims"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Total Claims</TableHead>
                  <TableHead>Pending</TableHead>
                  <TableHead>Approved</TableHead>
                  <TableHead>Latest Activity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBrokers.map((broker) => (
                  <TableRow key={broker.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <Briefcase className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <div className="font-medium">{broker.name}</div>
                          {(broker.company || broker.contact || broker.email) && (
                            <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                              {broker.company && (
                                <span className="flex items-center gap-1">
                                  <Building className="w-3 h-3" />
                                  {broker.company}
                                </span>
                              )}
                              {broker.contact && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {broker.contact}
                                </span>
                              )}
                              {broker.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {broker.email}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-semibold">
                        {broker.claimsCount}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-yellow-600 font-medium">
                        {(broker.statuses.pending || 0) + 
                         (broker.statuses.submitted || 0) + 
                         (broker.statuses.under_review || 0)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-green-600 font-medium">
                        {(broker.statuses.approved || 0) + 
                         (broker.statuses.paid || 0)}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {broker.latestClaim 
                        ? new Date(broker.latestClaim).toLocaleDateString()
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditBroker(broker)}
                          className="gap-2"
                        >
                          <Edit className="w-4 h-4" />
                          Edit Details
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewClaims(broker.id, broker.name)}
                          className="gap-2"
                          disabled={broker.claimsCount === 0}
                        >
                          <Eye className="w-4 h-4" />
                          View Claims
                        </Button>
                      </div>
                    </TableCell>

                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Claims Dialog */}
      <Dialog 
        open={viewClaimsDialog.open} 
        onOpenChange={(open) => setViewClaimsDialog({ open, brokerId: null, brokerName: null })}
      >
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Claims for {viewClaimsDialog.brokerName}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto py-4">
            {brokerClaims.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No claims found for this broker</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Claim Number</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Policy Type</TableHead>
                    <TableHead>Assigned Surveyor</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {brokerClaims.map((claim) => (
                    <TableRow 
                      key={claim.id} 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => {
                        setViewClaimsDialog({ open: false, brokerId: null, brokerName: null });
                        navigate(`/claims/${claim.id}`);
                      }}
                    >
                      <TableCell className="font-medium">
                        {claim.claim_number}
                      </TableCell>
                      <TableCell>{claim.title}</TableCell>
                      <TableCell>{claim.policy_types?.name || '—'}</TableCell>
                      <TableCell>
                        {claim.form_data?.assigned_surveyor || '—'}
                      </TableCell>
                      <TableCell>
                        {claim.user_email || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(claim.status)}>
                          {claim.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(claim.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* Edit Broker Dialog */}
      <Dialog open={editBrokerDialog} onOpenChange={setEditBrokerDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Edit Broker Details
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-broker-name">Name *</Label>
              <Input
                id="edit-broker-name"
                placeholder="Enter broker name"
                value={brokerFormData.name}
                onChange={(e) => setBrokerFormData({ ...brokerFormData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-broker-company">Company</Label>
              <Input
                id="edit-broker-company"
                placeholder="Enter company name"
                value={brokerFormData.company}
                onChange={(e) => setBrokerFormData({ ...brokerFormData, company: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-broker-contact">Contact Number</Label>
              <Input
                id="edit-broker-contact"
                placeholder="+91 98765 43210"
                value={brokerFormData.contact}
                onChange={(e) => setBrokerFormData({ ...brokerFormData, contact: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-broker-email">Email</Label>
              <Input
                id="edit-broker-email"
                type="email"
                placeholder="broker@example.com"
                value={brokerFormData.email}
                onChange={(e) => setBrokerFormData({ ...brokerFormData, email: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setEditBrokerDialog(false);
                resetBrokerForm();
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateBroker}
              disabled={updateBrokerMutation.isPending}
            >
              {updateBrokerMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Update Broker
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Brokers;