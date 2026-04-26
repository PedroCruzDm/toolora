
import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import api from "@/services/api";

type LoginResponse = {
	token: string;
	user: {
		id: number;
		name: string;
		email: string;
		isAdmin?: boolean;
		profileImage?: string | null;
	};
};

export default function Login() {
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (!email.trim() || !password.trim()) {
			toast.error("Preencha email e senha para continuar.");
			return;
		}

		setIsSubmitting(true);
		try {
			const response = await api.post<LoginResponse>("/auth/login", {
				email: email.trim(),
				password,
			});

			localStorage.setItem("token", response.data.token);
			localStorage.setItem("user", JSON.stringify(response.data.user));
			toast.success("Login realizado com sucesso!");
			navigate("/");
		} catch (error) {
			const message = axios.isAxiosError(error)
				? error.response?.data?.error ?? "Não foi possível fazer login agora."
				: "Não foi possível fazer login agora.";
			toast.error(message);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-100">
			<div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
				<h2 className="mb-6 text-center text-2xl font-bold text-gray-900">Entrar</h2>
				<form className="space-y-5" onSubmit={onSubmit}>
					<div>
						<label htmlFor="email" className="mb-1 block font-medium text-gray-800">Email</label>
						<input
							type="email"
							id="email"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none"
							placeholder="seu@email.com"
							autoComplete="email"
						/>
					</div>
					<div>
						<label htmlFor="senha" className="mb-1 block font-medium text-gray-800">Senha</label>
						<input
							type="password"
							id="senha"
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none"
							placeholder="Sua senha"
							autoComplete="current-password"
						/>
					</div>
					<button
						type="submit"
						className="w-full rounded bg-blue-600 py-2 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
						disabled={isSubmitting}
					>
						{isSubmitting ? "Entrando..." : "Entrar"}
					</button>
				</form>
				<p className="mt-4 text-center text-sm text-gray-600">
					Não tem uma conta? <Link to="/cadastro" className="text-blue-600 hover:underline">Criar conta</Link>
				</p>
			</div>
		</div>
	);
}
