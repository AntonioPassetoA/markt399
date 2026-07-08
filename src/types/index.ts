import type { Servico, Status } from "@/lib/constants";

export interface Client {
  id: string;
  created_at: string;
  updated_at: string | null;
  user_id: string;
  user_email: string;
  cliente: string;
  area_de_atuacao: string | null;
  informacoes: string;
  impulsionamento: string;
  servico: Servico | string;
  whatsapp: string;
  cnpj: string | null;
  endereco: string | null;
  principais_informacoes_cliente: string;
  status: Status | string;
  google_sheet_synced: boolean;
  google_sheet_row: number | null;
}

export interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  whatsapp: string | null;
  role: "user" | "admin" | string;
  created_at: string;
}
