import { Platform } from 'react-native';
import { EmailTemplates } from './emailTemplates';

/**
 * Utility functions for sending notifications via email
 */
export const NotificationService = {
  /**
   * Send an email notification
   * @param to Recipient email address
   * @param subject Email subject
   * @param text Plain text content (optional if html is provided)
   * @param html HTML content (optional if text is provided)
   * @param attachment Optional attachment
   * @returns Promise with the result of the email sending operation
   */

  sendEmail: async (
    to: string,
    subject: string,
    text?: string,
    html?: string,
    attachment?: any
  ): Promise<{ success: boolean; messageId?: string; error?: string }> => {
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

      const apiUrl = `${supabaseUrl}/functions/v1/send-email`;

      console.log('Sending email to:', to);
      console.log('Subject:', subject);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          to,
          subject,
          text,
          html,
          attachment,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response from email API:', errorText);
        return {
          success: false,
          error: `API responded with status ${response.status}: ${errorText}`
        };
      }

      const result = await response.json();

      console.log('Email sent successfully:', result);
      return {
        success: true,
        messageId: result.messageId
      };
    } catch (error: any) {
      console.error('Error in sendEmail:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  },

  sendWelcomeEmail: async (email: string, name: string, activationLink?: string): Promise<void> => {
    const subject = '¡Confirma tu cuenta en DogCatiFy!';
    const text = `Hola ${name},\n\n¡Bienvenido a DogCatiFy!\n\nPara completar tu registro, por favor confirma tu correo electrónico haciendo clic en el enlace que te enviamos por separado.\n\nSi no ves el correo, revisa tu carpeta de spam.\n\nGracias por unirte a nuestra comunidad.\n\nEl equipo de DogCatiFy`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #2D6A6F; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 10px 0;">¡Bienvenido a DogCatiFy!</h1>
        </div>
        <div style="padding: 20px; background-color: #f9f9f9;">
          <p>Hola <strong>${name}</strong>,</p>
          <p>¡Gracias por registrarte en DogCatiFy!</p>
          <p>Para completar tu registro y acceder a todas las funciones, necesitas confirmar tu correo electrónico.</p>
          <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0;">
            <p><strong>📧 Revisa tu bandeja de entrada</strong></p>
            <p>Te hemos enviado un correo de confirmación. Haz clic en el enlace para activar tu cuenta.</p>
            <p>Si no ves el correo, revisa tu carpeta de spam.</p>
          </div>
          <p>Una vez confirmado tu email, podrás:</p>
          <ul>
            <li>Crear perfiles para tus mascotas</li>
            <li>Conectar con otros dueños de mascotas</li>
            <li>Encontrar servicios para tus compañeros peludos</li>
            <li>Compartir momentos especiales con la comunidad</li>
          </ul>
          <p>¡Esperamos verte pronto en DogCatiFy!</p>
          <p>El equipo de DogCatiFy</p>
        </div>
        <div style="background-color: #f0f0f0; padding: 10px; text-align: center; font-size: 12px; color: #666;">
          <p>© 2025 DogCatiFy. Todos los derechos reservados.</p>
        </div>
      </div>
    `;

    await NotificationService.sendEmail(email, subject, text, html);
  },

  sendBookingConfirmationEmail: async (
    email: string,
    name: string,
    serviceName: string,
    partnerName: string,
    date: string,
    time: string,
    petName: string
  ): Promise<void> => {
    const subject = 'Confirmación de Reserva - DogCatiFy';
    const text = `Hola ${name},\n\nTu reserva ha sido confirmada:\n\nServicio: ${serviceName}\nProveedor: ${partnerName}\nFecha: ${date}\nHora: ${time}\nMascota: ${petName}\n\nGracias por usar DogCatiFy.`;
    const html = EmailTemplates.bookingConfirmation(name, serviceName, partnerName, date, time, petName);

    await NotificationService.sendEmail(email, subject, text, html);
  },

  sendBookingCancellationEmail: async (
    email: string,
    name: string,
    serviceName: string,
    partnerName: string,
    date: string,
    time: string
  ): Promise<void> => {
    const subject = 'Reserva Cancelada - DogCatiFy';
    const text = `Hola ${name},\n\nTu reserva ha sido cancelada:\n\nServicio: ${serviceName}\nProveedor: ${partnerName}\nFecha: ${date}\nHora: ${time}\n\nGracias por usar DogCatiFy.`;
    const html = EmailTemplates.bookingCancellation(name, serviceName, partnerName, date, time);

    await NotificationService.sendEmail(email, subject, text, html);
  },

  sendBookingReminderEmail: async (
    email: string,
    name: string,
    serviceName: string,
    partnerName: string,
    date: string,
    time: string,
    petName: string
  ): Promise<void> => {
    const subject = 'Recordatorio de Cita - DogCatiFy';
    const text = `Hola ${name},\n\nTe recordamos que tienes una cita programada para mañana:\n\nServicio: ${serviceName}\nProveedor: ${partnerName}\nFecha: ${date}\nHora: ${time}\nMascota: ${petName}\n\nGracias por usar DogCatiFy.`;
    const html = EmailTemplates.bookingReminder(name, serviceName, partnerName, date, time, petName);

    await NotificationService.sendEmail(email, subject, text, html);
  },

  sendPartnerVerificationEmail: async (
    email: string,
    businessName: string
  ): Promise<void> => {
    const subject = 'Tu negocio ha sido verificado - DogCatiFy';
    const text = `Felicidades,\n\nTu negocio "${businessName}" ha sido verificado en DogCatiFy. Ahora puedes comenzar a ofrecer tus servicios a nuestra comunidad de amantes de mascotas.\n\nGracias por unirte a DogCatiFy.`;
    const html = EmailTemplates.partnerApproved(businessName, '');

    await NotificationService.sendEmail(email, subject, text, html);
  },

  sendPartnerRegistrationEmail: async (
    email: string,
    businessName: string,
    businessType: string
  ): Promise<void> => {
    const subject = 'Solicitud de Registro Recibida - DogCatiFy';
    const text = `Hola,\n\nHemos recibido tu solicitud para registrar "${businessName}" como ${businessType} en DogCatiFy. Nuestro equipo revisará tu solicitud y te notificaremos cuando sea aprobada.\n\nGracias por elegir DogCatiFy para hacer crecer tu negocio.`;
    const html = EmailTemplates.partnerRegistration(businessName, businessType);

    await NotificationService.sendEmail(email, subject, text, html);
  },

  sendPartnerRejectionEmail: async (
    email: string,
    businessName: string,
    reason: string
  ): Promise<void> => {
    const subject = 'Solicitud No Aprobada - DogCatiFy';
    const text = `Hola,\n\nLamentamos informarte que tu solicitud para registrar "${businessName}" en DogCatiFy no ha sido aprobada.\n\nMotivo: ${reason}\n\nGracias por tu interés en DogCatiFy.`;
    const html = EmailTemplates.partnerRejected(businessName, reason);

    await NotificationService.sendEmail(email, subject, text, html);
  },

  
  /**
   * Send a chat message notification
   * @param recipientEmail Recipient's email address
   * @param senderName Name of the message sender
   * @param petName Name of the pet being discussed
   * @param messagePreview Preview of the message content
   * @param conversationId ID of the conversation for deep linking
   */

  sendChatMessageNotification: async (
    recipientEmail: string,
    senderName: string,
    petName: string,
    messagePreview: string,
    conversationId: string
  ): Promise<void> => {
    const subject = `Nuevo mensaje sobre adopción de ${petName} - DogCatiFy`;
    const messageText = `${senderName} te ha enviado un mensaje sobre la adopción de ${petName}:\n\n"${messagePreview}"\n\nResponde desde la app DogCatiFy.`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #2D6A6F; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Nuevo mensaje sobre adopción</h1>
        </div>
        <div style="padding: 20px; background-color: #f9f9f9;">
          <p>Hola,</p>
          <p><strong>${senderName}</strong> te ha enviado un mensaje sobre la adopción de <strong>${petName}</strong>:</p>
          <div style="background-color: white; border-left: 4px solid #2D6A6F; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; font-style: italic;">"${messagePreview}"</p>
          </div>
          <p>Responde desde la app DogCatiFy para continuar la conversación sobre la adopción.</p>
        </div>
        <div style="background-color: #f0f0f0; padding: 10px; text-align: center; font-size: 12px; color: #666;">
          <p>© 2025 DogCatiFy. Todos los derechos reservados.</p>
        </div>
      </div>
    `;

    await NotificationService.sendEmail(recipientEmail, subject, messageText, html);
  }
};
