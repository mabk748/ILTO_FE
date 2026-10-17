import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  CalendarPlus,
  FolderKanban,
  MapPin,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";

const HANDOFFS = [
  {
    label: "Project milestone",
    description: "Open the existing Projects milestone editor.",
    path: "/projects?create=milestone",
    icon: FolderKanban,
  },
  {
    label: "Work deadline",
    description: "Open the existing Work deadline editor.",
    path: "/work?tab=deadlines&create=deadline",
    icon: Briefcase,
  },
  {
    label: "Logistics event",
    description: "Open the existing Logistics event editor.",
    path: "/logistics?tab=calendar&create=event",
    icon: MapPin,
  },
] as const;

export default function HorizonAddMenu({
  onCalendarBlock,
}: {
  onCalendarBlock: () => void;
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  return (
    <>
      <Button type="button" className="min-h-11" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Add
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>What do you want to add?</DialogTitle>
            <DialogDescription>
              Horizon owns calendar blocks. Domain records are created in their
              source module.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              className="min-h-20 rounded-lg border border-primary/40 bg-primary/10 p-3 text-left hover:bg-primary/15"
              onClick={() => {
                setOpen(false);
                onCalendarBlock();
              }}
            >
              <span className="flex items-center gap-2 font-semibold">
                <CalendarPlus className="h-4 w-4 text-primary" /> Calendar block
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                Add time that belongs directly to Horizon.
              </span>
            </button>
            {HANDOFFS.map(({ label, description, path, icon: Icon }) => (
              <button
                key={path}
                type="button"
                className="min-h-20 rounded-lg border p-3 text-left hover:bg-accent"
                onClick={() => navigate(path)}
              >
                <span className="flex items-center gap-2 font-semibold">
                  <Icon className="h-4 w-4" /> {label}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {description}
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
