


export default function Login() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-100">
			<div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
				<h2 className="mb-6 text-2xl font-bold text-center">Entrar</h2>
				<form className="space-y-5">
					<div>
						<label htmlFor="email" className="block mb-1 font-medium">Email</label>
						<input
							type="email"
							id="email"
							className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
							placeholder="seu@email.com"
							autoComplete="email"
						/>
					</div>
					<div>
						<label htmlFor="senha" className="block mb-1 font-medium">Senha</label>
						<input
							type="password"
							id="senha"
							className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
							placeholder="Sua senha"
							autoComplete="current-password"
						/>
					</div>
					<button
						type="submit"
						className="w-full rounded bg-blue-600 py-2 font-semibold text-white hover:bg-blue-700 transition"
						disabled
					>
						Entrar
					</button>
				</form>
				<p className="mt-4 text-center text-sm text-gray-600">
					Não tem uma conta? <a href="/cadastro" className="text-blue-600 hover:underline">Criar conta</a>
				</p>
			</div>
		</div>
	);
}
