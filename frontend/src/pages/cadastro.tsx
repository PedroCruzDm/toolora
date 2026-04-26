
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
		<div className="flex min-h-screen items-center justify-center bg-gray-100">
			<div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
				<h2 className="mb-6 text-center text-2xl font-bold">Criar Conta</h2>
				<form className="space-y-5" onSubmit={onSubmit}>
					<div>
						<label htmlFor="nome" className="mb-1 block font-medium">Nome</label>
						<input
							type="text"
							id="nome"
							value={name}
							onChange={(event) => setName(event.target.value)}
							className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
							placeholder="Seu nome completo"
							autoComplete="name"
						/>
					</div>
					<div>
						<label htmlFor="email" className="mb-1 block font-medium">Email</label>
						<input
							type="email"
							id="email"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
							placeholder="seu@email.com"
							autoComplete="email"
						/>
					</div>
					<div>
						<label htmlFor="senha" className="mb-1 block font-medium">Senha</label>
						<input
							type="password"
							id="senha"
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
							placeholder="Crie uma senha"
							autoComplete="new-password"
						/>
					</div>
					<button
						type="submit"
						className="w-full rounded bg-blue-600 py-2 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
						disabled={isSubmitting}
					>
						{isSubmitting ? "Criando conta..." : "Criar Conta"}
					</button>
				</form>
				<p className="mt-4 text-center text-sm text-gray-600">
					Já tem uma conta? <Link to="/login" className="text-blue-600 hover:underline">Entrar</Link>
				</p>
			</div>
		</div>
	);
}
