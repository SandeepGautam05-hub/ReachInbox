import nodemailer from 'nodemailer';

interface SendMailParams {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

interface SendMailResult {
  messageId: string;
  previewUrl: string | false;
  response: string;
}

class SmtpService {
  private transporter: nodemailer.Transporter | null = null;
  private etherealAccount: any = null;

  async initTransporter(): Promise<nodemailer.Transporter> {
    if (this.transporter) return this.transporter;

    try {
      this.etherealAccount = await nodemailer.createTestAccount();
      console.log('[SMTP] Created Ethereal test account:', this.etherealAccount.user);

      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: this.etherealAccount.user,
          pass: this.etherealAccount.pass,
        },
      });

      return this.transporter;
    } catch (err: any) {
      console.error('[SMTP] Failed to initialize Ethereal transport:', err.message);
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: {
          user: 'reachinbox.test@ethereal.email',
          pass: 'fake_pass_demo',
        },
      });
      return this.transporter;
    }
  }

  async sendEmail(params: SendMailParams): Promise<SendMailResult> {
    const transporter = await this.initTransporter();

    const info = await transporter.sendMail({
      from: `"${params.from.split('@')[0]}" <${params.from}>`,
      to: params.to,
      subject: params.subject,
      text: params.text || params.html?.replace(/<[^>]*>?/gm, ''),
      html: params.html || `<p>${params.text}</p>`,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`[SMTP] Email sent to ${params.to}! Preview URL: ${previewUrl || 'N/A'}`);

    return {
      messageId: info.messageId,
      previewUrl: previewUrl || false,
      response: info.response || '250 OK',
    };
  }
}

export const smtpService = new SmtpService();
