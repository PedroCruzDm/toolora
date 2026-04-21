import 'dotenv/config';
import bcrypt from 'bcryptjs';
import pool from '../config/db';

async function main() {
  const name = process.env.ADMIN_NAME;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  // Two-part secret check blocks accidental or unauthorized execution.
  const requiredSecret = process.env.ADMIN_BOOTSTRAP_SECRET;
  const providedSecret = process.env.ADMIN_BOOTSTRAP_SECRET_INPUT;

  if (!requiredSecret || !providedSecret || requiredSecret !== providedSecret) {
    throw new Error('Bootstrap bloqueado: defina ADMIN_BOOTSTRAP_SECRET e ADMIN_BOOTSTRAP_SECRET_INPUT com o mesmo valor.');
  }

  if (!name || !email || !password) {
    throw new Error('Defina ADMIN_NAME, ADMIN_EMAIL e ADMIN_PASSWORD no ambiente antes de executar o bootstrap.');
  }

  if (password.length < 12) {
    throw new Error('ADMIN_PASSWORD deve ter pelo menos 12 caracteres.');
  }

  const [columnRows] = await pool.execute(
    `SELECT COUNT(*) AS count
     FROM information_schema.columns
     WHERE table_schema = ?
       AND table_name = 'users'
       AND column_name = 'is_admin'`,
    [process.env.DB_NAME]
  );

  const hasIsAdminColumn = Array.isArray(columnRows) && Number((columnRows[0] as any).count) > 0;

  if (!hasIsAdminColumn) {
    await pool.execute('ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT FALSE');
  }

  const [rows] = await pool.execute(
    'SELECT id, is_admin FROM users WHERE email = ? LIMIT 1',
    [email]
  );

  const existing = Array.isArray(rows) && rows.length > 0 ? (rows[0] as any) : null;

  if (existing?.is_admin) {
    console.log('Conta admin já existe para este email. Nenhuma alteração foi feita.');
    await pool.end();
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  if (existing) {
    await pool.execute(
      'UPDATE users SET username = ?, password = ?, is_admin = TRUE WHERE id = ?',
      [name, hashedPassword, existing.id]
    );
    console.log('Usuário existente promovido a admin com senha atualizada.');
  } else {
    await pool.execute(
      'INSERT INTO users (username, email, password, is_admin) VALUES (?, ?, ?, TRUE)',
      [name, email, hashedPassword]
    );
    console.log('Conta admin criada com sucesso.');
  }

  await pool.end();
}

main().catch(async (error) => {
  console.error('Falha ao criar admin:', (error as Error).message);
  await pool.end();
  process.exit(1);
});
