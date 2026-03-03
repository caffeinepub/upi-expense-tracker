import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Loader2, Shield, Trash2, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useDeleteAllData,
  useGetCallerUserProfile,
  useSaveCallerUserProfile,
} from "../hooks/useQueries";

export default function SettingsPage() {
  const { clear, identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const { data: userProfile } = useGetCallerUserProfile();
  const saveProfile = useSaveCallerUserProfile();
  const deleteAllData = useDeleteAllData();

  const [name, setName] = useState(userProfile?.name || "");
  const [email, setEmail] = useState(userProfile?.email || "");
  const [profileSaved, setProfileSaved] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await saveProfile.mutateAsync({ name: name.trim(), email: email.trim() });
      setProfileSaved(true);
      toast.success("Profile updated successfully.");
      setTimeout(() => setProfileSaved(false), 3000);
    } catch {
      toast.error("Failed to update profile.");
    }
  };

  const handleDeleteAll = async () => {
    try {
      await deleteAllData.mutateAsync();
      toast.success("All data deleted. Logging out...");
      setTimeout(async () => {
        await clear();
        queryClient.clear();
      }, 1500);
    } catch {
      toast.error("Failed to delete data. Please try again.");
    }
  };

  const principal = identity?.getPrincipal().toString();

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your profile and data
        </p>
      </div>

      {/* Profile */}
      <Card className="bg-surface border-border">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <User className="w-4 h-4 text-mint" />
            Profile
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Update your display name and email
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground">
                Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="bg-surface-elevated border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">
                Email (optional)
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="bg-surface-elevated border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <Button
              type="submit"
              disabled={!name.trim() || saveProfile.isPending}
              className="bg-mint text-charcoal hover:bg-mint/90 font-semibold gap-2"
            >
              {saveProfile.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : profileSaved ? (
                <>
                  <CheckCircle className="w-4 h-4" /> Saved!
                </>
              ) : (
                "Save Profile"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Identity */}
      <Card className="bg-surface border-border">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <Shield className="w-4 h-4 text-mint" />
            Identity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              Your Principal ID
            </p>
            <p className="text-xs font-mono text-foreground bg-surface-elevated border border-border rounded-lg px-3 py-2 break-all">
              {principal || "Not available"}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            This is your unique Internet Identity. Your data is keyed to this
            principal — only you can access it.
          </p>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="bg-surface border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-destructive flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            Danger Zone
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Permanently delete all your transaction data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between gap-4 p-4 bg-destructive/5 border border-destructive/20 rounded-xl">
            <div>
              <p className="text-sm font-medium text-foreground">
                Delete All My Data
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                This will permanently remove all your transactions and profile
                data. This action cannot be undone.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={deleteAllData.isPending}
                  className="flex-shrink-0"
                >
                  {deleteAllData.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  <span className="ml-2">Delete</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-surface border-border">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-foreground">
                    Are you absolutely sure?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-muted-foreground">
                    This will permanently delete all your transaction data and
                    profile. You will be logged out. This action cannot be
                    undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-surface-elevated border-border text-foreground hover:bg-surface">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAll}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Yes, delete everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
