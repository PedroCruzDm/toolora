import 'dotenv/config';
import { getMongoDb } from '../config/mongo';
import { decrypt, encrypt, hashForLookup, isEncrypted } from '../services/encryption.service';

const migrateUsers = async () => {
  const db = await getMongoDb();
  const users = db.collection('users');
  let migrated = 0;

  for await (const user of users.find({})) {
    const email = decrypt(user.email_encrypted ?? user.email);
    const name = decrypt(user.username_encrypted ?? user.username);
    const profileImage = decrypt(user.profile_image_encrypted ?? user.profile_image);
    const banReason = decrypt(user.ban_reason_encrypted ?? user.ban_reason);

    if (!email || !name) continue;
    if (isEncrypted(user.email_encrypted) && isEncrypted(user.username_encrypted)) continue;

    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          email_encrypted: encrypt(email),
          email_hash: hashForLookup(email),
          username_encrypted: encrypt(name),
          profile_image_encrypted: encrypt(profileImage),
          ban_reason_encrypted: encrypt(banReason),
        },
        $unset: {
          email: '',
          username: '',
          profile_image: '',
          ban_reason: '',
        },
      }
    );
    migrated += 1;
  }

  return migrated;
};

const migrateTools = async () => {
  const db = await getMongoDb();
  const tools = db.collection('tools');
  let migrated = 0;

  for await (const tool of tools.find({})) {
    if (isEncrypted(tool.nameEncrypted)) continue;

    await tools.updateOne(
      { _id: tool._id },
      {
        $set: {
          nameEncrypted: encrypt(String(tool.name ?? '')),
          descriptionEncrypted: encrypt(String(tool.description ?? '')),
          screenshotEncrypted: encrypt(tool.screenshot ?? null),
          urlEncrypted: encrypt(String(tool.url ?? '')),
          categoryEncrypted: encrypt(String(tool.category ?? '')),
          tagsEncrypted: encrypt(JSON.stringify(tool.tags ?? [])),
        },
        $unset: {
          name: '',
          description: '',
          screenshot: '',
          url: '',
          category: '',
          tags: '',
        },
      }
    );
    migrated += 1;
  }

  return migrated;
};

const migrateMessages = async () => {
  const db = await getMongoDb();
  const messages = db.collection('user_messages');
  let migrated = 0;

  for await (const message of messages.find({})) {
    if (isEncrypted(message.message_encrypted)) continue;

    await messages.updateOne(
      { _id: message._id },
      {
        $set: { message_encrypted: encrypt(String(message.message ?? '')) },
        $unset: { message: '' },
      }
    );
    migrated += 1;
  }

  return migrated;
};

const main = async () => {
  const [users, tools, messages] = await Promise.all([
    migrateUsers(),
    migrateTools(),
    migrateMessages(),
  ]);

  console.log(`Migração concluída: ${users} usuários, ${tools} ferramentas e ${messages} mensagens.`);
  process.exit(0);
};

main().catch((error) => {
  console.error('Falha na migração de criptografia:', error);
  process.exit(1);
});
