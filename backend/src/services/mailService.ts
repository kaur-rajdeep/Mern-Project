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

  private wrapTemplate(title: string, innerHtml: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
        <div style="background-color: #1e3a8a; padding: 16px; border-radius: 6px; text-align: center; color: white;">
          <h2 style="margin: 0; font-size: 20px; letter-spacing: 0.5px;">Panacea Infosec Compliance Portal</h2>
        </div>
        <div style="padding: 24px 8px;">
          <h3 style="color: #1e293b; margin-top: 0; font-size: 18px; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">${title}</h3>
          ${innerHtml}
        </div>
        <div style="text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 14px; margin-top: 16px;">
          &copy; ${new Date().getFullYear()} Panacea Infosec Pvt Ltd. All rights reserved.<br/>
          <span style="font-size: 11px; color: #9ca3af;">This is an automated system notification. Please do not reply directly to this email.</span>
        </div>
      </div>
    `;
  }

  public async sendPasswordResetMail(toEmail: string, fullName: string, temporaryPassword: string): Promise<boolean> {
    try {
      const from = process.env.ADMIN_EMAIL || 'mukul@tekshapers.com';
      const html = this.wrapTemplate(
        'Password Changed!',
        `
        <p>Hello <strong>${fullName}</strong>,</p>
        <p>Your Password has been reset successfully.</p>
        <div style="background-color: #f3f4f6; padding: 14px; border-left: 4px solid #1e3a8a; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 15px;">Your new temporary password is: <strong style="color: #1e3a8a; font-family: monospace; font-size: 16px;">${temporaryPassword}</strong></p>
        </div>
        <p>Please log in using your email and temporary password to access your dashboard.</p>
        `
      );

      const mailOptions = {
        from: `"Panacea Admin" <${from}>`,
        to: toEmail,
        subject: 'Password Retrieve - Panacea Infosec',
        html,
      };

      if (!process.env.SMTP_USER) {
        console.log(`[Mail Simulation] Password reset email simulated for ${toEmail}`);
        return true;
      }

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Failed to send password reset mail:', error);
      return false;
    }
  }

  public async sendAccountWelcomeMail(toEmail: string, fullName: string, temporaryPassword: string, roleName: string): Promise<boolean> {
    try {
      const from = process.env.ADMIN_EMAIL || 'mukul@tekshapers.com';
      const html = this.wrapTemplate(
        'Welcome to Panacea Infosec Portal',
        `
        <p>Hello <strong>${fullName}</strong>,</p>
        <p>An account has been created for you with role: <strong>${roleName}</strong>.</p>
        <div style="background-color: #f3f4f6; padding: 14px; border-left: 4px solid #1e3a8a; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 14px;">Username: <strong>${toEmail}</strong></p>
          <p style="margin: 6px 0 0 0; font-size: 14px;">Temporary Password: <strong style="color: #1e3a8a; font-family: monospace; font-size: 15px;">${temporaryPassword}</strong></p>
        </div>
        <p>Please log in using your credentials to get started.</p>
        `
      );

      const mailOptions = {
        from: `"Panacea Admin" <${from}>`,
        to: toEmail,
        subject: 'Account Activation - Panacea Infosec',
        html,
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

  /**
   * Project Assignment Notification
   */
  public async sendProjectAssignmentMail(
    to: string | string[],
    recipientName: string,
    projectName: string,
    processName: string,
    clientName: string,
    assignedRole: string,
    startDate?: string,
    endDate?: string
  ): Promise<boolean> {
    try {
      const from = process.env.ADMIN_EMAIL || 'mukul@tekshapers.com';
      const toStr = Array.isArray(to) ? to.join(', ') : to;
      if (!toStr) return true;

      const html = this.wrapTemplate(
        'New Project Assignment Notice',
        `
        <p>Hello <strong>${recipientName}</strong>,</p>
        <p>You have been assigned to an audit engagement on the Panacea Portal.</p>
        <div style="background-color: #f8fafc; padding: 14px; border-left: 4px solid #0284c7; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 0 0 6px 0;"><strong>Audit Project:</strong> ${projectName}</p>
          <p style="margin: 0 0 6px 0;"><strong>Customer Organization:</strong> ${clientName}</p>
          <p style="margin: 0 0 6px 0;"><strong>Process Scope:</strong> ${processName}</p>
          <p style="margin: 0 0 6px 0;"><strong>Your Role:</strong> ${assignedRole}</p>
          ${startDate ? `<p style="margin: 0 0 6px 0;"><strong>Engagement Start:</strong> ${startDate}</p>` : ''}
          ${endDate ? `<p style="margin: 0;"><strong>Target Date:</strong> ${endDate}</p>` : ''}
        </div>
        <p>Please log in to your Panacea dashboard to review the project scope and questionnaire requirements.</p>
        `
      );

      const mailOptions = {
        from: `"Panacea Portal" <${from}>`,
        to,
        subject: `Engagement Assignment: ${projectName} - ${clientName}`,
        html,
      };

      if (!process.env.SMTP_USER) {
        console.log(`[Mail Simulation] Project assignment email simulated for ${toStr} (Project: ${projectName})`);
        return true;
      }

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Failed to send project assignment mail:', error);
      return false;
    }
  }

  /**
   * Evidence Upload Submission Notification to Assigned Assessors
   */
  public async sendEvidenceSubmissionMail(
    to: string | string[],
    recipientName: string,
    customerName: string,
    processName: string,
    serviceName: string,
    controlTitle: string,
    fileCount: number
  ): Promise<boolean> {
    try {
      const from = process.env.ADMIN_EMAIL || 'mukul@tekshapers.com';
      const toStr = Array.isArray(to) ? to.join(', ') : to;
      if (!toStr) return true;

      const html = this.wrapTemplate(
        'New Audit Evidence Submitted',
        `
        <p>Hello <strong>${recipientName}</strong>,</p>
        <p>The client has submitted new evidence artifacts for review.</p>
        <div style="background-color: #f8fafc; padding: 14px; border-left: 4px solid #10b981; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 0 0 6px 0;"><strong>Customer:</strong> ${customerName}</p>
          <p style="margin: 0 0 6px 0;"><strong>Process:</strong> ${processName}</p>
          <p style="margin: 0 0 6px 0;"><strong>Service:</strong> ${serviceName}</p>
          <p style="margin: 0 0 6px 0;"><strong>Requirement / Control:</strong> ${controlTitle}</p>
          <p style="margin: 0;"><strong>Files Uploaded:</strong> ${fileCount} artifact(s)</p>
        </div>
        <p>Please log in to your assessor dashboard to inspect and validate the submitted workpapers.</p>
        `
      );

      const mailOptions = {
        from: `"Panacea Portal" <${from}>`,
        to,
        subject: `New Evidence Submitted: ${customerName} (${serviceName})`,
        html,
      };

      if (!process.env.SMTP_USER) {
        console.log(`[Mail Simulation] Evidence submission email simulated for ${toStr} (Client: ${customerName})`);
        return true;
      }

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Failed to send evidence submission mail:', error);
      return false;
    }
  }

  /**
   * Evidence Review Status Update (Disapproved or Incomplete only - never Approved)
   * Supports joint common email to Customer, QSA, and Consultants.
   */
  public async sendReviewStatusMail(
    to: string | string[],
    recipientNames: string,
    processName: string,
    serviceName: string,
    controlTitle: string,
    statusText: string,
    reviewerRole: string,
    reviewerName: string,
    comments?: string
  ): Promise<boolean> {
    try {
      const from = process.env.ADMIN_EMAIL || 'mukul@tekshapers.com';
      const toStr = Array.isArray(to) ? to.join(', ') : to;
      if (!toStr) return true;

      const isDisapproved = statusText.toLowerCase().includes('disapproved') || statusText.toLowerCase().includes('rejected');
      const bannerColor = isDisapproved ? '#ef4444' : '#f59e0b';

      const html = this.wrapTemplate(
        `Audit Finding: Action Required (${statusText})`,
        `
        <p>Hello <strong>${recipientNames}</strong>,</p>
        <p>An audit finding has been recorded for the following compliance requirement by <strong>${reviewerRole} (${reviewerName})</strong>:</p>
        <div style="background-color: #f8fafc; padding: 14px; border-left: 4px solid ${bannerColor}; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 0 0 6px 0;"><strong>Process:</strong> ${processName}</p>
          <p style="margin: 0 0 6px 0;"><strong>Service:</strong> ${serviceName}</p>
          <p style="margin: 0 0 6px 0;"><strong>Requirement / Control:</strong> ${controlTitle}</p>
          <p style="margin: 0 0 6px 0;"><strong>Finding Status:</strong> <span style="color: ${bannerColor}; font-weight: bold;">${statusText}</span></p>
          ${comments ? `<p style="margin: 8px 0 0 0; background: #ffffff; padding: 10px; border-radius: 4px; border: 1px solid #e2e8f0;"><strong>Auditor Remarks:</strong> ${comments}</p>` : ''}
        </div>
        <p>Action is required. Please access the Panacea Portal to provide the necessary remediation, clarification, or updated evidence documents.</p>
        `
      );

      const mailOptions = {
        from: `"Panacea Audit Team" <${from}>`,
        to,
        subject: `Audit Action Required [${statusText}]: ${serviceName} - ${processName}`,
        html,
      };

      if (!process.env.SMTP_USER) {
        console.log(`[Mail Simulation] Common review status email simulated for [${toStr}] - Status: ${statusText}`);
        return true;
      }

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Failed to send review status mail:', error);
      return false;
    }
  }

  /**
   * Audit Comment / Communication Query Notification
   */
  public async sendAuditCommentMail(
    to: string | string[],
    recipientName: string,
    authorName: string,
    authorRole: string,
    processName: string,
    serviceName: string,
    controlTitle: string,
    commentText: string
  ): Promise<boolean> {
    try {
      const from = process.env.ADMIN_EMAIL || 'mukul@tekshapers.com';
      const toStr = Array.isArray(to) ? to.join(', ') : to;
      if (!toStr) return true;

      const html = this.wrapTemplate(
        'New Audit Comment / Query Posted',
        `
        <p>Hello <strong>${recipientName}</strong>,</p>
        <p><strong>${authorName}</strong> (${authorRole}) posted a comment on a compliance requirement:</p>
        <div style="background-color: #f8fafc; padding: 14px; border-left: 4px solid #6366f1; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 0 0 6px 0;"><strong>Process:</strong> ${processName}</p>
          <p style="margin: 0 0 6px 0;"><strong>Service:</strong> ${serviceName}</p>
          <p style="margin: 0 0 6px 0;"><strong>Requirement / Control:</strong> ${controlTitle}</p>
          <div style="margin-top: 10px; background: #ffffff; padding: 12px; border-radius: 4px; border: 1px solid #e2e8f0;">
            <p style="margin: 0; font-style: italic; color: #334155;">"${commentText}"</p>
          </div>
        </div>
        <p>You can reply directly within the Panacea compliance matrix audit view.</p>
        `
      );

      const mailOptions = {
        from: `"Panacea Portal" <${from}>`,
        to,
        subject: `New Comment: ${serviceName} (${authorRole} - ${authorName})`,
        html,
      };

      if (!process.env.SMTP_USER) {
        console.log(`[Mail Simulation] Audit comment email simulated for ${toStr} by ${authorName}`);
        return true;
      }

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Failed to send audit comment mail:', error);
      return false;
    }
  }

  /**
   * Compliance Report (ROC / AOC) Upload Notification to Customer
   */
  public async sendComplianceReportUploadedMail(
    to: string | string[],
    customerName: string,
    reportType: string,
    processName: string,
    serviceName: string,
    year: number | string
  ): Promise<boolean> {
    try {
      const from = process.env.ADMIN_EMAIL || 'mukul@tekshapers.com';
      const toStr = Array.isArray(to) ? to.join(', ') : to;
      if (!toStr) return true;

      const html = this.wrapTemplate(
        'Compliance Report Available for Download',
        `
        <p>Hello <strong>${customerName}</strong>,</p>
        <p>We are pleased to inform you that your official <strong>${reportType}</strong> Compliance Report has been issued and uploaded to the portal.</p>
        <div style="background-color: #f8fafc; padding: 14px; border-left: 4px solid #10b981; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 0 0 6px 0;"><strong>Report Type:</strong> ${reportType}</p>
          <p style="margin: 0 0 6px 0;"><strong>Assessment Year:</strong> ${year}</p>
          <p style="margin: 0 0 6px 0;"><strong>Process Scope:</strong> ${processName}</p>
          <p style="margin: 0;"><strong>Compliance Standard:</strong> ${serviceName}</p>
        </div>
        <p>Your authorized personnel can access and download this verified document from the Compliance Reports section in your dashboard.</p>
        `
      );

      const mailOptions = {
        from: `"Panacea Infosec Assurance" <${from}>`,
        to,
        subject: `Compliance Report Released (${reportType}): ${processName} - ${year}`,
        html,
      };

      if (!process.env.SMTP_USER) {
        console.log(`[Mail Simulation] Compliance report uploaded email simulated for ${toStr} (${reportType})`);
        return true;
      }

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Failed to send compliance report mail:', error);
      return false;
    }
  }

  /**
   * Security Audit Alert for Bulk Evidence Export
   */
  public async sendSecurityAlertMail(
    to: string | string[],
    alertTitle: string,
    details: {
      requesterName: string;
      requesterEmail: string;
      requesterRole: string;
      targetCustomer: string;
      processName: string;
      ipAddress: string;
      fileCount: number;
    }
  ): Promise<boolean> {
    try {
      const from = process.env.ADMIN_EMAIL || 'mukul@tekshapers.com';
      const toStr = Array.isArray(to) ? to.join(', ') : to;
      if (!toStr) return true;

      const html = this.wrapTemplate(
        `Security Notice: ${alertTitle}`,
        `
        <p>Security Audit Oversight Notification:</p>
        <p>A full compliance evidence package export has been executed.</p>
        <div style="background-color: #fff1f2; padding: 14px; border-left: 4px solid #e11d48; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 0 0 6px 0;"><strong>Exported By:</strong> ${details.requesterName} (${details.requesterEmail})</p>
          <p style="margin: 0 0 6px 0;"><strong>Role:</strong> ${details.requesterRole}</p>
          <p style="margin: 0 0 6px 0;"><strong>Target Client:</strong> ${details.targetCustomer}</p>
          <p style="margin: 0 0 6px 0;"><strong>Process Scope:</strong> ${details.processName}</p>
          <p style="margin: 0 0 6px 0;"><strong>Total Files Bundled:</strong> ${details.fileCount}</p>
          <p style="margin: 0 0 6px 0;"><strong>Origin IP Address:</strong> ${details.ipAddress}</p>
          <p style="margin: 0;"><strong>Timestamp:</strong> ${new Date().toUTCString()}</p>
        </div>
        <p>This export event is logged in the permanent Panacea Evidence Download Audit Vault.</p>
        `
      );

      const mailOptions = {
        from: `"Panacea Security Vault" <${from}>`,
        to,
        subject: `[SECURITY AUDIT] Evidence Package Export: ${details.targetCustomer}`,
        html,
      };

      if (!process.env.SMTP_USER) {
        console.log(`[Mail Simulation] Security alert email simulated for ${toStr} - Requester: ${details.requesterEmail}`);
        return true;
      }

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Failed to send security alert mail:', error);
      return false;
    }
  }
}

export const mailService = new MailService();
