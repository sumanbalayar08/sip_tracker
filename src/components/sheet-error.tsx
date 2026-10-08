import { CircleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function SheetError({ error }: { error: string }) {
  return (
    <Alert variant="destructive">
      <CircleAlert />
      <AlertTitle>Couldn&apos;t read your Google Sheet</AlertTitle>
      <AlertDescription>
        <p className="font-mono break-words">{error}</p>
        <p>
          Check the env vars in .env.local (or Vercel), and that the sheet is shared with the service-account email as
          Editor. Run <code>pnpm sheet:init</code> to create the tabs.
        </p>
      </AlertDescription>
    </Alert>
  );
}
