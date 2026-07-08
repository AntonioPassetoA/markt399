"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

// Mostra o link fixo do formulário público da agência, com botão de copiar.
// O link é montado a partir do domínio atual + o id do usuário (token).
export function ShareFormLink({ userId }: { userId: string }) {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(`${window.location.origin}/formulario/${userId}`);
  }, [userId]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback simples
      window.prompt("Copie o link:", url);
    }
  }

  return (
    <Card className="bg-brand/5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">
            🔗 Link do formulário para clientes
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Envie este link para o cliente preencher. Cada envio vira um cadastro
            aqui e na sua planilha.
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.target.select()}
          className="w-full flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:outline-none"
        />
        <div className="flex gap-2">
          <Button type="button" onClick={copy} size="sm">
            {copied ? "Copiado! ✓" : "Copiar link"}
          </Button>
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer">
              <Button type="button" variant="secondary" size="sm">
                Abrir
              </Button>
            </a>
          )}
        </div>
      </div>
    </Card>
  );
}
