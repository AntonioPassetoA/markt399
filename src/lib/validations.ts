import { z } from "zod";
import { SERVICO_OPTIONS, STATUS_OPTIONS } from "./constants";

// ---------- Cliente ----------
export const clientSchema = z.object({
  cliente: z
    .string()
    .trim()
    .min(2, "O nome do cliente deve ter pelo menos 2 caracteres."),
  area_de_atuacao: z
    .string()
    .trim()
    .min(2, "Informe a área de atuação."),
  informacoes: z
    .string()
    .trim()
    .min(5, "Conte um pouco mais sobre o seu negócio (mínimo 5 caracteres)."),
  impulsionamento: z
    .string()
    .trim()
    .min(2, "Informe o impulsionamento (mínimo 2 caracteres)."),
  servico: z.enum(SERVICO_OPTIONS, {
    errorMap: () => ({ message: "Selecione um serviço válido." }),
  }),
  email: z.string().trim().email("Informe um e-mail válido."),
  whatsapp: z
    .string()
    .trim()
    .min(10, "Informe um WhatsApp válido (mínimo 10 dígitos)."),
  cnpj: z.string().trim().min(14, "Informe o CNPJ completo."),
  endereco: z.string().trim().min(3, "Informe o endereço."),
  // Campo mantido no schema/banco por compatibilidade, mas não é mais coletado
  // nos formulários (opcional).
  principais_informacoes_cliente: z.string().trim().optional().or(z.literal("")),
  status: z.enum(STATUS_OPTIONS, {
    errorMap: () => ({ message: "Selecione um status válido." }),
  }),
});

export type ClientFormData = z.infer<typeof clientSchema>;

// Formulário público (o próprio cliente preenche): iguais ao clientSchema,
// porém sem "status" (entra "Novo") e sem "servico" (entra o serviço único
// "Gestão de Tráfego") — ambos definidos automaticamente no servidor.
export const publicClientSchema = clientSchema.omit({
  status: true,
  servico: true,
});
export type PublicClientFormData = z.infer<typeof publicClientSchema>;

// Para atualização (admin/edição): todos os campos opcionais.
export const clientUpdateSchema = clientSchema.partial();
export type ClientUpdateData = z.infer<typeof clientUpdateSchema>;

// ---------- Autenticação ----------
export const signUpSchema = z
  .object({
    name: z.string().trim().min(2, "Informe seu nome completo."),
    email: z.string().trim().email("E-mail inválido."),
    whatsapp: z.string().trim().min(10, "Informe um WhatsApp válido."),
    password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres."),
    confirmPassword: z.string().min(6, "Confirme a senha."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não conferem.",
    path: ["confirmPassword"],
  });

export type SignUpFormData = z.infer<typeof signUpSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido."),
  password: z.string().min(1, "Informe sua senha."),
});

export type LoginFormData = z.infer<typeof loginSchema>;
