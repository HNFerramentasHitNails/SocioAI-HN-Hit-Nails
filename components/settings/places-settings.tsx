"use client";

import { useTransition } from "react";
import { MapPin, Send } from "lucide-react";
import { toast } from "sonner";

import {
  savePlacesConfig,
  testPlaces,
  type PlacesSettings,
} from "@/app/(app)/definicoes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function PlacesSettingsCard({ settings }: { settings: PlacesSettings }) {
  const [saving, startSaving] = useTransition();
  const [testing, startTesting] = useTransition();

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startSaving(async () => {
      const res = await savePlacesConfig(fd);
      if (res.error) toast.error(res.error);
      else toast.success("Google Places guardado.");
    });
  }

  function onTest() {
    startTesting(async () => {
      const res = await testPlaces();
      if (res.error) toast.error(res.error);
      else toast.success("Ligação à Google Places a funcionar.");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="size-5 text-primary" /> Marketplace (Google Places)
        </CardTitle>
        <CardDescription>
          API Key da Google Places para gerar leads de negócios locais. Precisa de
          ter a <strong>Places API (New)</strong> ativa e faturação no Google
          Cloud.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form onSubmit={onSave} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="places-key">Google Places API Key</Label>
            <Input
              id="places-key"
              name="api_key"
              type="password"
              placeholder={settings.hasApiKey ? "•••••• (definida)" : "AIza..."}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? "A guardar…" : "Guardar"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="gap-2"
              onClick={onTest}
              disabled={testing}
            >
              <Send className="size-4" />
              {testing ? "A testar…" : "Testar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
