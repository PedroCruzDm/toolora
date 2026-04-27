
import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import api from "@/services/api";

type RegisterResponse = {
	token: string;
	user: {
		id: number;
		name: string;
		email: string;
		profileImage?: string | null;
	};
};

export default function Cadastro() {
	const navigate = useNavigate();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (!name.trim() || !email.trim() || !password.trim()) {
			toast.error("Preencha nome, email e senha para continuar.");
			return;
		}

		setIsSubmitting(true);
		try {
			const response = await api.post<RegisterResponse>("/auth/register", {
				name: name.trim(),
				email: email.trim(),
				password,
			});

			localStorage.setItem("token", response.data.token);
			localStorage.setItem("user", JSON.stringify(response.data.user));
			toast.success("Conta criada com sucesso!");
			navigate("/");
		} catch (error) {
			const message = axios.isAxiosError(error)
				? error.response?.data?.error ?? "Não foi possível criar a conta agora."
				: "Não foi possível criar a conta agora.";
			toast.error(message);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="relative min-h-screen overflow-hidden bg-background px-4 pb-16 pt-36 text-foreground">
			<div className="pointer-events-none absolute -top-28 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
			<div className="pointer-events-none absolute bottom-0 left-0 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

			<div className="mx-auto w-full max-w-5xl">
				<div className="mb-10 text-center">
					<h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">Crie sua conta Toolora</h1>
					<p className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground md:text-lg">
						Entre para a comunidade e descubra ferramentas que aceleram seu trabalho.
					</p>
				</div>

				<div className="mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-xl sm:p-10">
					<div className="mb-8 text-center">
						<p className="mb-3 inline-flex items-center rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
							Novo acesso
						</p>
						<h2 className="text-3xl font-black tracking-tight text-foreground">Criar Conta</h2>
						<p className="mt-2 text-sm text-muted-foreground">Cadastre-se para compartilhar ferramentas e acompanhar sua conta.</p>
					</div>

					<form className="space-y-5" onSubmit={onSubmit}>
					<div>
						<label htmlFor="nome" className="mb-2 block text-sm font-semibold text-foreground">Nome</label>
						<input
							type="text"
							id="nome"
							value={name}
							onChange={(event) => setName(event.target.value)}
							className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/20"
							placeholder="Seu nome completo"
							autoComplete="name"
						/>
					</div>
					<div>
						<label htmlFor="email" className="mb-2 block text-sm font-semibold text-foreground">Email</label>
						<input
							type="email"
							id="email"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/20"
							placeholder="seu@email.com"
							autoComplete="email"
						/>
					</div>
					<div>
						<label htmlFor="senha" className="mb-2 block text-sm font-semibold text-foreground">Senha</label>
						<input
							type="password"
							id="senha"
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/20"
							placeholder="Crie uma senha"
							autoComplete="new-password"
						/>
					</div>
					<button
						type="submit"
						className="w-full rounded-2xl bg-primary py-3 font-semibold text-primary-foreground shadow-lg transition hover:scale-[1.01] hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
						disabled={isSubmitting}
					>
						{isSubmitting ? "Criando conta..." : "Criar Conta"}
					</button>
					</form>

					<p className="mt-6 text-center text-sm text-muted-foreground">
						Já tem uma conta? <Link to="/login" className="font-semibold text-primary hover:underline">Entrar</Link>
					</p>
				</div>
			</div>
		</div>
	);
}
