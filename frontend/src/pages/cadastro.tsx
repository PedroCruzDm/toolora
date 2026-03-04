
export default function Cadastro() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-100">
			<div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
				<h2 className="mb-6 text-2xl font-bold text-center">Criar Conta</h2>
				<form className="space-y-5">
					<div>
						<label htmlFor="nome" className="block mb-1 font-medium">Nome</label>
						<input
							type="text"
							id="nome"
							className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
							placeholder="Seu nome completo"
							autoComplete="name"
						/>
					</div>
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
							placeholder="Crie uma senha"
							autoComplete="new-password"
						/>
					</div>
					<button
						type="submit"
						className="w-full rounded bg-blue-600 py-2 font-semibold text-white hover:bg-blue-700 transition"
						disabled
					>
						Criar Conta
					</button>
				</form>
				<p className="mt-4 text-center text-sm text-gray-600">
					Já tem uma conta? <a href="/login" className="text-blue-600 hover:underline">Entrar</a>
				</p>
			</div>
		</div>
	);
}
