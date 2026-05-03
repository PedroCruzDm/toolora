import nodemailer from 'nodemailer';

type PasswordResetEmailInput = {
  to: string;
  name: string;
  code: string;
  resetUrl: string;
  expiresInMinutes: number;
};

const getSmtpConfig = () => {
  const host = process.env.SMTP_HOST?.trim();
  const portRaw = process.env.SMTP_PORT?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = process.env.SMTP_FROM?.trim() || 'Toolora <no-reply@toolora.com.br>';

  if (!host || !portRaw || !user || !pass) {
    throw new Error('SMTP não configurado. Defina SMTP_HOST, SMTP_PORT, SMTP_USER e SMTP_PASS.');
  }

  const port = Number(portRaw);
  if (Number.isNaN(port) || port <= 0) {
    throw new Error('SMTP_PORT inválido.');
  }

  return { host, port, user, pass, from };
};

const buildPasswordResetMessage = ({ name, code, resetUrl, expiresInMinutes }: PasswordResetEmailInput) => ({
  subject: 'Toolora - código de recuperação de senha',
  text: [
    `Olá, ${name}.`,
    '',
    'Recebemos uma solicitação para redefinir sua senha na Toolora.',
    `Seu código de verificação é: ${code}`,
    `Este código expira em ${expiresInMinutes} minutos.`,
    '',
    `Abra este link para concluir a redefinição: ${resetUrl}`,
    '',
    'Se você não solicitou isso, pode ignorar este email.',
  ].join('\n'),
  html: `
    <div style="font-family:Arial,sans-serif;background:#0b1020;color:#e5eefb;padding:24px;border-radius:16px;max-width:640px;margin:0 auto;">
      <h1 style="margin:0 0 16px;font-size:24px;">Recuperação de senha Toolora</h1>
      <p style="margin:0 0 12px;line-height:1.5;">Olá, <strong>${name}</strong>.</p>
      <p style="margin:0 0 12px;line-height:1.5;">Recebemos uma solicitação para redefinir sua senha na Toolora.</p>
      <p style="margin:20px 0 8px;line-height:1.5;">Seu código de verificação é:</p>
      <div style="display:inline-block;background:#121a33;border:1px solid #27314f;border-radius:12px;padding:14px 18px;font-size:24px;font-weight:700;letter-spacing:4px;color:#ffffff;">${code}</div>
      <p style="margin:16px 0 12px;line-height:1.5;">Este código expira em <strong>${expiresInMinutes} minutos</strong>.</p>
      <p style="margin:0 0 18px;line-height:1.5;">Você também pode abrir este link para concluir a redefinição:</p>
      <p style="margin:0 0 18px;word-break:break-all;"><a href="${resetUrl}" style="color:#9f7aea;text-decoration:none;">${resetUrl}</a></p>
      <p style="margin:0;line-height:1.5;color:#aeb9d6;">Se você não solicitou isso, ignore este email.</p>
    </div>
  `,
});

export const sendPasswordResetEmail = async (input: PasswordResetEmailInput) => {
  const smtp = getSmtpConfig();
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
  });

  await transporter.sendMail({
    from: smtp.from,
    to: input.to,
    subject: buildPasswordResetMessage(input).subject,
    text: buildPasswordResetMessage(input).text,
    html: buildPasswordResetMessage(input).html,
  });
};
