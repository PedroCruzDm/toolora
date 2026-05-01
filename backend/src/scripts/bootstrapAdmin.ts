import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { getMongoDb } from '../config/mongo';

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

  try {
    const db = await getMongoDb();
    const users = db.collection('users');

    const existing = await users.findOne({ email });

    if (existing?.is_owner) {
      console.log('Conta admin já existe para este email. Nenhuma alteração foi feita.');
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    if (existing) {
      await users.updateOne(
        { _id: existing._id },
        {
          $set: {
            username: name,
            password: hashedPassword,
            is_owner: true,
            is_admin: true,
            is_moderator: false,
            is_banned: false,
          }
        }
      );
      console.log('Usuário existente promovido a admin com senha atualizada.');
    } else {
      await users.insertOne({
        username: name,
        email,
        password: hashedPassword,
        is_owner: true,
        is_admin: true,
        is_moderator: false,
        is_banned: false,
        ban_reason: null,
        banned_at: null,
        profile_image: null,
        created_at: new Date(),
      });
      console.log('Conta admin criada com sucesso.');
    }
  } catch (error) {
    console.error('Falha ao criar admin:', (error as Error).message);
    process.exit(1);
  }
}

main();