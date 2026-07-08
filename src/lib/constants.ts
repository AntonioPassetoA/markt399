// Opções de Serviço e Status usadas em toda a aplicação (formulários, validação e filtros).

export const SERVICO_OPTIONS = [
  "Gestão de Tráfego",
  "Google Ads",
  "Meta Ads",
  "Google + Meta",
  "CRC",
  "IA",
  "Landing Page",
  "Gestão Completa",
  "Tráfego Pago",
  "Social Media",
  "Outro",
] as const;

export const STATUS_OPTIONS = [
  "Novo",
  "Em análise",
  "Em atendimento",
  "Contrato enviado",
  "Cliente ativo",
  "Cliente pausado",
  "Cliente finalizado",
  "Perdido",
] as const;

export type Servico = (typeof SERVICO_OPTIONS)[number];
export type Status = (typeof STATUS_OPTIONS)[number];

export const STATUS_DEFAULT: Status = "Novo";

// Serviço único vendido — usado no formulário público (o cliente não escolhe).
export const SERVICO_PADRAO = "Gestão de Tráfego";

// Cores dos badges de status (Tailwind classes).
export const STATUS_COLORS: Record<string, string> = {
  Novo: "bg-blue-100 text-blue-800",
  "Em análise": "bg-yellow-100 text-yellow-800",
  "Em atendimento": "bg-indigo-100 text-indigo-800",
  "Contrato enviado": "bg-purple-100 text-purple-800",
  "Cliente ativo": "bg-green-100 text-green-800",
  "Cliente pausado": "bg-orange-100 text-orange-800",
  "Cliente finalizado": "bg-gray-200 text-gray-800",
  Perdido: "bg-red-100 text-red-800",
};
