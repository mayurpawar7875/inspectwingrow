import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import { Loader2, FileText, CheckCircle, XCircle, Eye } from "lucide-react";
import { getSignedUrl } from "@/lib/storageHelpers";

interface ReimbursementRequest {
  id: string;
  employee_id: string;
  request_type: string;
  amount: number;
  description: string | null;
  receipt_url: string;
  status: string;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
}

interface EmployeeProfile {
  full_name: string;
}

export function ReimbursementRequestsWidget() {
  const [requests, setRequests] = useState<ReimbursementRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ReimbursementRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [employeeNames, setEmployeeNames] = useState<Record<string, string>>({});
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("reimbursement_requests")
        .select("*")
        .order("submitted_at", { ascending: false });

      if (error) throw error;

      setRequests(data || []);

      // Fetch employee names from both profiles and employees tables
      const employeeIds = [...new Set(data?.map(r => r.employee_id) || [])];
      
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", employeeIds);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
      }

      const { data: employees, error: employeesError } = await supabase
        .from("employees")
        .select("id, full_name")
        .in("id", employeeIds);

      if (employeesError) {
        console.error("Error fetching employees:", employeesError);
      }

      const nameMap: Record<string, string> = {};
      
      // Prioritize profiles table
      if (profiles) {
        profiles.forEach(p => {
          if (p.full_name) {
            nameMap[p.id] = p.full_name;
          }
        });
      }
      
      // Fallback to employees table
      if (employees) {
        employees.forEach(e => {
          if (!nameMap[e.id] && e.full_name) {
            nameMap[e.id] = e.full_name;
          }
        });
      }
      
      setEmployeeNames(nameMap);
    } catch (error: any) {
      console.error("Error fetching requests:", error);
      toast.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  const handleViewReceipt = async (request: ReimbursementRequest) => {
    try {
      const signedUrl = await getSignedUrl('reimbursement-receipts', request.receipt_url, 3600);
      if (signedUrl) {
        window.open(signedUrl, '_blank');
      } else {
        toast.error("Failed to load receipt");
      }
    } catch (error) {
      console.error("Error viewing receipt:", error);
      toast.error("Failed to load receipt");
    }
  };

  const handleReview = async (requestId: string, status: 'approved' | 'rejected') => {
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("reimbursement_requests")
        .update({
          status,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes || null,
        })
        .eq("id", requestId);

      if (error) throw error;

      toast.success(`Request ${status} successfully`);
      setSelectedRequest(null);
      setReviewNotes("");
      await fetchRequests();
    } catch (error: any) {
      console.error("Error reviewing request:", error);
      toast.error("Failed to update request");
    } finally {
      setProcessing(false);
    }
  };

  const getRequestTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      flex_overtime: "Flex/Overtime",
      other_expenses: "Other Expenses",
      week_off_working: "Week Off Day Working"
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      approved: "default",
      rejected: "destructive"
    };
    return (
      <Badge variant={variants[status] || "secondary"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Reimbursement Requests</span>
            {pendingCount > 0 && (
              <Badge variant="secondary">{pendingCount} Pending</Badge>
            )}
          </CardTitle>
          <CardDescription>Review and approve employee reimbursement requests</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : requests.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No reimbursement requests
            </p>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="font-medium">
                        {employeeNames[request.employee_id] || "Unknown Employee"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {getRequestTypeLabel(request.request_type)} - ₹{request.amount.toFixed(2)}
                      </p>
                      {request.description && (
                        <p className="text-sm text-muted-foreground">
                          {request.description}
                        </p>
                      )}
                    </div>
                    {getStatusBadge(request.status)}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewReceipt(request)}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      View Receipt
                    </Button>

                    {request.status === 'pending' && (
                      <>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => {
                            setSelectedRequest(request);
                            setReviewNotes("");
                          }}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Review
                        </Button>
                      </>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Submitted: {format(new Date(request.submitted_at), "PPp")}
                  </p>

                  {request.review_notes && (
                    <div className="p-2 bg-muted rounded">
                      <p className="text-xs font-medium">Review Notes:</p>
                      <p className="text-xs text-muted-foreground">
                        {request.review_notes}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Reimbursement Request</DialogTitle>
            <DialogDescription>
              Add optional notes and approve or reject this request
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="font-medium">Employee:</span>{" "}
                  {employeeNames[selectedRequest.employee_id] || "Unknown"}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Type:</span>{" "}
                  {getRequestTypeLabel(selectedRequest.request_type)}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Amount:</span> ₹
                  {selectedRequest.amount.toFixed(2)}
                </p>
                {selectedRequest.description && (
                  <p className="text-sm">
                    <span className="font-medium">Description:</span>{" "}
                    {selectedRequest.description}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="review-notes">Review Notes (Optional)</Label>
                <Textarea
                  id="review-notes"
                  placeholder="Add notes about your decision"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={() => handleReview(selectedRequest.id, 'approved')}
                  disabled={processing}
                >
                  {processing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  )}
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => handleReview(selectedRequest.id, 'rejected')}
                  disabled={processing}
                >
                  {processing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="mr-2 h-4 w-4" />
                  )}
                  Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
