import { useEffect, useState } from "react";
import { ArrowRight, Bot, Loader2, Lock, Mail, Sparkles, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { activeProduct, productMode } from "@/config/products";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { passwordValidationError } from "@/lib/password";

export default function Auth() {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const isSchool = productMode === "escola-agentes";
  const BrandIcon = isSchool ? Bot : Sparkles;

  useEffect(() => {
    if (!authLoading && session) navigate("/", { replace: true });
  }, [session, authLoading, navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isLogin) {
      const passwordError = passwordValidationError(password);
      if (passwordError) {
        toast.error(passwordError);
        return;
      }
    }

    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vinda de volta!");
        navigate("/", { replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Conta criada com sucesso!");
          navigate("/", { replace: true });
        } else {
          toast.success("Conta criada. Confirme o acesso no e-mail para entrar.");
          setIsLogin(true);
          setPassword("");
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao autenticar.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.includes("@")) {
      toast.error("Informe seu e-mail para recuperar a senha.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/perfil`,
      });
      if (error) throw error;
      toast.success("Enviamos as instruções de recuperação para seu e-mail.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar a recuperação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-lg gradient-hero">
            <BrandIcon className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{activeProduct.appName}</h1>
          <p className="text-sm text-muted-foreground">
            {isSchool ? "Seu time de assistentes para o dia a dia do ateliê" : activeProduct.description}
          </p>
        </div>

        <Card className="rounded-lg border-border/60">
          <CardContent className="space-y-5 p-6">
            <form onSubmit={handleSubmit} className="space-y-3">
              {!isLogin && (
                <div className="relative">
                  <User className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Seu nome"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="h-11 pl-9"
                    required
                  />
                </div>
              )}
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="E-mail"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-11 pl-9"
                  autoComplete="email"
                  required
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Senha"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-11 pl-9"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  minLength={isLogin ? 6 : 8}
                  required
                />
              </div>

              {isLogin && (
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  disabled={loading}
                  className="block text-xs font-medium text-primary hover:underline disabled:opacity-50"
                >
                  Esqueci minha senha
                </button>
              )}

              <Button type="submit" className="h-11 w-full gap-2" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                  <>
                    {isLogin ? "Entrar" : "Criar conta"}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              {isLogin ? "Ainda não tem conta?" : "Já tem uma conta?"}{" "}
              <button type="button" onClick={() => setIsLogin((value) => !value)} className="font-medium text-primary hover:underline">
                {isLogin ? "Criar conta" : "Entrar"}
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
