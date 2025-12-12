import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import LeaveRequestsWidget from "@/components/admin/LeaveRequestsWidget";
import { ReimbursementRequestsWidget } from "@/components/admin/ReimbursementRequestsWidget";
import LocationVisitsWidget from "@/components/admin/LocationVisitsWidget";
import { ClipboardList, Calendar, DollarSign, MapPin, Package } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function RequestsManagement() {
  const [assetRequests, setAssetRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssetRequests();
  }, []);

  const fetchAssetRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("asset_requests")
        .select(`
          *,
          asset_inventory(asset_name),
          markets(name)
        `)
        .order("request_date", { ascending: false });

      if (error) throw error;
      setAssetRequests(data || []);
    } catch (error: any) {
      console.error("Error fetching asset requests:", error);
      toast.error("Failed to load asset requests");
    } finally {
      setLoading(false);
    }
  };

  const handleAssetRequestAction = async (requestId: string, action: "approved" | "rejected", rejectionReason?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const updateData: any = {
        status: action,
        approved_by: user.id,
        approval_date: new Date().toISOString(),
      };

      if (action === "rejected" && rejectionReason) {
        updateData.rejection_reason = rejectionReason;
      }

      const { error } = await supabase
        .from("asset_requests")
        .update(updateData)
        .eq("id", requestId);

      if (error) throw error;

      toast.success(`Asset request ${action}`);
      await fetchAssetRequests();
    } catch (error: any) {
      console.error("Error updating asset request:", error);
      toast.error("Failed to update asset request");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      approved: "default",
      rejected: "destructive",
      returned: "default"
    };
    return (
      <Badge variant={variants[status] || "secondary"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const pendingAssetRequests = assetRequests.filter(r => r.status === "pending").length;

  return (
    <div className="container mx-auto p-3 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-center gap-2 md:gap-3">
        <ClipboardList className="h-6 w-6 md:h-8 md:w-8 text-primary" />
        <div>
          <h1 className="text-xl md:text-3xl font-bold">Requests Management</h1>
          <p className="text-xs md:text-base text-muted-foreground">
            Review and manage all employee requests in one place
          </p>
        </div>
      </div>

      <Tabs defaultValue="leave" className="w-full">
        <TabsList className="w-full h-auto flex flex-wrap md:grid md:grid-cols-4 gap-1 md:gap-0">
          <TabsTrigger value="leave" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2">
            <Calendar className="h-3 w-3 md:h-4 md:w-4" />
            <span>Leave</span>
          </TabsTrigger>
          <TabsTrigger value="asset" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2">
            <Package className="h-3 w-3 md:h-4 md:w-4" />
            <span>Asset</span>
            {pendingAssetRequests > 0 && (
              <Badge variant="destructive" className="text-[10px] h-4 px-1">{pendingAssetRequests}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="reimbursement" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2">
            <DollarSign className="h-3 w-3 md:h-4 md:w-4" />
            <span>Reimburse</span>
          </TabsTrigger>
          <TabsTrigger value="location" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2">
            <MapPin className="h-3 w-3 md:h-4 md:w-4" />
            <span>Location</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leave" className="mt-6">
          <LeaveRequestsWidget />
        </TabsContent>

        <TabsContent value="asset" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Asset Issuance Requests</CardTitle>
              <CardDescription>Review employee asset requests and approve/reject them</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : assetRequests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No asset requests
                </p>
              ) : (
                <div className="space-y-4">
                  {assetRequests.map((request) => (
                    <div
                      key={request.id}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <p className="font-medium">
                            {request.requester_role} - {request.requester_id.slice(0, 8)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {request.asset_inventory?.asset_name || "Unknown Asset"} - Qty: {request.quantity}
                          </p>
                          {request.markets?.name && (
                            <p className="text-sm text-muted-foreground">
                              Market: {request.markets.name}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            Purpose: {request.purpose}
                          </p>
                          {request.expected_return_date && (
                            <p className="text-sm text-muted-foreground">
                              Expected Return: {new Date(request.expected_return_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        {getStatusBadge(request.status)}
                      </div>

                      {request.status === "pending" && (
                        <div className="flex gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleAssetRequestAction(request.id, "approved")}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              const reason = prompt("Enter rejection reason (optional):");
                              handleAssetRequestAction(request.id, "rejected", reason || undefined);
                            }}
                          >
                            Reject
                          </Button>
                        </div>
                      )}

                      {request.rejection_reason && (
                        <div className="p-2 bg-muted rounded">
                          <p className="text-xs font-medium">Rejection Reason:</p>
                          <p className="text-xs text-muted-foreground">
                            {request.rejection_reason}
                          </p>
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground">
                        Requested: {new Date(request.request_date).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reimbursement" className="mt-6">
          <ReimbursementRequestsWidget />
        </TabsContent>

        <TabsContent value="location" className="mt-6">
          <LocationVisitsWidget />
        </TabsContent>
      </Tabs>
    </div>
  );
}
