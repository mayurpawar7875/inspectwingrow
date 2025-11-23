import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface ReimbursementRequest {
  id: string;
  request_type: string;
  amount: number;
  description: string | null;
  status: string;
  submitted_at: string;
  review_notes: string | null;
  receipt_url: string;
}

export function ReimbursementForm() {
  const [requestType, setRequestType] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [myRequests, setMyRequests] = useState<ReimbursementRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyRequests();
  }, []);

  const fetchMyRequests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("reimbursement_requests")
        .select("*")
        .eq("employee_id", user.id)
        .order("submitted_at", { ascending: false });

      if (error) throw error;
      setMyRequests(data || []);
    } catch (error: any) {
      console.error("Error fetching requests:", error);
      toast.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Please upload only JPG, PNG, or PDF files");
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }
      setReceiptFile(file);
    }
  };

  const uploadReceipt = async (file: File, userId: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('reimbursement-receipts')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    return fileName;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!requestType || !amount || !receiptFile) {
      toast.error("Please fill all required fields and upload receipt");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload receipt
      const receiptPath = await uploadReceipt(receiptFile, user.id);

      // Create reimbursement request
      const { error } = await supabase
        .from("reimbursement_requests")
        .insert({
          employee_id: user.id,
          request_type: requestType,
          amount: amountNum,
          description: description || null,
          receipt_url: receiptPath,
        });

      if (error) throw error;

      toast.success("Reimbursement request submitted successfully");
      
      // Reset form
      setRequestType("");
      setAmount("");
      setDescription("");
      setReceiptFile(null);
      
      // Refresh requests list
      await fetchMyRequests();
    } catch (error: any) {
      console.error("Error submitting request:", error);
      toast.error(error.message || "Failed to submit request");
    } finally {
      setSubmitting(false);
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

  return (
    <div className="space-y-4 md:space-y-6">
      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-base md:text-lg">Submit Reimbursement Request</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Request reimbursement for overtime, expenses, or week-off working
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
            <div className="space-y-1.5 md:space-y-2">
              <Label htmlFor="request-type" className="text-xs md:text-sm">Request Type *</Label>
              <Select value={requestType} onValueChange={setRequestType}>
                <SelectTrigger id="request-type" className="text-xs md:text-sm h-9 md:h-10">
                  <SelectValue placeholder="Select request type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flex_overtime" className="text-xs md:text-sm">Flex/Overtime</SelectItem>
                  <SelectItem value="other_expenses" className="text-xs md:text-sm">Other Expenses</SelectItem>
                  <SelectItem value="week_off_working" className="text-xs md:text-sm">Week Off Day Working</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 md:space-y-2">
              <Label htmlFor="amount" className="text-xs md:text-sm">Amount (₹) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-xs md:text-sm h-9 md:h-10"
              />
            </div>

            <div className="space-y-1.5 md:space-y-2">
              <Label htmlFor="description" className="text-xs md:text-sm">Description</Label>
              <Textarea
                id="description"
                placeholder="Add details about your reimbursement request"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="text-xs md:text-sm"
              />
            </div>

            <div className="space-y-1.5 md:space-y-2">
              <Label htmlFor="receipt" className="text-xs md:text-sm">Receipt Upload *</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="receipt"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,application/pdf"
                  onChange={handleFileChange}
                  className="flex-1 text-xs md:text-sm h-9 md:h-10"
                />
                {receiptFile && (
                  <span className="text-xs md:text-sm text-muted-foreground truncate max-w-[120px]">
                    {receiptFile.name}
                  </span>
                )}
              </div>
              <p className="text-[10px] md:text-xs text-muted-foreground">
                Upload JPG, PNG, or PDF (max 5MB)
              </p>
            </div>

            <Button type="submit" disabled={submitting} className="w-full text-xs md:text-sm h-9 md:h-10">
              {submitting ? (
                <>
                  <Loader2 className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4 animate-spin" />
                  <span className="text-xs md:text-sm">Submitting...</span>
                </>
              ) : (
                <>
                  <Upload className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
                  <span className="text-xs md:text-sm">Submit Request</span>
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-base md:text-lg">My Reimbursement Requests</CardTitle>
          <CardDescription className="text-xs md:text-sm">Track status of your submitted requests</CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          {loading ? (
            <div className="flex justify-center py-6 md:py-8">
              <Loader2 className="h-5 w-5 md:h-6 md:w-6 animate-spin text-muted-foreground" />
            </div>
          ) : myRequests.length === 0 ? (
            <p className="text-center text-xs md:text-sm text-muted-foreground py-6 md:py-8">
              No reimbursement requests submitted yet
            </p>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {myRequests.map((request) => (
                <div
                  key={request.id}
                  className="border rounded-lg p-3 md:p-4 space-y-1.5 md:space-y-2"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-medium text-xs md:text-sm">
                        {getRequestTypeLabel(request.request_type)}
                      </p>
                      <p className="text-[10px] md:text-xs text-muted-foreground">
                        Amount: ₹{request.amount.toFixed(2)}
                      </p>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                  {request.description && (
                    <p className="text-[10px] md:text-xs text-muted-foreground">
                      {request.description}
                    </p>
                  )}
                  <p className="text-[10px] md:text-xs text-muted-foreground">
                    Submitted: {format(new Date(request.submitted_at), "PPp")}
                  </p>
                  {request.review_notes && (
                    <div className="mt-1.5 md:mt-2 p-2 bg-muted rounded">
                      <p className="text-[10px] md:text-xs font-medium">Admin Notes:</p>
                      <p className="text-[10px] md:text-xs text-muted-foreground">
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
    </div>
  );
}

export default ReimbursementForm;
