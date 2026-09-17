import nodemailer from 'nodemailer';

export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    });
  }

  public async sendPasswordResetMail(toEmail: string, fullName: string, temporaryPassword: string): Promise<boolean> {
    try {
      const from = process.env.ADMIN_EMAIL || 'mukul@tekshapers.com';
      const mailOptions = {
        from: `"Panacea Admin" <${from}>`,
        to: toEmail,
        subject: 'Password Retrieve',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <div style="background-color: #1e3a8a; padding: 15px; border-radius: 6px; text-align: center; color: white;">
              <h2>Panacea Infosec Compliance Portal</h2>
            </div>
            <div style="padding: 20px 0;">
              <h3>Password Changed !</h3>
              <p>Hello <strong>${fullName}</strong>,</p>
              <p>Your Password has been reset successfully.</p>
              <div style="background-color: #f3f4f6; padding: 12px; border-left: 4px solid #1e3a8a; margin: 15px 0;">
                <p style="margin: 0; font-size: 16px;">Your new temporary password is: <strong style="color: #1e3a8a;">${temporaryPassword}</strong></p>
              </div>
              <p>Please log in using your email and temporary password to access your dashboard.</p>
            </div>
            <div style="text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 10px;">
              &copy; ${new Date().getFullYear()} Panacea Infosec. All rights reserved.
            </div>
          </div>
        `,
      };

      if (!process.env.SMTP_USER) {
        console.log(`[Mail Simulation] Password reset email simulated for ${toEmail}`);
        return true;
      }

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Failed to send mail:', error);
      return false;
    }
  }

  public async sendAccountWelcomeMail(toEmail: string, fullName: string, temporaryPassword: string, roleName: string): Promise<boolean> {
    try {
      const from = process.env.ADMIN_EMAIL || 'mukul@tekshapers.com';
      const mailOptions = {
        from: `"Panacea Admin" <${from}>`,
        to: toEmail,
        subject: 'Account Activation - Panacea Infosec',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <div style="background-color: #1e3a8a; padding: 15px; border-radius: 6px; text-align: center; color: white;">
              <h2>Panacea Infosec Compliance Portal</h2>
            </div>
            <div style="padding: 20px 0;">
              <h3>Welcome to Panacea Infosec Portal</h3>
              <p>Hello <strong>${fullName}</strong>,</p>
              <p>An account has been created for you with role: <strong>${roleName}</strong>.</p>
              <div style="background-color: #f3f4f6; padding: 12px; border-left: 4px solid #1e3a8a; margin: 15px 0;">
                <p style="margin: 0;">Username: <strong>${toEmail}</strong></p>
                <p style="margin: 5px 0 0 0;">Temporary Password: <strong style="color: #1e3a8a;">${temporaryPassword}</strong></p>
              </div>
              <p>Please log in using your credentials to get started.</p>
            </div>
            <div style="text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 10px;">
              &copy; ${new Date().getFullYear()} Panacea Infosec. All rights reserved.
            </div>
          </div>
        `,
      };

      if (!process.env.SMTP_USER) {
        console.log(`[Mail Simulation] Welcome email simulated for ${toEmail}: Role: ${roleName}`);
        return true;
      }

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Failed to send welcome mail:', error);
      return false;
    }
  }
}

export const mailService = new MailService();
