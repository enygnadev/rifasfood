import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firestoreAdmin";

/**
 * Webhook para validar PIX
 * Recebe: { purchaseId, pixPayerEmail, pixPayerName, transactionId, amount }
 * 
 * Valida:
 * 1. Se o email do PIX corresponde ao email do comprador
 * 2. Se o valor corresponde ao valor da compra
 * 3. Se o nome do pagador PIX corresponde ao registrado
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { purchaseId, pixPayerEmail, pixPayerName, amount } = body;

    if (!purchaseId) {
      return NextResponse.json({ error: "Missing purchaseId" }, { status: 400 });
    }

    // Buscar a compra
    const purchaseRef = adminDb.collection("compras").doc(purchaseId);
    const purchaseSnap = await purchaseRef.get();

    if (!purchaseSnap.exists) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    }

    const purchase = purchaseSnap.data();
    const validations = {
      emailValid: false,
      amountValid: false,
      payerNameValid: false,
      allValid: false,
    };

    // Validação 1: Email do PIX
    if (pixPayerEmail) {
      const buyerEmail = purchase.email.toLowerCase();
      const payerEmail = pixPayerEmail.toLowerCase();
      validations.emailValid = buyerEmail === payerEmail;
    }

    // Validação 2: Valor
    if (amount) {
      // Converter para centavos para comparação
      const expectedAmount = Math.round(purchase.valorPago * 100);
      const receivedAmount = Math.round(amount * 100);
      validations.amountValid = expectedAmount === receivedAmount;
    }

    // Validação 3: Nome do Pagador
    if (pixPayerName) {
      const buyerFirstName = (purchase.pixPayerName || "")
        .split(" ")[0]
        .toLowerCase()
        .trim();
      const payerFirstName = pixPayerName
        .split(" ")[0]
        .toLowerCase()
        .trim();

      // Comparar nomes
      validations.payerNameValid = buyerFirstName === payerFirstName;
    }

    // Todas as validações passaram?
    validations.allValid =
      validations.emailValid &&
      validations.amountValid &&
      validations.payerNameValid;

    if (validations.allValid) {
      // Atualizar status da compra
      await purchaseRef.update({
        pagamentoStatus: "confirmado",
        pixValidatedAt: new Date().toISOString(),
        pixValidationData: {
          payerEmail: pixPayerEmail,
          payerName: pixPayerName,
          amount,
        },
      });

      // Processar a compra (distribuir números)
      try {
        const { processPurchaseById } = await import("@/lib/webhookProcessor");
        await processPurchaseById(purchaseId);
      } catch (e) {
        console.error("Error processing purchase:", e);
      }

      return NextResponse.json({
        success: true,
        message: "PIX validado com sucesso!",
        validations,
      });
    } else {
      // Validação falhou
      await purchaseRef.update({
        pagamentoStatus: "validacao_falhou",
        pixValidationAttempt: new Date().toISOString(),
        pixValidationErrors: {
          emailValid: validations.emailValid,
          amountValid: validations.amountValid,
          payerNameValid: validations.payerNameValid,
          expectedEmail: purchase.email,
          receivedEmail: pixPayerEmail,
          expectedAmount: purchase.valorPago,
          receivedAmount: amount,
          expectedPayerName: purchase.pixPayerName,
          receivedPayerName: pixPayerName,
        },
      });

      return NextResponse.json(
        {
          success: false,
          message: "Validação do PIX falhou",
          validations,
          details: {
            expectedEmail: purchase.email,
            receivedEmail: pixPayerEmail,
            expectedAmount: purchase.valorPago,
            receivedAmount: amount,
            expectedPayerName: purchase.pixPayerName,
            receivedPayerName: pixPayerName,
          },
        },
        { status: 400 }
      );
    }
  } catch (err: any) {
    console.error("PIX validation error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * GET - Obter status de validação de uma compra
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const purchaseId = searchParams.get("purchaseId");

    if (!purchaseId) {
      return NextResponse.json({ error: "Missing purchaseId" }, { status: 400 });
    }

    const purchaseRef = adminDb.collection("compras").doc(purchaseId);
    const purchaseSnap = await purchaseRef.get();

    if (!purchaseSnap.exists) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    }

    const purchase = purchaseSnap.data();

    return NextResponse.json({
      purchaseId,
      status: purchase.pagamentoStatus,
      email: purchase.email,
      pixPayerName: purchase.pixPayerName,
      amount: purchase.valorPago,
      validatedAt: purchase.pixValidatedAt,
      validationErrors: purchase.pixValidationErrors,
    });
  } catch (err: any) {
    console.error("Error getting validation status:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
