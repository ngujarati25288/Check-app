import React, { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { App } from "@capacitor/app";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { useAuth } from "./FirebaseProvider";
import { t } from "../lib/translations";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { AppUpdateSettings } from "../types";
import { ArrowUpCircle, Info } from "lucide-react";

export const AppUpdateChecker: React.FC = () => {
  const { user } = useAuth();
  const [currentVersion, setCurrentVersion] = useState<string>("1.0.0");
  const [updateSettings, setUpdateSettings] = useState<AppUpdateSettings | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [hasLaterDismissed, setHasLaterDismissed] = useState<boolean>(false);

  // Parse and compare standard semantic versions (e.g. 1.0.2 > 1.0.1)
  const isVersionGreater = (latest: string, current: string): boolean => {
    const latestParts = latest.split('.').map(val => parseInt(val, 10) || 0);
    const currentParts = current.split('.').map(val => parseInt(val, 10) || 0);
    
    for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
      const l = latestParts[i] || 0;
      const c = currentParts[i] || 0;
      if (l > c) return true;
      if (l < c) return false;
    }
    return false;
  };

  // 1. Learn local build version from Capacitor Native / Browser fallback
  useEffect(() => {
    const loadVersion = async () => {
      try {
        const info = await App.getInfo();
        if (info && info.version) {
          setCurrentVersion(info.version);
        }
      } catch (err) {
        // Safe fallback for web view / iframe development
        console.log("Capacitor App info mapping unavailable in standard web view. Using fallback version 1.0.0.");
        setCurrentVersion("1.0.0");
      }
    };
    loadVersion();
  }, []);

  // 2. Core settings listener from Firestore app_config/settings document
  useEffect(() => {
    const docRef = doc(db, "app_config", "settings");
    
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as AppUpdateSettings;
        setUpdateSettings(data);
      }
    }, (error) => {
      // Gracefully capture using required diagnostic callback format
      try {
        handleFirestoreError(error, OperationType.GET, "app_config/settings");
      } catch (e) {
        console.warn("Silent version check rule bypass:", e);
      }
    });

    return () => unsubscribe();
  }, []);

  // 3. Compare versions and decide if update is available
  useEffect(() => {
    if (updateSettings && updateSettings.latestVersion && currentVersion) {
      const needsUpdate = isVersionGreater(updateSettings.latestVersion, currentVersion);
      
      // Mandatory update overrides later option. Non-mandatory is dismissible
      if (needsUpdate) {
        if (updateSettings.mandatory) {
          setIsOpen(true);
        } else if (!hasLaterDismissed) {
          setIsOpen(true);
        }
      } else {
        setIsOpen(false);
      }
    }
  }, [updateSettings, currentVersion, hasLaterDismissed]);

  const handleUpdateNow = () => {
    if (updateSettings?.apkUrl) {
      window.open(updateSettings.apkUrl, "_blank", "noopener,noreferrer,referrerPolicy=no-referrer");
    }
  };

  const handleLater = () => {
    setHasLaterDismissed(true);
    setIsOpen(false);
  };

  if (!updateSettings || !isOpen) return null;

  const isMandatory = updateSettings.mandatory;
  const medium = user?.medium || "Gujarati";

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        // If mandatory update, do not allow user to close dialog by clicking overlay or pressing ESC
        if (isMandatory) {
          setIsOpen(true);
        } else {
          setIsOpen(open);
        }
      }}
    >
      <DialogContent 
        className="max-w-md w-[92%] sm:rounded-xl p-6 bg-background border shadow-2xl overflow-hidden"
        onPointerDownOutside={(e) => {
          if (isMandatory) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (isMandatory) e.preventDefault();
        }}
      >
        <DialogHeader className="flex flex-col items-center justify-center text-center space-y-2 pb-2">
          <div className="p-3 bg-primary/10 rounded-full text-primary animate-pulse">
            <ArrowUpCircle className="h-10 w-10 stroke-[2px]" />
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground -mt-1 sm:text-2xl">
            {t("update_available", medium)}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground max-w-xs">
            A new version of our daily learning platform is available. Please update to continue your exams.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {/* Version details box */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-muted/60 rounded-lg border border-border/80 text-center">
            <div className="flex flex-col items-center">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest font-mono">
                {t("current_version", medium)}
              </span>
              <span className="text-sm font-medium text-foreground mt-0.5 font-mono">
                v{currentVersion}
              </span>
            </div>
            <div className="flex flex-col items-center border-l border-border">
              <span className="text-[11px] font-semibold text-primary/80 uppercase tracking-widest font-mono">
                {t("latest_version", medium)}
              </span>
              <span className="text-sm font-bold text-primary mt-0.5 font-mono">
                v{updateSettings.latestVersion}
              </span>
            </div>
          </div>

          {/* Release notes */}
          {updateSettings.releaseNotes && (
            <div className="space-y-1.5 flex flex-col">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono">
                <Info className="h-3.5 w-3.5 text-primary" />
                <span>{t("release_notes", medium)}</span>
              </div>
              <div className="bg-muted/30 border border-border/50 rounded-lg p-3 max-h-36 overflow-y-auto text-xs text-foreground/80 leading-relaxed whitespace-pre-line">
                {updateSettings.releaseNotes}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex sm:flex-row flex-col gap-2 mt-4 sm:space-x-2">
          {!isMandatory && (
            <Button
              variant="outline"
              onClick={handleLater}
              className="w-full sm:w-auto font-medium order-2 sm:order-1 cursor-pointer"
            >
              {t("later", medium)}
            </Button>
          )}
          <Button
            variant="default"
            onClick={handleUpdateNow}
            className="w-full sm:w-auto font-semibold bg-primary text-primary-foreground hover:bg-primary/90 order-1 sm:order-2 cursor-pointer transition-all active:scale-[0.98]"
          >
            {t("update_now", medium)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
