import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminMessaging } from "@/lib/firestoreAdmin";

interface NotificationPayload {
  type: "winner" | "sorteio" | "general";
  rifaId: string;
  rifaNome: string;
  userId?: string;
  email?: string;
  phone?: string;
  winningNumber?: number;
  tokens?: string[];
  allParticipantTokens?: string[];
}

export async function POST(req: NextRequest) {
  try {
    const payload: NotificationPayload = await req.json();
    const results: any = {
      fcm: { success: 0, failed: 0 },
      email: { success: 0, failed: 0 },
    };

    // 1. Enviar FCM Push Notification para o vencedor
    if (payload.type === "winner" && payload.tokens?.length) {
      try {
        const winnerMessage = {
          notification: {
            title: "🏆 PARABÉNS! Você ganhou!",
            body: `O número ${payload.winningNumber} foi sorteado na rifa "${payload.rifaNome}"! Você é o vencedor!`,
          },
          data: {
            type: "winner",
            rifaId: payload.rifaId,
            winningNumber: String(payload.winningNumber),
          },
          tokens: payload.tokens.slice(0, 500),
        };

        if (adminMessaging) {
          const response = await adminMessaging.sendEachForMulticast(winnerMessage);
          results.fcm.success += response.successCount;
          results.fcm.failed += response.failureCount;
        }
      } catch (e) {
        console.error("Erro ao enviar FCM para vencedor:", e);
      }
    }

    // 2. Enviar FCM para todos os participantes
    if (payload.allParticipantTokens?.length) {
      try {
        const allMessage = {
          notification: {
            title: "🎰 Sorteio Realizado!",
            body: payload.type === "winner" 
              ? `A rifa "${payload.rifaNome}" foi sorteada! Número vencedor: ${payload.winningNumber}`
              : `A rifa "${payload.rifaNome}" foi sorteada!`,
          },
          data: {
            type: "sorteio",
            rifaId: payload.rifaId,
            winningNumber: String(payload.winningNumber || ""),
          },
          tokens: payload.allParticipantTokens.slice(0, 500),
        };

        if (adminMessaging) {
          const response = await adminMessaging.sendEachForMulticast(allMessage);
          results.fcm.success += response.successCount;
          results.fcm.failed += response.failureCount;
        }
      } catch (e) {
        console.error("Erro ao enviar FCM para participantes:", e);
      }
    }

    // 3. Enviar email para o vencedor (via SendGrid se configurado)
    if (payload.type === "winner" && payload.email && process.env.SENDGRID_API_KEY) {
      try {
        // Usar require para evitar erro de TypeScript se SendGrid não estiver instalado
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const sgMail = require("@sendgrid/mail");
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);

        const msg = {
          to: payload.email,
          from: process.env.SENDGRID_FROM_EMAIL || "no-reply@rifafood.com",
          subject: `🏆 Parabéns! Você ganhou a rifa "${payload.rifaNome}"!`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 30px; border-radius: 10px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 28px;">🏆 VOCÊ GANHOU! 🏆</h1>
              </div>
              
              <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 10px 10px;">
                <h2 style="color: #1f2937;">Parabéns!</h2>
                
                <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                  O número <strong style="color: #10b981; font-size: 24px;">${payload.winningNumber}</strong> 
                  foi sorteado e você é o grande vencedor da rifa:
                </p>
                
                <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0;">
                  <h3 style="margin: 0 0 10px 0; color: #1f2937;">${payload.rifaNome}</h3>
                </div>
                
                <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                  Entre no app para ver como resgatar seu prêmio. Em breve entraremos em contato!
                </p>
                
                <div style="text-align: center; margin-top: 30px;">
                  <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://rifafood.com'}/sorteio?rifa=${payload.rifaId}" 
                     style="background: #10b981; color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                    Ver Detalhes do Sorteio
                  </a>
                </div>
              </div>
              
              <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
                RifaFood - Rifas de Comida Deliciosa 🍔
              </p>
            </div>
          `,
          text: `Parabéns! O número ${payload.winningNumber} foi sorteado e você é o vencedor da rifa "${payload.rifaNome}"! Entre no app para ver os detalhes.`,
        };

        await sgMail.send(msg);
        results.email.success++;
      } catch (e: any) {
        // Se módulo não está instalado, apenas ignorar
        if (e?.code === 'MODULE_NOT_FOUND') {
          console.warn("SendGrid não está instalado. Ignorando envio de email.");
        } else {
          console.error("Erro ao enviar email:", e);
          results.email.failed++;
        }
      }
    }

    // 4. Salvar log da notificação enviada
    try {
      await adminDb.collection("notification_logs").add({
        ...payload,
        results,
        sentAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn("Erro ao salvar log:", e);
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("[SendNotification] Erro:", error);
    return NextResponse.json(
      { success: false, error: "Falha ao enviar notificação" },
      { status: 500 }
    );
  }
}
